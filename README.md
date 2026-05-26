# COVID-19 Global Insights Portal
An interactive analytics dashboard focused on COVID-19 pandemic evolution, epidemiological analysis, and temporal exploration using D3.js and Observable Plot.

## Purpose

This project was developed as an interactive analytics prototype designed to explore global COVID-19 evolution patterns through temporal exploration, epidemiological indicators, and country-level contextual analysis.

The dashboard focuses on:
- Temporal pandemic behavior
- Country-level epidemiological context
- Comparative demographic indicators
- Interactive filtering and exploration
- Analytical data visualization patterns inspired by enterprise monitoring platforms

## Features

- Interactive global pandemic map
- Country-level drilldown analysis
- Temporal trend exploration
- Epidemiological context visualization
- Dynamic dashboard filters
- Persistent UI state with localStorage
- Light/Dark theme
- Responsive analytical layouts

## Tech Stack

- D3.js
- Observable Plot
- JavaScript
- HTML5
- CSS3

## Data Source

COVID-19 data was derived from publicly available datasets provided by Our World in Data (OWID).

Source repository:
https://github.com/owid/covid-19-data

Primary dataset used during preprocessing:
https://catalog.ourworldindata.org/garden/covid/latest/compact/compact.csv

The repository includes only processed and lightweight datasets required for the dashboard experience.

## Analytical Notes

The dashboard prioritizes directly traceable and auditable indicators derived from the dataset itself.

## Running locally

```bash
py -m http.server 8000
```

Then open:

```txt
http://localhost:8000
```
