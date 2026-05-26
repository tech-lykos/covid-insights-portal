const STORAGE_KEY = "covid-dashboard-state";
let temporalGranularity = "month";
let selectedTemporalYear = null;
let selectedTemporalValue = null;
let selectedCountry = null;
let currentMode = "new";
let currentMetric = "cases";
let mapExploreMode = false;

let dashboardData = [];
let latestData = [];
let temporalTracksData = null;

document.addEventListener("DOMContentLoaded", init);

function saveDashboardState() {
  const state = {
    currentMode,
    currentMetric,
    selectedCountry,
    temporalGranularity,
    selectedTemporalYear,
    selectedTemporalValue,
    theme: document.documentElement.getAttribute("data-theme") || "light",
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function loadDashboardState() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) return;

  try {
    const state = JSON.parse(raw);

    currentMode = state.currentMode || "new";
    currentMetric = state.currentMetric || "cases";

    selectedCountry = state.selectedCountry || null;

    temporalGranularity = state.temporalGranularity || "month";

    selectedTemporalYear = state.selectedTemporalYear || null;

    selectedTemporalValue = state.selectedTemporalValue || null;

    if (state.theme) {
      document.documentElement.setAttribute("data-theme", state.theme);
    }
  } catch (error) {
    console.warn("Failed to restore dashboard state", error);
  }
}

async function init() {
  loadDashboardState();

  setupThemeToggle();
  setupMetricButtons();
  setupResizeHandler();
  setupTemporalControls();
  setupMapExploreToggle();
  setupClearCountryFilter();

  await loadData();

  updateSelectedCountryLabel();
  updateTemporalPeriodOptions();
  renderPlaceholders();
}

function setupResizeHandler() {
  let resizeTimer = null;

  window.addEventListener("resize", function () {
    clearTimeout(resizeTimer);

    resizeTimer = setTimeout(function () {
      renderPlaceholders();
    }, 250);
  });
}

function setupThemeToggle() {
  const button = document.getElementById("themeToggle");

  if (!button) return;

  function updateThemeIcon() {
    const currentTheme = document.documentElement.getAttribute("data-theme");

    button.textContent = currentTheme === "dark" ? "☀️" : "🌙";
    button.title =
      currentTheme === "dark" ? "Switch to light mode" : "Switch to dark mode";
  }

  updateThemeIcon();

  button.addEventListener("click", function () {
    const html = document.documentElement;
    const currentTheme = html.getAttribute("data-theme");
    const nextTheme = currentTheme === "dark" ? "light" : "dark";

    html.setAttribute("data-theme", nextTheme);
    updateThemeIcon();

    saveDashboardState();
  });
}

function setupMetricButtons() {
  const metricButtons = document.querySelectorAll(".metric-btn");
  const modeButtons = document.querySelectorAll(".mode-btn");

  metricButtons.forEach(function (button) {
    button.classList.toggle("active", button.dataset.metric === currentMetric);
  });

  metricButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      metricButtons.forEach(function (btn) {
        btn.classList.remove("active");
      });

      button.classList.add("active");
      currentMetric = button.dataset.metric;

      renderPlaceholders();
    });
  });

  modeButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      modeButtons.forEach(function (btn) {
        btn.classList.remove("active");
      });

      button.classList.add("active");
      currentMode = button.dataset.mode;

      renderPlaceholders();
    });
  });
}

function setupTemporalControls() {
  const granularityButtons = document.querySelectorAll(
    ".temporal-granularity-btn",
  );

  granularityButtons.forEach(function (button) {
    button.classList.toggle(
      "active",
      button.dataset.granularity === temporalGranularity,
    );
  });

  const clearButton = document.getElementById("clearTemporalFilters");

  granularityButtons.forEach(function (button) {
    button.addEventListener("click", function () {
      granularityButtons.forEach(function (btn) {
        btn.classList.remove("active");
      });

      button.classList.add("active");

      temporalGranularity = button.dataset.granularity;
      selectedTemporalValue = null;

      updateTemporalPeriodOptions();
      renderPlaceholders();
    });
  });

  if (clearButton) {
    clearButton.addEventListener("click", function () {
      temporalGranularity = "year";
      selectedTemporalYear = null;
      selectedTemporalValue = null;

      granularityButtons.forEach(function (btn) {
        btn.classList.remove("active");
      });

      const yearButton = document.querySelector('[data-granularity="year"]');
      if (yearButton) yearButton.classList.add("active");

      updateTemporalPeriodOptions();
      renderPlaceholders();
    });
  }
}

function updateTemporalPeriodOptions() {
  const container = document.getElementById("temporalPeriodOptions");
  const label = document.getElementById("temporalPeriodContext");

  if (!container) return;

  const options = getTemporalPeriodOptions();

  container.innerHTML = "";

  if (label) {
    label.textContent = selectedTemporalYear
      ? `Filtering within ${selectedTemporalYear}`
      : "";
    label.style.display = selectedTemporalYear ? "block" : "none";
  }

  options.forEach(function (option) {
    const button = document.createElement("button");

    button.className = "temporal-period-btn";
    button.dataset.value = option.value;
    button.textContent = option.label;

    if (selectedTemporalValue === option.value) {
      button.classList.add("active");
    }

    button.addEventListener("click", function () {
      if (temporalGranularity === "year") {
        selectedTemporalYear =
          selectedTemporalYear === option.value ? null : option.value;

        selectedTemporalValue = selectedTemporalYear;
      } else {
        selectedTemporalValue =
          selectedTemporalValue === option.value ? null : option.value;
      }

      updateTemporalPeriodOptions();
      renderPlaceholders();
    });

    container.appendChild(button);
  });
}

function getTemporalPeriodOptions() {
  if (temporalGranularity === "semester") {
    return [
      { label: "S1", value: "S1" },
      { label: "S2", value: "S2" },
    ];
  }

  if (temporalGranularity === "quarter") {
    return [
      { label: "Q1", value: "Q1" },
      { label: "Q2", value: "Q2" },
      { label: "Q3", value: "Q3" },
      { label: "Q4", value: "Q4" },
    ];
  }

  if (temporalGranularity === "month") {
    return [
      { label: "Jan", value: "0" },
      { label: "Feb", value: "1" },
      { label: "Mar", value: "2" },
      { label: "Apr", value: "3" },
      { label: "May", value: "4" },
      { label: "Jun", value: "5" },
      { label: "Jul", value: "6" },
      { label: "Aug", value: "7" },
      { label: "Sep", value: "8" },
      { label: "Oct", value: "9" },
      { label: "Nov", value: "10" },
      { label: "Dec", value: "11" },
    ];
  }

  const years = Array.from(
    new Set(
      dashboardData
        .filter(function (d) {
          return d.date;
        })
        .map(function (d) {
          return String(d.date.getFullYear());
        }),
    ),
  ).sort();

  return years.map(function (year) {
    return {
      label: year,
      value: year,
    };
  });
}

function matchesTemporalFilter(date) {
  if (!date) return false;

  const year = String(date.getFullYear());
  const month = date.getMonth();

  if (selectedTemporalYear && year !== selectedTemporalYear) {
    return false;
  }

  if (!selectedTemporalValue) {
    return true;
  }

  if (temporalGranularity === "year") {
    return year === selectedTemporalValue;
  }

  if (temporalGranularity === "semester") {
    const semester = month < 6 ? "S1" : "S2";
    return semester === selectedTemporalValue;
  }

  if (temporalGranularity === "quarter") {
    const quarter = `Q${Math.floor(month / 3) + 1}`;
    return quarter === selectedTemporalValue;
  }

  if (temporalGranularity === "month") {
    return String(month) === selectedTemporalValue;
  }

  return true;
}

function getFilteredLatestData(sourceData) {
  const rowsByCountry = d3.rollups(
    sourceData,
    function (rows) {
      return rows
        .filter(function (d) {
          return d.date;
        })
        .sort(function (a, b) {
          return d3.descending(a.date, b.date);
        })[0];
    },
    function (d) {
      return d.country;
    },
  );

  return rowsByCountry
    .map(function (d) {
      return d[1];
    })
    .filter(Boolean);
}

function setupMapExploreToggle() {
  const button = document.getElementById("mapExploreToggle");

  if (!button) return;

  button.addEventListener("click", function () {
    mapExploreMode = !mapExploreMode;

    button.classList.toggle("active", mapExploreMode);
    button.title = mapExploreMode
      ? "Disable map explore mode"
      : "Enable map explore mode";

    renderPlaceholders();
  });
}

function setupClearCountryFilter() {
  const button = document.getElementById("clearCountryFilter");

  if (!button) return;

  button.addEventListener("click", function () {
    selectedCountry = null;
    updateSelectedCountryLabel();
    renderPlaceholders();
  });
}

async function loadData() {
  dashboardData = await d3.csv("data/covid_dashboard.csv", parseRow);
  latestData = await d3.csv("data/covid_latest.csv", parseRow);

  const response = await fetch("data/covid_temporal_tracks.json");
  temporalTracksData = await response.json();

  console.log("dashboardData", dashboardData.length);
  console.log("latestData", latestData.length);
  console.log("temporalTracksData", temporalTracksData.countries.length);
}

function parseRow(row) {
  return {
    ...row,
    date: row.date ? new Date(row.date) : null,
    last_update: row.last_update || null,

    total_cases: toNumber(row.total_cases),
    new_cases: toNumber(row.new_cases),
    total_cases_per_million: toNumber(row.total_cases_per_million),

    total_deaths: toNumber(row.total_deaths),
    new_deaths: toNumber(row.new_deaths),
    total_deaths_per_million: toNumber(row.total_deaths_per_million),

    total_vaccinations: toNumber(row.total_vaccinations),
    new_vaccinations: toNumber(row.new_vaccinations),
    people_vaccinated: toNumber(row.people_vaccinated),
    people_fully_vaccinated: toNumber(row.people_fully_vaccinated),
    people_fully_vaccinated_per_hundred: toNumber(
      row.people_fully_vaccinated_per_hundred,
    ),

    population: toNumber(row.population),
    median_age: toNumber(row.median_age),
    code: row.code || null,
  };
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function formatCompact(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";

  return Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
}

function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(value)) return "--";

  return `${value.toFixed(1)}%`;
}

function updateKpis(filteredDashboardData, filteredLatestData) {
  const kpiDashboardData = filteredDashboardData || dashboardData;

  const kpiLatestData = filteredLatestData || latestData;

  const isNew = currentMode === "new";

  const latestDate = d3.max(kpiDashboardData, function (d) {
    return d.date;
  });

  const latestMonthRows = kpiDashboardData.filter(function (d) {
    return d.date && latestDate && d.date.getTime() === latestDate.getTime();
  });

  const latestMonthlyCases = d3.sum(latestMonthRows, function (d) {
    return d.new_cases || 0;
  });

  const latestMonthlyVaccinations = d3.sum(latestMonthRows, function (d) {
    return d.new_vaccinations || 0;
  });

  const totalCases = d3.sum(kpiLatestData, function (d) {
    return d.total_cases || 0;
  });

  const vaccinatedRows = kpiLatestData.filter(function (d) {
    return d.people_fully_vaccinated !== null && d.population !== null;
  });

  const fullyVaccinated = d3.sum(vaccinatedRows, function (d) {
    return d.people_fully_vaccinated || 0;
  });

  const totalPopulation = d3.sum(vaccinatedRows, function (d) {
    return d.population || 0;
  });

  const vaccinatedPct =
    totalPopulation > 0 ? (fullyVaccinated / totalPopulation) * 100 : null;

  const countriesTracked = kpiLatestData.length;
  const peakWave = calculatePeakWave(getPeakWaveSourceData());

  document.getElementById("kpiCases").textContent = isNew
    ? formatCompact(latestMonthlyCases)
    : formatCompact(totalCases);

  document.getElementById("kpiVaccinated").textContent = isNew
    ? formatCompact(latestMonthlyVaccinations)
    : formatPercent(vaccinatedPct);

  document.getElementById("kpiCountries").textContent = countriesTracked;
  document.getElementById("kpiPeak").textContent = peakWave.label;

  updateKpiTitles(isNew);
}

function updateKpiTitles(isNew) {
  setKpiTitle(
    "kpiCasesTitle",
    isNew ? "Latest Monthly Cases" : "Total Cases",
    isNew
      ? "New reported cases in the latest available month."
      : "Total confirmed pandemic cases.",
  );

  setKpiTitle(
    "kpiVaccinatedTitle",
    isNew ? "Latest Monthly Vaccinations" : "Fully Vaccinated",
    isNew
      ? "New vaccinations reported in the latest available month."
      : "Share of population fully vaccinated.",
  );

  setKpiTitle(
    "kpiCountriesTitle",
    "Countries Tracked",
    "Countries currently included after active filters.",
  );

  setKpiTitle(
    "kpiPeakTitle",
    isNew ? "Peak Monthly Wave" : "Peak Pandemic Wave",
    "Month with the highest reported case activity.",
  );
}

function setKpiTitle(id, label, tooltip) {
  const element = document.getElementById(id);

  if (!element) return;

  element.textContent = label;

  const card = element.closest(".kpi-card");

  if (!card) return;

  const oldTooltip = card.querySelector(".info-tooltip");
  if (oldTooltip) oldTooltip.remove();

  const info = document.createElement("span");
  info.className = "info-tooltip";
  info.dataset.tooltip = tooltip;
  info.textContent = "?";

  card.appendChild(info);
}

function calculatePeakWave(sourceData) {
  const data = sourceData || dashboardData;

  const monthlyCases = d3
    .rollups(
      data,
      function (rows) {
        return d3.sum(rows, function (d) {
          return d.new_cases || 0;
        });
      },
      function (d) {
        if (!d.date) return "";
        return `${d.date.getFullYear()}-${String(d.date.getMonth() + 1).padStart(2, "0")}`;
      },
    )
    .filter(function (d) {
      return d[0] !== "";
    })
    .map(function (d) {
      return {
        month: d[0],
        cases: d[1],
      };
    })
    .sort(function (a, b) {
      return d3.descending(a.cases, b.cases);
    });

  if (monthlyCases.length === 0) {
    return { label: "--", cases: null };
  }

  const peak = monthlyCases[0];
  const date = new Date(`${peak.month}-01T00:00:00`);

  return {
    label: date.toLocaleDateString("en", {
      month: "short",
      year: "numeric",
    }),
    cases: peak.cases,
  };
}

function setSelectedCountry(country) {
  selectedCountry = selectedCountry === country ? null : country;
  updateSelectedCountryLabel();
  renderPlaceholders();
}

function getFilteredDashboardData() {
  return dashboardData.filter(function (d) {
    const matchesCountry = !selectedCountry || d.country === selectedCountry;

    const matchesTime = matchesTemporalFilter(d.date);

    return matchesCountry && matchesTime;
  });
}

function updateSelectedCountryLabel() {
  const label = document.getElementById("selectedCountryLabel");
  const clearButton = document.getElementById("clearCountryFilter");

  if (!label) return;

  label.innerHTML = selectedCountry
    ? `<span class="status-dot"></span> ${selectedCountry}`
    : `<span class="status-dot"></span> Global view`;

  if (clearButton) {
    clearButton.classList.toggle("visible", Boolean(selectedCountry));
  }
}

function getActiveTemporalYear() {
  if (selectedTemporalYear) {
    return selectedTemporalYear;
  }

  if (temporalGranularity === "year" && selectedTemporalValue) {
    return selectedTemporalValue;
  }

  return null;
}

function getPeakWaveSourceData() {
  const activeYear = getActiveTemporalYear();

  return dashboardData.filter(function (d) {
    const matchesCountry = !selectedCountry || d.country === selectedCountry;

    const matchesYear =
      !activeYear || (d.date && String(d.date.getFullYear()) === activeYear);

    return matchesCountry && matchesYear;
  });
}

function renderPlaceholders() {
  const filteredDashboardData = getFilteredDashboardData();
  const filteredLatestData = getFilteredLatestData(filteredDashboardData);

  updateKpis(filteredDashboardData, filteredLatestData);

  renderEvolutionChart(filteredDashboardData, currentMetric, currentMode);

  renderWorldMap(
    filteredLatestData,
    filteredDashboardData,
    currentMetric,
    currentMode,
    selectedCountry,
    setSelectedCountry,
    mapExploreMode,
  );

  renderComparisonChart(
    filteredLatestData,
    filteredDashboardData,
    currentMode,
    selectedCountry,
  );

  renderTemporalTracks(
    temporalTracksData,
    currentMode,
    selectedCountry,
    temporalGranularity,
    selectedTemporalValue,
    selectedTemporalYear,
  );

  saveDashboardState();
}
