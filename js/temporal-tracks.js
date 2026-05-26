function renderTemporalTracks(
  payload,
  mode,
  selectedCountry,
  granularity,
  selectedTemporalValue,
  selectedTemporalYear,
) {
  const container = document.getElementById("temporalTracks");
  container.innerHTML = "";

  if (!payload || !payload.countries || payload.countries.length === 0) {
    container.innerHTML = `<div class="placeholder">No temporal data available</div>`;
    return;
  }

  granularity = granularity || "year";

  const countries = selectedCountry
    ? payload.countries.filter(function (d) {
        return d.country === selectedCountry;
      })
    : payload.countries;

  const tracks = getTemporalTracks(mode, granularity);

  const data = buildTemporalData(
    countries,
    tracks,
    granularity,
    selectedTemporalValue,
    selectedTemporalYear,
  );

  if (data.length === 0) {
    container.innerHTML = `<div class="placeholder">No temporal data available</div>`;
    return;
  }

  const width = container.clientWidth;
  const height = container.clientHeight;

  const margin = {
    top: 46,
    right: 18,
    bottom: 24,
    left: 78,
  };

  const trackGap = 18;

  const trackWidth =
    (width - margin.left - margin.right - trackGap * (tracks.length - 1)) /
    tracks.length;

  const innerHeight = height - margin.top - margin.bottom;

  const y = d3
    .scaleTime()
    .domain(getTemporalDomain(data))
    .range([margin.top, margin.top + innerHeight]);

  d3.selectAll(".temporal-tooltip").remove();

  const tooltip = d3
    .select("body")
    .append("div")
    .attr("class", "temporal-tooltip")
    .style("opacity", 0);

  const svg = d3
    .create("svg")
    .attr("width", width)
    .attr("height", height)
    .attr("viewBox", [0, 0, width, height])
    .attr("class", "temporal-svg");

  svg
    .append("text")
    .attr("x", 14)
    .attr("y", margin.top - 12)
    .attr("class", "track-axis-label")
    .text("Timeline");

  svg
    .append("g")
    .attr("transform", `translate(${margin.left - 10},0)`)
    .call(getTemporalAxis(y, granularity))
    .call(function (g) {
      g.select(".domain").remove();
    });

  const hoverLine = svg
    .append("line")
    .attr("class", "temporal-hover-line")
    .attr("x1", margin.left)
    .attr("x2", width - margin.right)
    .attr("y1", margin.top)
    .attr("y2", margin.top)
    .style("opacity", 0);

  const markerGroup = svg
    .append("g")
    .attr("class", "temporal-marker-group")
    .style("opacity", 0);

  tracks.forEach(function (track, index) {
    const x0 = margin.left + index * (trackWidth + trackGap);

    renderTrackShell(svg, track, data, x0, trackWidth, margin.top, innerHeight);

    renderTrackArea(svg, data, track, x0, trackWidth, y);
  });

  svg
    .append("rect")
    .attr("x", margin.left)
    .attr("y", margin.top)
    .attr("width", width - margin.left - margin.right)
    .attr("height", innerHeight)
    .attr("fill", "transparent")
    .style("cursor", "crosshair")
    .on("mousemove", function (event) {
      const pointer = d3.pointer(event, this);
      const date = y.invert(pointer[1]);
      const nearest = getNearestTemporalPoint(data, date);

      if (!nearest) return;

      const lineY = y(nearest.date);

      hoverLine.attr("y1", lineY).attr("y2", lineY).style("opacity", 1);

      markerGroup.selectAll("*").remove();

      tracks.forEach(function (track, index) {
        const x0 = margin.left + index * (trackWidth + trackGap);
        const x = getTrackXScale(data, track, x0, trackWidth);
        const value = nearest[track.key] || 0;

        markerGroup
          .append("circle")
          .attr("cx", x(value))
          .attr("cy", lineY)
          .attr("r", 4)
          .attr("fill", track.color)
          .attr("stroke", "var(--panel)")
          .attr("stroke-width", 1.5);
      });

      markerGroup.style("opacity", 1);

      tooltip
        .style("opacity", 1)
        .html(
          buildTemporalTooltip(nearest, tracks, granularity, selectedCountry),
        )
        .style("left", `${event.pageX + 14}px`)
        .style("top", `${event.pageY + 14}px`);
    })
    .on("mouseleave", function () {
      hoverLine.style("opacity", 0);
      markerGroup.style("opacity", 0);
      tooltip.style("opacity", 0);
    });

  container.appendChild(svg.node());
}

function getTemporalTracks(mode, granularity) {
  const isNew = mode === "new";
  const periodLabel = getTemporalPeriodLabel(granularity);

  if (isNew) {
    return [
      {
        key: "new_cases",
        label: `${periodLabel} New Cases`,
        color: "var(--accent)",
        aggregation: "sum",
      },
      {
        key: "new_deaths",
        label: `${periodLabel} New Deaths`,
        color: "var(--danger)",
        aggregation: "sum",
      },
      {
        key: "new_vaccinations",
        label: `${periodLabel} New Vaccinations`,
        color: "var(--success)",
        aggregation: "sum",
      },
      {
        key: "vaccination_pct",
        label: `${periodLabel} Fully Vaccinated %`,
        color: "var(--warning)",
        aggregation: "mean_last",
        suffix: "%",
      },
    ];
  }

  return [
    {
      key: "total_cases",
      label: "Total Cases",
      color: "var(--accent)",
      aggregation: "last_sum",
    },
    {
      key: "total_deaths",
      label: "Total Deaths",
      color: "var(--danger)",
      aggregation: "last_sum",
    },
    {
      key: "total_vaccinations",
      label: "Total Vaccinations",
      color: "var(--success)",
      aggregation: "last_sum",
    },
    {
      key: "vaccination_pct",
      label: "Fully Vaccinated %",
      color: "var(--warning)",
      aggregation: "mean_last",
      suffix: "%",
    },
  ];
}

function getTemporalPeriodLabel(granularity) {
  if (granularity === "month") return "Monthly";
  if (granularity === "quarter") return "Quarterly";
  if (granularity === "semester") return "Semester";
  return "Annual";
}

function renderTrackShell(svg, track, data, x0, trackWidth, y0, innerHeight) {
  svg
    .append("text")
    .attr("x", x0)
    .attr("y", 18)
    .attr("class", "track-title")
    .text(track.label);

  svg
    .append("rect")
    .attr("x", x0)
    .attr("y", y0)
    .attr("width", trackWidth)
    .attr("height", innerHeight)
    .attr("rx", 12)
    .attr("class", "track-bg");

  const maxValue =
    d3.max(data, function (d) {
      return d[track.key];
    }) || 1;

  const tickCount = getTrackTickCount(trackWidth);
  const tickSteps = d3.range(tickCount).map(function (i) {
    return i / (tickCount - 1);
  });

  tickSteps.forEach(function (step, index) {
    const x = x0 + 6 + (trackWidth - 14) * step;

    svg
      .append("line")
      .attr("x1", x)
      .attr("x2", x)
      .attr("y1", y0)
      .attr("y2", y0 + innerHeight)
      .attr(
        "class",
        index === 0
          ? "track-baseline"
          : index === tickSteps.length - 1
            ? "track-scale-line"
            : "track-grid-line",
      );

    svg
      .append("line")
      .attr("x1", x)
      .attr("x2", x)
      .attr("y1", y0 - 5)
      .attr("y2", y0)
      .attr("class", "track-top-tick");

    svg
      .append("line")
      .attr("x1", x)
      .attr("x2", x)
      .attr("y1", y0 + innerHeight)
      .attr("y2", y0 + innerHeight + 5)
      .attr("class", "track-bottom-tick");

    svg
      .append("text")
      .attr("x", x)
      .attr("y", y0 - 8)
      .attr(
        "text-anchor",
        index === 0
          ? "start"
          : index === tickSteps.length - 1
            ? "end"
            : "middle",
      )
      .attr("class", "track-scale-label")
      .text(formatTrackValueForAxis(maxValue * step, track.suffix));
  });
}

function renderTrackArea(svg, data, track, x0, trackWidth, y) {
  const x = getTrackXScale(data, track, x0, trackWidth);

  const area = d3
    .area()
    .defined(function (d) {
      return isValidNumber(d[track.key]);
    })
    .y(function (d) {
      return y(d.date);
    })
    .x0(x0 + 6)
    .x1(function (d) {
      return x(d[track.key] || 0);
    })
    .curve(d3.curveLinear);

  const line = d3
    .line()
    .defined(function (d) {
      return isValidNumber(d[track.key]);
    })
    .y(function (d) {
      return y(d.date);
    })
    .x(function (d) {
      return x(d[track.key] || 0);
    })
    .curve(d3.curveLinear);

  svg
    .append("path")
    .datum(data)
    .attr("d", area)
    .attr("fill", track.color)
    .attr("fill-opacity", 0.18);

  svg
    .append("path")
    .datum(data)
    .attr("d", line)
    .attr("fill", "none")
    .attr("stroke", track.color)
    .attr("stroke-width", 2.25);

  if (data.length === 1) {
    svg
      .append("circle")
      .attr("cx", x(data[0][track.key] || 0))
      .attr("cy", y(data[0].date))
      .attr("r", 4)
      .attr("fill", track.color)
      .attr("stroke", "var(--panel)")
      .attr("stroke-width", 1.5);
  }
}

function getTrackXScale(data, track, x0, trackWidth) {
  const maxValue =
    d3.max(data, function (d) {
      return d[track.key];
    }) || 1;

  return d3
    .scaleLinear()
    .domain([0, maxValue])
    .range([x0 + 6, x0 + trackWidth - 8]);
}

function buildTemporalData(
  countries,
  tracks,
  granularity,
  selectedTemporalValue,
  selectedTemporalYear,
) {
  const timelineMap = new Map();

  countries.forEach(function (country) {
    country.timeline.forEach(function (point) {
      if (
        !matchesTemporalPoint(
          point.date,
          granularity,
          selectedTemporalValue,
          selectedTemporalYear,
        )
      ) {
        return;
      }

      const bucket = getTemporalBucket(point.date, granularity);

      if (!timelineMap.has(bucket)) {
        timelineMap.set(bucket, {
          date: new Date(bucket),
          countries: new Map(),
        });
      }

      const bucketRow = timelineMap.get(bucket);

      if (!bucketRow.countries.has(country.country)) {
        bucketRow.countries.set(country.country, []);
      }

      bucketRow.countries.get(country.country).push(point);
    });
  });

  return Array.from(timelineMap.values())
    .map(function (bucketRow) {
      const result = {
        date: bucketRow.date,
      };

      tracks.forEach(function (track) {
        const values = [];

        bucketRow.countries.forEach(function (points) {
          const validPoints = points
            .filter(function (point) {
              return isValidNumber(point[track.key]);
            })
            .sort(function (a, b) {
              return d3.ascending(new Date(a.date), new Date(b.date));
            });

          if (validPoints.length === 0) return;

          if (track.aggregation === "sum") {
            values.push(
              d3.sum(validPoints, function (point) {
                return Number(point[track.key]);
              }),
            );
          }

          if (
            track.aggregation === "last_sum" ||
            track.aggregation === "mean_last"
          ) {
            const lastPoint = validPoints[validPoints.length - 1];
            values.push(Number(lastPoint[track.key]));
          }
        });

        if (track.aggregation === "mean_last") {
          result[track.key] = d3.mean(values) || 0;
        } else {
          result[track.key] = d3.sum(values) || 0;
        }
      });

      return result;
    })
    .sort(function (a, b) {
      return d3.ascending(a.date, b.date);
    });
}

function getTemporalDomain(data) {
  const extent = d3.extent(data, function (d) {
    return d.date;
  });

  if (!extent[0] || !extent[1]) {
    const now = new Date();

    return [d3.timeMonth.offset(now, -1), d3.timeMonth.offset(now, 1)];
  }

  if (extent[0].getTime() === extent[1].getTime()) {
    return [
      d3.timeMonth.offset(extent[0], -2),
      d3.timeMonth.offset(extent[1], 2),
    ];
  }

  return extent;
}

function getNearestTemporalPoint(data, targetDate) {
  return data.reduce(function (closest, current) {
    const closestDistance = Math.abs(closest.date - targetDate);
    const currentDistance = Math.abs(current.date - targetDate);

    return currentDistance < closestDistance ? current : closest;
  });
}

function buildTemporalTooltip(point, tracks, granularity, selectedCountry) {
  const title = selectedCountry
    ? `${selectedCountry} · ${formatTemporalDate(point.date, granularity)}`
    : formatTemporalDate(point.date, granularity);

  const rows = tracks
    .map(function (track) {
      return `
      <div class="temporal-tooltip-row">
        <span>${track.label}</span>
        <strong>${formatTrackValue(point[track.key], track.suffix)}</strong>
      </div>
    `;
    })
    .join("");

  return `
    <strong>${title}</strong>
    <hr/>
    ${rows}
  `;
}

function formatTemporalDate(date, granularity) {
  if (granularity === "month") {
    return d3.timeFormat("%b %Y")(date);
  }

  if (granularity === "quarter") {
    const quarter = Math.floor(date.getMonth() / 3) + 1;
    return `Q${quarter} ${date.getFullYear()}`;
  }

  if (granularity === "semester") {
    const semester = date.getMonth() < 6 ? "H1" : "H2";
    return `${semester} ${date.getFullYear()}`;
  }

  return d3.timeFormat("%Y")(date);
}

function getTemporalBucket(dateString, granularity) {
  const date = new Date(dateString);

  const year = date.getFullYear();
  const month = date.getMonth();

  if (granularity === "month") {
    return `${year}-${String(month + 1).padStart(2, "0")}-01`;
  }

  if (granularity === "quarter") {
    const quarterMonth = Math.floor(month / 3) * 3;
    return `${year}-${String(quarterMonth + 1).padStart(2, "0")}-01`;
  }

  if (granularity === "semester") {
    const semesterMonth = month < 6 ? 0 : 6;
    return `${year}-${String(semesterMonth + 1).padStart(2, "0")}-01`;
  }

  return `${year}-01-01`;
}

function getTemporalAxis(y, granularity) {
  if (granularity === "month") {
    return d3
      .axisLeft(y)
      .ticks(d3.timeMonth.every(3))
      .tickFormat(d3.timeFormat("%b %Y"))
      .tickSize(0);
  }

  if (granularity === "quarter") {
    return d3
      .axisLeft(y)
      .ticks(d3.timeMonth.every(6))
      .tickFormat(d3.timeFormat("%b %Y"))
      .tickSize(0);
  }

  if (granularity === "semester") {
    return d3
      .axisLeft(y)
      .ticks(d3.timeMonth.every(6))
      .tickFormat(d3.timeFormat("%b %Y"))
      .tickSize(0);
  }

  return d3
    .axisLeft(y)
    .ticks(d3.timeYear.every(1))
    .tickFormat(d3.timeFormat("%Y"))
    .tickSize(0);
}

function matchesTemporalPoint(
  dateString,
  granularity,
  selectedTemporalValue,
  selectedTemporalYear,
) {
  const date = new Date(dateString);

  const year = String(date.getFullYear());
  const month = date.getMonth();

  if (selectedTemporalYear && year !== selectedTemporalYear) {
    return false;
  }

  if (!selectedTemporalValue) {
    return true;
  }

  if (granularity === "year") {
    return year === selectedTemporalValue;
  }

  if (granularity === "semester") {
    const semester = month < 6 ? "S1" : "S2";
    return semester === selectedTemporalValue;
  }

  if (granularity === "quarter") {
    const quarter = `Q${Math.floor(month / 3) + 1}`;
    return quarter === selectedTemporalValue;
  }

  if (granularity === "month") {
    return String(month) === selectedTemporalValue;
  }

  return true;
}

function getTrackTickCount(trackWidth) {
  if (trackWidth < 130) return 3;
  if (trackWidth < 190) return 5;
  if (trackWidth < 260) return 7;
  return 10;
}

function formatTrackValue(value, suffix) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  if (suffix === "%") {
    return `${value.toFixed(1)}%`;
  }

  return d3.format(".3s")(value);
}

function formatTrackValueForAxis(value, suffix) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return "--";
  }

  if (suffix === "%") {
    return `${value.toFixed(0)}%`;
  }

  return d3.format(".2s")(value);
}

function isValidNumber(value) {
  return (
    value !== null && value !== undefined && Number.isFinite(Number(value))
  );
}
