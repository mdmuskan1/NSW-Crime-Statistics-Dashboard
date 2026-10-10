# NSW Crime Dashboard

An interactive data dashboard for visualizing NSW crime statistics from the NSW Statistical Area Monthly Data (SA4) dataset.

## Features

### KPI Cards
- **Total Incidents** - Sum of all incidents across filtered data
- **Most Common Offence Category** - Top offence category by incident count
- **Highest Incident Area** - NSW Statistical Area with the most incidents
- **Latest Reporting Month** - Most recent month in the filtered dataset

### Visualizations
1. **Crime Incidents Over Time** - Line chart showing incident trends across months
2. **Incidents by Offence Category** - Doughnut chart showing distribution by category
3. **Incidents by Geographic Area** - Horizontal bar chart for all areas
4. **Top Areas by Incident Count** - Top 10 areas ranked by incidents

### Interactive Filters
- **Year** - Multi-select filter for years (1995-2026)
- **Month** - Multi-select filter for months (Jan-Dec)
- **NSW Statistical Area** - Multi-select filter for geographic regions
- **Offence Category** - Multi-select filter for offence categories
- **Offence Subcategory** - Multi-select filter for detailed offence types

All filters work in combination. When any filter changes, all KPIs, charts, and rankings update automatically.

### Rankings Tables
- Top 10 Offence Categories with percentages
- Top 10 Areas with percentages
- Top 10 Subcategories with parent category

## Data Source

Data is loaded dynamically from the published Google Sheets CSV:
```
https://docs.google.com/spreadsheets/d/e/2PACX-1vRFyxotbxgykmHC4eozTpi4UYYQhYPd4kTGToCk30VaQr7PJP4vV95_UYom4Rrk2boBP9z4o6QXsl9V/pub?output=csv
```

The dataset contains monthly crime statistics from January 1995 to March 2026 across NSW Statistical Areas (SA4), broken down by offence category and subcategory.

## Technical Stack

- **HTML5** - Semantic structure
- **CSS3** - Modern styling with CSS Grid/Flexbox, custom properties, responsive design
- **Vanilla JavaScript (ES6+)** - Data processing, filtering, and visualization
- **Chart.js v4** - Interactive charts (loaded via CDN)

No build step required - runs directly in the browser.

## Project Structure

```
NSW CRIME DASHBOARD/
├── index.html      # Main HTML structure
├── styles.css      # All styling
├── app.js          # Data loading, processing, filtering, and visualization
├── data.csv        # Local copy of CSV (for reference)
└── README.md       # This file
```

## Running the Dashboard

Simply open `index.html` in a modern web browser. For best results, serve via a local web server:

```bash
# Using Python
python -m http.server 8000

# Using Node.js (http-server)
npx http-server

# Using PHP
php -S localhost:8000
```

Then navigate to `http://localhost:8000`.

## Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Error Handling

- Loading overlay while fetching data
- Error overlay with retry button if data fails to load
- Graceful handling of missing/invalid data values
- Empty state handling for filters with no matching data

## Responsive Design

- Desktop: Full 4-chart grid, 4 KPI cards in a row
- Tablet: Stacked charts, 2 KPI cards per row
- Mobile: Single column layout, 1 KPI card per row, collapsible filters

## License

This project is for educational/community resource centre use. Data sourced from NSW Government open data.