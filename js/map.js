async function renderWorldMap(
  latestData,
  dashboardData,
  metric,
  mode,
  selectedCountry,
  onCountrySelect,
  mapExploreMode
) {
  const container = document.getElementById("mapChart");
  container.innerHTML = "";

  const width = container.clientWidth;
  const height = container.clientHeight;

  const config = getMapMetricConfig(metric, mode);
  const geo = await d3.json("data/world.geojson");

  const dataByCode = buildMapData(latestData, dashboardData, config);

  const values = Array.from(dataByCode.values())
    .map(function (d) { return d.value; })
    .filter(function (v) {
      return v !== null && Number.isFinite(v);
    });

  const maxValue = d3.quantile(values, 0.95) || d3.max(values) || 1;

  const color = d3.scaleSequential()
    .domain([0, maxValue])
    .interpolator(d3.interpolatePuBu);

  const projection = d3.geoNaturalEarth1()
    .fitSize([width, height - 42], geo);

  const path = d3.geoPath(projection);

  d3.selectAll(".map-tooltip").remove();

  const tooltip = d3.select("body")
    .append("div")
    .attr("class", "map-tooltip")
    .style("opacity", 0);

  const svg = d3.create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("class", "world-map")
    .on("dblclick", function () {
      if (onCountrySelect) {
        onCountrySelect(null);
      }
    });

  const mapGroup = svg.append("g");

  const zoom = d3
    .zoom()
    .scaleExtent([1, 8])
    .on("zoom", function (event) {
      mapGroup.attr("transform", event.transform);
    });

  if (mapExploreMode) {
  svg.call(zoom);
} else {
  svg.on("wheel.zoom", null);
  svg.on("mousedown.zoom", null);
  svg.on("dblclick.zoom", null);
  svg.on("touchstart.zoom", null);
  svg.on("touchmove.zoom", null);
}

  mapGroup
    .selectAll("path")
    .data(geo.features)
    .join("path")
    .attr("d", path)
    .attr("fill", function (feature) {
      const row = dataByCode.get(feature.id);
      return row && row.value ? color(row.value) : "var(--map-empty)";
    })
    .attr("stroke", function (feature) {
      const row = dataByCode.get(feature.id);
      return row && row.country === selectedCountry
        ? "var(--accent)"
        : "var(--panel)";
    })
    .attr("stroke-width", function (feature) {
      const row = dataByCode.get(feature.id);
      return row && row.country === selectedCountry ? 2 : 0.5;
    })
    .style("cursor", "pointer")
    .on("click", function (event, feature) {
      event.stopPropagation();

      const row = dataByCode.get(feature.id);
      if (row && onCountrySelect) {
        onCountrySelect(row.country);
      }
    })
    .on("mousemove", function (event, feature) {
      const row = dataByCode.get(feature.id);
      const name = row ? row.country : feature.properties.name;

      tooltip
        .style("opacity", 1)
        .html(
          `<strong>${name}</strong><br/>
           ${config.label}: ${formatMapValue(row ? row.value : null, metric, mode)}<br/>`,
        )
        .style("left", `${event.pageX + 14}px`)
        .style("top", `${event.pageY + 14}px`);
    })
    .on("mouseleave", function () {
      tooltip.style("opacity", 0);
    });

  renderMapLegend(svg, width, height, color, config, maxValue);

  container.appendChild(svg.node());
}

function renderMapLegend(svg, width, height, color, config, maxValue) {
  const legendWidth = Math.min(220, width * 0.55);
  const legendHeight = 8;
  const x = width - legendWidth - 16;
  const y = height - 28;

  const defs = svg.append("defs");

  const gradient = defs.append("linearGradient")
    .attr("id", "mapLegendGradient")
    .attr("x1", "0%")
    .attr("x2", "100%")
    .attr("y1", "0%")
    .attr("y2", "0%");

  d3.range(0, 1.01, 0.1).forEach(function (t) {
    gradient.append("stop")
      .attr("offset", `${t * 100}%`)
      .attr("stop-color", color(t * maxValue));
  });

  svg.append("text")
    .attr("x", x)
    .attr("y", y - 8)
    .attr("class", "map-legend-label")
    .text(config.label);

  svg.append("rect")
    .attr("x", x)
    .attr("y", y)
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("rx", 999)
    .attr("fill", "url(#mapLegendGradient)");

  svg.append("text")
    .attr("x", x)
    .attr("y", y + 24)
    .attr("class", "map-legend-tick")
    .text("0");

  svg.append("text")
    .attr("x", x + legendWidth)
    .attr("y", y + 24)
    .attr("text-anchor", "end")
    .attr("class", "map-legend-tick")
    .text(d3.format(".2s")(maxValue));
}

function buildMapData(latestData, dashboardData, config) {
  const map = new Map();

  if (config.source === "latest") {
    latestData.forEach(function (d) {
      if (d.code) {
        map.set(d.code, {
          country: d.country,
          value: d[config.field]
        });
      }
    });

    return map;
  }

  const rowsByCountry = d3.group(dashboardData, function (d) {
    return d.country;
  });

  rowsByCountry.forEach(function (rows) {
    const validRows = rows
      .filter(function (d) {
        return (
          d.code &&
          d.date &&
          d[config.field] !== null &&
          d[config.field] !== undefined &&
          Number.isFinite(d[config.field])
        );
      })
      .sort(function (a, b) {
        return d3.descending(a.date, b.date);
      });

    if (validRows.length > 0) {
      const latestValid = validRows[0];

      map.set(latestValid.code, {
        country: latestValid.country,
        value: latestValid[config.field]
      });
    }
  });

  return map;
}

function getMapMetricConfig(metric, mode) {
  const isNew = mode === "new";

  if (metric === "vaccinations") {
    return isNew
      ? { label: "New vaccinations", field: "new_vaccinations", source: "dashboard" }
      : { label: "Fully vaccinated", field: "people_fully_vaccinated_per_hundred", source: "latest" };
  }

  if (metric === "deaths") {
    return isNew
      ? { label: "New deaths", field: "new_deaths", source: "dashboard" }
      : { label: "Deaths per million", field: "total_deaths_per_million", source: "latest" };
  }

  return isNew
    ? { label: "New cases", field: "new_cases", source: "dashboard" }
    : { label: "Cases per million", field: "total_cases_per_million", source: "latest" };
}

function formatMapValue(value, metric, mode) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  if (metric === "vaccinations" && mode === "cumulative") {
    return `${value.toFixed(1)}%`;
  }

  return d3.format(",.0f")(value);
}