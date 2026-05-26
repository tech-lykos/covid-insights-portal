function getMetricConfig(metric, mode) {
  const isNew = mode === "new";

  if (metric === "vaccinations") {
    return {
      label: isNew ? "New Vaccinations" : "Total Vaccinations",
      field: isNew ? "new_vaccinations" : "total_vaccinations",
      color: "var(--success)",
    };
  }

  if (metric === "deaths") {
    return {
      label: isNew ? "New Deaths" : "Total Deaths",
      field: isNew ? "new_deaths" : "total_deaths",
      color: "var(--danger)",
    };
  }

  return {
    label: isNew ? "New Cases" : "Total Cases",
    field: isNew ? "new_cases" : "total_cases",
    color: "var(--accent)",
  };
}

function renderEvolutionChart(data, metric, mode) {
  const container = document.getElementById("evolutionChart");
  container.innerHTML = "";

  const config = getMetricConfig(metric, mode);

  const globalSeries = d3
    .rollups(
      data,
      function (rows) {
        return d3.sum(rows, function (d) {
          return d[config.field] || 0;
        });
      },
      function (d) {
        return d.date;
      },
    )
    .map(function (d) {
      return {
        date: d[0],
        value: d[1],
      };
    })
    .filter(function (d) {
      return d.date && d.value !== null;
    })
    .sort(function (a, b) {
      return d3.ascending(a.date, b.date);
    });

  const width = container.clientWidth;
  const height = container.clientHeight;

  const margin = {
    left: 64,
    right: 24,
    top: 24,
    bottom: 78,
  };

  const chart = Plot.plot({
    width: width,
    height: height,

    marginLeft: margin.left,
    marginRight: margin.right,
    marginTop: margin.top,
    marginBottom: margin.bottom,

    grid: true,

    x: {
      type: "time",
      label: null,
      axis: null,
    },

    y: {
      label: config.label,
      tickFormat: function (d) {
        return d3.format(".2s")(d);
      },
    },

    marks: [
      Plot.areaY(globalSeries, {
        x: "date",
        y: "value",
        fill: config.color,
        fillOpacity: 0.12,
      }),

      Plot.lineY(globalSeries, {
        x: "date",
        y: "value",
        stroke: config.color,
        strokeWidth: 2.5,
      }),

      Plot.dot(globalSeries, {
        x: "date",
        y: "value",
        r: 1.8,
        fill: config.color,
        fillOpacity: 0.45,
        title: function (d) {
          return `${d3.timeFormat("%b %Y")(d.date)}
${config.label}: ${d3.format(",.0f")(d.value)}`;
        },
      }),

      Plot.ruleY([0]),
    ],

    style: {
      background: "transparent",
      color: "var(--text)",
    },
  });

  container.appendChild(chart);

  renderEvolutionTimeAxis(chart, globalSeries, width, height, margin);
  renderEvolutionTooltip(
    container,
    chart,
    globalSeries,
    config,
    width,
    height,
    margin,
  );
}

function renderEvolutionTimeAxis(svgNode, data, width, height, margin) {
  if (!data || data.length === 0) return;

  const domain = d3.extent(data, function (d) {
    return d.date;
  });

  if (!domain[0] || !domain[1]) return;

  const x = d3
    .scaleTime()
    .domain(domain)
    .range([margin.left, width - margin.right]);

  const svg = d3.select(svgNode);

  svg
    .append("rect")
    .attr("x", margin.left)
    .attr("y", height - margin.bottom + 8)
    .attr("width", width - margin.left - margin.right)
    .attr("height", margin.bottom - 14)
    .attr("rx", 8)
    .attr("class", "evolution-time-axis-background");

  const monthTicks = getEvolutionMonthTicks(domain, width);

  const monthGroup = svg
    .append("g")
    .attr("class", "evolution-time-axis-months");

  monthTicks.forEach(function (date) {
    const xPos = x(date);

    monthGroup
      .append("line")
      .attr("x1", xPos)
      .attr("x2", xPos)
      .attr("y1", margin.top)
      .attr("y2", height - margin.bottom + 4)
      .attr("class", "evolution-month-tick");

    monthGroup
      .append("line")
      .attr("x1", xPos)
      .attr("x2", xPos)
      .attr("y1", height - 44)
      .attr("y2", height - 34)
      .attr("class", "evolution-month-axis-tick");

    monthGroup
      .append("text")
      .attr("x", xPos)
      .attr("y", height - 48)
      .attr("text-anchor", "middle")
      .attr("class", "evolution-month-label")
      .text(d3.timeFormat("%b")(date));
  });

  const years = getEvolutionYearRanges(domain);

  const yearGroup = svg.append("g").attr("class", "evolution-time-axis-years");

  years.forEach(function (yearRange) {
    const xStart = x(yearRange.start);
    const xEnd = x(yearRange.end);
    const xMiddle = (xStart + xEnd) / 2;

    if (xEnd - xStart < 38) return;

    yearGroup
      .append("line")
      .attr("x1", xStart)
      .attr("x2", xEnd)
      .attr("y1", height - 30)
      .attr("y2", height - 30)
      .attr("class", "evolution-year-bracket");

    yearGroup
      .append("line")
      .attr("x1", xStart)
      .attr("x2", xStart)
      .attr("y1", height - 34)
      .attr("y2", height - 26)
      .attr("class", "evolution-year-bracket");

    yearGroup
      .append("line")
      .attr("x1", xEnd)
      .attr("x2", xEnd)
      .attr("y1", height - 34)
      .attr("y2", height - 26)
      .attr("class", "evolution-year-bracket");

    yearGroup
      .append("text")
      .attr("x", xMiddle)
      .attr("y", height - 12)
      .attr("text-anchor", "middle")
      .attr("class", "evolution-year-label")
      .text(yearRange.year);
  });
}

function getEvolutionMonthTicks(domain, width) {
  const start = d3.timeMonth.floor(domain[0]);
  const end = d3.timeMonth.ceil(domain[1]);

  if (width < 520) {
    return d3.timeMonth.every(6).range(start, end);
  }

  if (width < 850) {
    return d3.timeMonth.every(3).range(start, end);
  }

  return d3.timeMonth.every(2).range(start, end);
}

function getEvolutionYearRanges(domain) {
  const startYear = domain[0].getFullYear();
  const endYear = domain[1].getFullYear();

  const ranges = [];

  for (let year = startYear; year <= endYear; year++) {
    const yearStart = new Date(year, 0, 1);
    const yearEnd = new Date(year + 1, 0, 1);

    ranges.push({
      year: year,
      start: yearStart < domain[0] ? domain[0] : yearStart,
      end: yearEnd > domain[1] ? domain[1] : yearEnd,
    });
  }

  return ranges;
}

function renderComparisonChart(
  latestData,
  dashboardData,
  mode,
  selectedCountry,
) {
  const container = document.getElementById("comparisonChart");
  container.innerHTML = "";

  if (selectedCountry) {
    renderCountryProfile(
      container,
      latestData,
      dashboardData,
      selectedCountry,
      mode,
    );
    return;
  }

  renderGlobalContextScatter(container, latestData, dashboardData, mode);
}

function renderGlobalContextScatter(
  container,
  latestData,
  dashboardData,
  mode,
) {
  const isNew = mode === "new";

  const latestDate = d3.max(dashboardData, function (d) {
    return d.date;
  });

  const latestMonthRows = dashboardData.filter(function (d) {
    return d.date && latestDate && d.date.getTime() === latestDate.getTime();
  });

  const latestMonthByCountry = new Map();

  latestMonthRows.forEach(function (d) {
    latestMonthByCountry.set(d.country, d);
  });

  const data = latestData
    .map(function (base) {
      return Object.assign({}, base, {
        context_value: base.total_deaths_per_million,
        context_label: "Deaths per Million",
      });
    })
    .filter(function (d) {
      return (
        d.median_age !== null &&
        d.context_value !== null &&
        d.population !== null
      );
    });

  const continents = Array.from(
    new Set(
      data.map(function (d) {
        return d.continent;
      }),
    ),
  ).sort();

  const color = d3.scaleOrdinal().domain(continents).range(d3.schemeTableau10);

  const legend = document.createElement("div");
  legend.className = "country-profile-legend epidemiological-legend";

  continents.forEach(function (continent) {
    const item = document.createElement("div");
    item.className = "legend-item";

    item.innerHTML = `
      <span class="legend-dot" style="background:${color(continent)}"></span>
      ${continent}
    `;

    legend.appendChild(item);
  });

  container.appendChild(legend);

  const chart = Plot.plot({
    width: container.clientWidth,
    height: Math.max(260, container.clientHeight - legend.offsetHeight - 12),

    marginLeft: 64,
    marginRight: 24,
    marginTop: 18,
    marginBottom: 56,

    grid: true,

    style: {
      background: "transparent",
      color: "var(--text)",
    },

    x: {
      label: "Median Age (Years)",
      tickFormat: function (d) {
        return d.toFixed(0);
      },
    },

    y: {
      label: "Deaths per Million Inhabitants",
      tickFormat: function (d) {
        return d3.format(".2s")(d);
      },
    },

    marks: [
      Plot.dot(data, {
        x: "median_age",
        y: "context_value",
        r: function (d) {
          return d.population
            ? Math.max(3, Math.min(18, Math.sqrt(d.population) / 900))
            : 3;
        },
        fill: function (d) {
          return color(d.continent);
        },
        fillOpacity: 0.72,
        stroke: "var(--panel)",
        title: function (d) {
          const deathBurdenPct =
            d.population && d.total_deaths
              ? (d.total_deaths / d.population) * 100
              : null;

          return `${d.country}
Continent: ${d.continent}
Median Age: ${d.median_age.toFixed(1)}
Deaths per Million: ${d3.format(",.0f")(d.context_value)}
Population: ${d3.format(",")(d.population)}
Fatality Burden: ${deathBurdenPct !== null ? deathBurdenPct.toFixed(3) + "% of population" : "--"}`;
        },
      }),
    ],
  });

  container.appendChild(chart);
}

function renderCountryProfile(
  container,
  latestData,
  dashboardData,
  selectedCountry,
  mode,
) {
  const latest = latestData.find(function (d) {
    return d.country === selectedCountry;
  });

  const series = dashboardData
    .filter(function (d) {
      return d.country === selectedCountry;
    })
    .sort(function (a, b) {
      return d3.ascending(a.date, b.date);
    });

  if (!latest || series.length === 0) {
    container.innerHTML = `<div class="placeholder">No country profile available</div>`;
    return;
  }

  const caseFatalityRatio = calculateCaseFatalityRatio(latest);
  const peakSeverity = calculatePeakSeverity(series);

  const wrapper = document.createElement("div");
  wrapper.className = "country-profile";

  wrapper.innerHTML = `
    <div class="country-profile-header">
      <div>
        <h3>${selectedCountry}</h3>
        <p>${latest.continent} · Country-level epidemiological profile</p>
      </div>

      <span class="profile-pill">
        ${mode === "new" ? "Recent activity" : "Historical profile"}
      </span>
    </div>

    <div class="profile-metrics">
      <div class="profile-metric">
        <span>Peak Severity</span>
        <strong>${peakSeverity}</strong>
        <span
          class="info-tooltip"
          data-tooltip="Highest monthly transmission peak recorded for the country."
        >
          ?
        </span>
      </div>

      <div class="profile-metric">
        <span>Median Age</span>
        <strong>${latest.median_age ? latest.median_age.toFixed(1) : "--"}</strong>
        <span
          class="info-tooltip"
          data-tooltip="Median population age of the country."
        >
          ?
        </span>
      </div>

      <div class="profile-metric">
        <span>Deaths / Million</span>
        <strong>${latest.total_deaths_per_million ? d3.format(",.0f")(latest.total_deaths_per_million) : "--"}</strong>
        <span
          class="info-tooltip"
          data-tooltip="Total reported pandemic deaths per one million inhabitants."
        >
          ?
        </span>
      </div>

      <div class="profile-metric">
       <span>Case Fatality Ratio</span>
       <strong>${caseFatalityRatio}</strong>       
       <span 
          class="info-tooltip"
          data-tooltip="Estimated percentage of confirmed cases resulting in death."
        >
          ?
        </span>
      </div>
    </div>

    <div class="country-profile-legend">
      <div class="legend-item">
        <span class="legend-dot legend-cases"></span>
        Cases
      </div>

      <div class="legend-item">
        <span class="legend-dot legend-deaths"></span>
        Deaths
      </div>

      <div class="legend-item">
        <span class="legend-dot legend-vaccinations"></span>
        Vaccinations
      </div>
    </div>

    <div id="countryProfileChart" class="country-profile-chart"></div>
  `;

  container.appendChild(wrapper);

  renderCountryProfileChart(series, mode);
}

function calculateCountryPeak(series) {
  const monthly = series
    .map(function (d) {
      return {
        date: d.date,
        cases: d.new_cases || 0,
      };
    })
    .filter(function (d) {
      return d.date && d.cases > 0;
    })
    .sort(function (a, b) {
      return d3.descending(a.cases, b.cases);
    });

  if (monthly.length === 0) {
    return { label: "--", cases: null };
  }

  const peak = monthly[0];

  return {
    label: peak.date.toLocaleDateString("en", {
      month: "short",
      year: "numeric",
    }),
    cases: peak.cases,
  };
}

function renderCountryProfileChart(series, mode) {
  const container = document.getElementById("countryProfileChart");
  container.innerHTML = "";

  const isNew = mode === "new";

  const data = series.map(function (d) {
    return {
      date: d.date,
      cases: isNew ? d.new_cases : d.total_cases,
      deaths: isNew ? d.new_deaths : d.total_deaths,
      vaccinations: isNew ? d.new_vaccinations : d.total_vaccinations,
    };
  });

  const chart = Plot.plot({
    width: container.clientWidth,
    height: container.clientHeight,

    marginLeft: 52,
    marginRight: 16,
    marginTop: 16,
    marginBottom: 36,

    grid: true,

    style: {
      background: "transparent",
      color: "var(--text)",
    },

    x: {
      type: "time",
      label: null,
    },

    y: {
      label: mode === "new" ? "Monthly values" : "Cumulative values",
      tickFormat: function (d) {
        return d3.format(".2s")(d);
      },
    },

    marks: [
      Plot.lineY(data, {
        x: "date",
        y: "cases",
        stroke: "var(--accent)",
        strokeWidth: 2,
      }),

      Plot.lineY(data, {
        x: "date",
        y: "deaths",
        stroke: "var(--danger)",
        strokeWidth: 2,
      }),

      Plot.lineY(data, {
        x: "date",
        y: "vaccinations",
        stroke: "var(--success)",
        strokeWidth: 2,
      }),

      Plot.ruleY([0]),
    ],
  });

  container.appendChild(chart);
}

function renderEvolutionTooltip(
  container,
  svgNode,
  data,
  config,
  width,
  height,
  margin,
) {
  if (!data || data.length === 0) return;

  d3.selectAll(".evolution-tooltip").remove();

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "evolution-tooltip")
    .style("opacity", 0);

  const domain = d3.extent(data, function (d) {
    return d.date;
  });

  const x = d3
    .scaleTime()
    .domain(domain)
    .range([margin.left, width - margin.right]);

  const y = d3
    .scaleLinear()
    .domain([
      0,
      d3.max(data, function (d) {
        return d.value;
      }) || 1,
    ])
    .nice()
    .range([height - margin.bottom, margin.top]);

  const svg = d3.select(svgNode);

  const hoverLine = svg
    .append("line")
    .attr("class", "evolution-hover-line")
    .attr("y1", margin.top)
    .attr("y2", height - margin.bottom)
    .style("opacity", 0);

  const hoverDot = svg
    .append("circle")
    .attr("class", "evolution-hover-dot")
    .attr("r", 4)
    .attr("fill", config.color)
    .attr("stroke", "var(--panel)")
    .attr("stroke-width", 1.5)
    .style("opacity", 0);

  svg
    .append("rect")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", width - margin.left - margin.right)
    .attr("height", height - margin.top - margin.bottom)
    .attr("fill", "transparent")
    .style("cursor", "crosshair")
    .on("mousemove", function (event) {
      const pointer = d3.pointer(event, this);
      const date = x.invert(pointer[0]);
      const nearest = getNearestEvolutionPoint(data, date);

      if (!nearest) return;

      const xPos = x(nearest.date);
      const yPos = y(nearest.value);

      hoverLine.attr("x1", xPos).attr("x2", xPos).style("opacity", 1);

      hoverDot.attr("cx", xPos).attr("cy", yPos).style("opacity", 1);

      tooltip
        .style("opacity", 1)
        .html(
          `
          <strong>${d3.timeFormat("%b %Y")(nearest.date)}</strong>
          <hr/>
          <div class="temporal-tooltip-row">
            <span>${config.label}</span>
            <strong>${d3.format(",.0f")(nearest.value)}</strong>
          </div>
        `,
        )
        .style("left", `${event.pageX + 14}px`)
        .style("top", `${event.pageY + 14}px`);
    })
    .on("mouseleave", function () {
      hoverLine.style("opacity", 0);
      hoverDot.style("opacity", 0);
      tooltip.style("opacity", 0);
    });
}

function getNearestEvolutionPoint(data, targetDate) {
  return data.reduce(function (closest, current) {
    const closestDistance = Math.abs(closest.date - targetDate);
    const currentDistance = Math.abs(current.date - targetDate);

    return currentDistance < closestDistance ? current : closest;
  });
}

function calculatePeakSeverity(series) {
  const peak = d3.max(series, function (d) {
    return d.new_cases || 0;
  });

  return peak ? d3.format(".3s")(peak) : "--";
}

function calculateCaseFatalityRatio(latest) {
  if (
    !latest ||
    !latest.total_cases ||
    !latest.total_deaths ||
    latest.total_cases <= 0
  ) {
    return "--";
  }

  const ratio =
    (latest.total_deaths / latest.total_cases) * 100;

  return `${ratio.toFixed(2)}%`;
}