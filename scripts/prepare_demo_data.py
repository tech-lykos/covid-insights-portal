from pathlib import Path
import json
import pandas as pd

RAW_FILE = Path("raw/owid-covid-data.csv")
DATA_DIR = Path("data")
DATA_DIR.mkdir(exist_ok=True)

START_DATE = "2020-01-01"

COLUMNS = [
    "country",
    "date",
    "continent",
    "total_cases",
    "new_cases",
    "total_cases_per_million",
    "total_deaths",
    "new_deaths",
    "total_deaths_per_million",
    "total_vaccinations",
    "people_vaccinated",
    "people_fully_vaccinated",
    "people_fully_vaccinated_per_hundred",
    "new_vaccinations",
    "code",
    "population",
    "median_age",
]


def safe_float(value):
    if pd.isna(value):
        return None
    return float(value)


def calculate_trend_status(group):
    group = group.sort_values("date").copy()

    recent = group.tail(14)["new_cases"].mean()
    previous = group.tail(28).head(14)["new_cases"].mean()

    if pd.isna(recent) or pd.isna(previous) or previous <= 0:
        return "Insufficient data"

    change = (recent - previous) / previous

    if change > 0.25:
        return "Increasing"
    if change < -0.25:
        return "Improving"
    return "Stable"


if not RAW_FILE.exists():
    raise FileNotFoundError(
        f"Raw file not found: {RAW_FILE}. "
        "Place the downloaded compact.csv file there and rename it to owid-covid-data.csv."
    )

print("Reading raw dataset...")
df = pd.read_csv(RAW_FILE, usecols=lambda c: c in COLUMNS)

df["date"] = pd.to_datetime(df["date"], errors="coerce")

df = df[
    (df["date"] >= START_DATE) &
    (df["continent"].notna()) &
    (df["country"].notna())
].copy()

df = df.sort_values(["country", "date"])

numeric_cols = [
    "total_cases",
    "new_cases",
    "total_cases_per_million",
    "total_deaths",
    "new_deaths",
    "total_deaths_per_million",
    "total_vaccinations",
    "people_vaccinated",
    "people_fully_vaccinated",
    "people_fully_vaccinated_per_hundred",
    "new_vaccinations",
    "population",
    "median_age",
]

for col in numeric_cols:
    df[col] = pd.to_numeric(df[col], errors="coerce")

cumulative_cols = [
    "total_cases",
    "total_cases_per_million",
    "total_deaths",
    "total_deaths_per_million",
    "total_vaccinations",
    "people_vaccinated",
    "people_fully_vaccinated",
    "people_fully_vaccinated_per_hundred",
    "population",
    "median_age",
]

df[cumulative_cols] = df.groupby("country")[cumulative_cols].ffill()

trend_map = (
    df.groupby("country", group_keys=False)
      .apply(calculate_trend_status)
      .to_dict()
)

df["month"] = df["date"].dt.to_period("M")

monthly_last = (
    df.sort_values("date")
      .groupby(["country", "continent", "month"], as_index=False)
      .tail(1)
      .copy()
)

monthly_sums = (
    df.groupby(["country", "continent", "month"], as_index=False)
      .agg({
          "new_cases": "sum",
          "new_deaths": "sum",
          "new_vaccinations": "sum",
      })
)

monthly = monthly_last.drop(
    columns=["new_cases", "new_deaths", "new_vaccinations"]
).merge(
    monthly_sums,
    on=["country", "continent", "month"],
    how="left"
)

monthly["trend_status"] = monthly["country"].map(trend_map)
monthly["date"] = monthly["date"].dt.strftime("%Y-%m-%d")
monthly = monthly.drop(columns=["month"])

monthly.to_csv(DATA_DIR / "covid_dashboard.csv", index=False)

latest = (
    df.sort_values("date")
      .groupby(["country", "continent"], as_index=False)
      .tail(1)
      .copy()
)

latest["trend_status"] = latest["country"].map(trend_map)
latest["last_update"] = latest["date"].dt.strftime("%Y-%m-%d")
latest = latest.drop(columns=["date", "month"], errors="ignore")

latest.to_csv(DATA_DIR / "covid_latest.csv", index=False)

tracks_payload = {
    "source": "Our World in Data COVID public dataset - compact CSV processed sample",
    "module": "temporal-tracks",
    "description": "Local JSON file used to simulate an API endpoint for a JSViz/Text Area custom visual.",
    "countries": []
}

for country, group in monthly.groupby("country"):
    group = group.sort_values("date")

    tracks_payload["countries"].append({
        "country": country,
        "code": group["code"].dropna().iloc[-1] if not group["code"].dropna().empty else None,
        "continent": group["continent"].iloc[-1],
        "trend_status": group["trend_status"].iloc[-1],
        "timeline": [
            {
                "date": row["date"],

                "new_cases": safe_float(row["new_cases"]),
                "new_deaths": safe_float(row["new_deaths"]),
                "new_vaccinations": safe_float(row["new_vaccinations"]),

                "total_cases": safe_float(row["total_cases"]),
                "total_deaths": safe_float(row["total_deaths"]),
                "total_vaccinations": safe_float(row["total_vaccinations"]),

                "cases_per_million": safe_float(row["total_cases_per_million"]),
                "deaths_per_million": safe_float(row["total_deaths_per_million"]),
                "vaccination_pct": safe_float(row["people_fully_vaccinated_per_hundred"]),
            }
            for _, row in group.iterrows()
        ]
    })

with open(DATA_DIR / "covid_temporal_tracks.json", "w", encoding="utf-8") as f:
    json.dump(tracks_payload, f, ensure_ascii=False, indent=2)

metadata = {
    "source": "Our World in Data COVID Dataset - compact CSV",
    "start_date": START_DATE,
    "generated_files": [
        "covid_dashboard.csv",
        "covid_latest.csv",
        "covid_temporal_tracks.json"
    ],
    "notes": [
        "Global country coverage was preserved.",
        "Monthly snapshots were generated for front-end performance.",
        "Monthly new cases, deaths, and vaccinations were aggregated as monthly sums.",
        "Cumulative metrics use the latest available value within each month.",
        "Trend status is a derived visual indicator based on recent case evolution, not a clinical risk model.",
        "CSV files simulate Spotfire analytical tables.",
        "JSON file simulates an endpoint consumed by a custom JSViz/Text Area component."
    ]
}

with open(DATA_DIR / "metadata.json", "w", encoding="utf-8") as f:
    json.dump(metadata, f, ensure_ascii=False, indent=2)

print("Done.")
print(f"Dashboard rows: {len(monthly)}")
print(f"Latest rows: {len(latest)}")
print("Created:")
print("- data/covid_dashboard.csv")
print("- data/covid_latest.csv")
print("- data/covid_temporal_tracks.json")
print("- data/metadata.json")