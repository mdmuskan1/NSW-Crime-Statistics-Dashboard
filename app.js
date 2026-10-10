const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vRFyxotbxgykmHC4eozTpi4UYYQhYPd4kTGToCk30VaQr7PJP4vV95_UYom4Rrk2boBP9z4o6QXsl9V/pub?output=csv';

let rawData = [];
let filteredData = [];
let charts = {};
let monthColumns = [];

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseMonthCol(col) {
    const match = col.match(/^(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})$/);
    if (match) {
        const monthIdx = monthNames.indexOf(match[1]);
        const year = parseInt(match[2]);
        return { month: monthIdx + 1, year, label: col };
    }
    return null;
}

async function loadData() {
    showLoading(true);
    hideError();
    
    try {
        const response = await fetch(CSV_URL);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const csvText = await response.text();
        rawData = parseCSV(csvText);
        extractMonthColumns();
        populateFilters();
        applyFilters();
    } catch (error) {
        console.error('Error loading data:', error);
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

function parseCSV(text) {
    const lines = text.trim().split('\n');
    const headers = parseCSVLine(lines[0]);
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        const values = parseCSVLine(lines[i]);
        if (values.length !== headers.length) continue;
        
        const row = {};
        headers.forEach((h, idx) => {
            row[h] = values[idx];
        });
        data.push(row);
    }
    return data;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());
    return result;
}

function extractMonthColumns() {
    if (rawData.length === 0) return;
    const sampleRow = rawData[0];
    monthColumns = Object.keys(sampleRow)
        .filter(key => parseMonthCol(key) !== null)
        .map(key => ({ key, ...parseMonthCol(key) }))
        .sort((a, b) => a.year - b.year || a.month - b.month);
}

function populateFilters() {
    const years = [...new Set(monthColumns.map(m => m.year))].sort((a, b) => b - a);
    const months = [...new Set(monthColumns.map(m => m.month))].sort((a, b) => a - b);
    const areas = [...new Set(rawData.map(r => r['NSW Statistical Area']))].filter(Boolean).sort();
    const categories = [...new Set(rawData.map(r => r['Offence category']))].filter(Boolean).sort();
    const subcategories = [...new Set(rawData.map(r => r['Subcategory']))].filter(Boolean).sort();
    
    populateSelect('year-filter', years.map(y => ({ value: y, label: y.toString() })));
    populateSelect('month-filter', months.map(m => ({ value: m, label: monthNames[m - 1] })));
    populateSelect('area-filter', areas.map(a => ({ value: a, label: a })));
    populateSelect('category-filter', categories.map(c => ({ value: c, label: c })));
    populateSelect('subcategory-filter', subcategories.map(s => ({ value: s, label: s })));
}

function populateSelect(id, options) {
    const select = document.getElementById(id);
    select.innerHTML = '';
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value;
        option.textContent = opt.label;
        select.appendChild(option);
    });
}

function getSelectedValues(selectId) {
    const select = document.getElementById(selectId);
    return Array.from(select.selectedOptions).map(o => o.value);
}

function applyFilters() {
    const selectedYears = getSelectedValues('year-filter');
    const selectedMonths = getSelectedValues('month-filter').map(Number);
    const selectedAreas = getSelectedValues('area-filter');
    const selectedCategories = getSelectedValues('category-filter');
    const selectedSubcategories = getSelectedValues('subcategory-filter');
    
    const relevantMonthCols = monthColumns.filter(m => {
        const yearMatch = selectedYears.length === 0 || selectedYears.includes(m.year.toString());
        const monthMatch = selectedMonths.length === 0 || selectedMonths.includes(m.month);
        return yearMatch && monthMatch;
    });
    
    filteredData = rawData.filter(row => {
        const areaMatch = selectedAreas.length === 0 || selectedAreas.includes(row['NSW Statistical Area']);
        const catMatch = selectedCategories.length === 0 || selectedCategories.includes(row['Offence category']);
        const subcatMatch = selectedSubcategories.length === 0 || selectedSubcategories.includes(row['Subcategory']);
        return areaMatch && catMatch && subcatMatch;
    });
    
    updateKPIs(relevantMonthCols);
    updateCharts(relevantMonthCols);
    updateRankings(relevantMonthCols);
}

function updateKPIs(monthCols) {
    let totalIncidents = 0;
    const categoryTotals = {};
    const areaTotals = {};
    
    filteredData.forEach(row => {
        monthCols.forEach(m => {
            const val = parseInt(row[m.key]) || 0;
            totalIncidents += val;
            
            const cat = row['Offence category'];
            categoryTotals[cat] = (categoryTotals[cat] || 0) + val;
            
            const area = row['NSW Statistical Area'];
            areaTotals[area] = (areaTotals[area] || 0) + val;
        });
    });
    
    const topCategory = Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0];
    const topArea = Object.entries(areaTotals).sort((a, b) => b[1] - a[1])[0];
    
    const latestMonth = monthCols.length > 0 
        ? monthCols[monthCols.length - 1].label 
        : 'No data';
    
    document.getElementById('kpi-total-incidents').textContent = formatNumber(totalIncidents);
    document.getElementById('kpi-top-category').textContent = topCategory ? topCategory[0] : '-';
    document.getElementById('kpi-top-area').textContent = topArea ? topArea[0] : '-';
    document.getElementById('kpi-latest-month').textContent = latestMonth;
}

function updateCharts(monthCols) {
    updateTimeChart(monthCols);
    updateCategoryChart(monthCols);
    updateAreaChart(monthCols);
    updateTopAreasChart(monthCols);
}

function updateTimeChart(monthCols) {
    const timeData = {};
    monthCols.forEach(m => {
        let sum = 0;
        filteredData.forEach(row => {
            sum += parseInt(row[m.key]) || 0;
        });
        timeData[m.label] = sum;
    });
    
    const labels = Object.keys(timeData);
    const data = Object.values(timeData);
    
    if (charts.time) charts.time.destroy();
    
    const ctx = document.getElementById('chart-time').getContext('2d');
    charts.time = new Chart(ctx, {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Incidents',
                data,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                fill: true,
                tension: 0.3,
                pointRadius: 0,
                pointHoverRadius: 5,
            }]
        },
        options: getChartOptions('Incidents Over Time')
    });
}

function updateCategoryChart(monthCols) {
    const catTotals = {};
    filteredData.forEach(row => {
        const cat = row['Offence category'];
        monthCols.forEach(m => {
            const val = parseInt(row[m.key]) || 0;
            catTotals[cat] = (catTotals[cat] || 0) + val;
        });
    });
    
    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(s => s[0]);
    const data = sorted.map(s => s[1]);
    
    if (charts.category) charts.category.destroy();
    
    const ctx = document.getElementById('chart-category').getContext('2d');
    charts.category = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data,
                backgroundColor: generateColors(labels.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            ...getChartOptions('Incidents by Category'),
            plugins: {
                legend: { position: 'right', labels: { padding: 16, usePointStyle: true } },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.label}: ${formatNumber(ctx.raw)} (${((ctx.raw / data.reduce((a,b)=>a+b,0))*100).toFixed(1)}%)`
                    }
                }
            }
        }
    });
}

function updateAreaChart(monthCols) {
    const areaTotals = {};
    filteredData.forEach(row => {
        const area = row['NSW Statistical Area'];
        monthCols.forEach(m => {
            const val = parseInt(row[m.key]) || 0;
            areaTotals[area] = (areaTotals[area] || 0) + val;
        });
    });
    
    const sorted = Object.entries(areaTotals).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(s => s[0]);
    const data = sorted.map(s => s[1]);
    
    if (charts.area) charts.area.destroy();
    
    const ctx = document.getElementById('chart-area').getContext('2d');
    charts.area = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Incidents',
                data,
                backgroundColor: '#3498db',
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            ...getChartOptions('Incidents by Area'),
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.label}: ${formatNumber(ctx.raw)}`
                    }
                }
            },
            scales: {
                x: { beginAtZero: true, ticks: { callback: v => formatNumber(v) } },
                y: { ticks: { autoSkip: false } }
            }
        }
    });
}

function updateTopAreasChart(monthCols) {
    const areaTotals = {};
    filteredData.forEach(row => {
        const area = row['NSW Statistical Area'];
        monthCols.forEach(m => {
            const val = parseInt(row[m.key]) || 0;
            areaTotals[area] = (areaTotals[area] || 0) + val;
        });
    });
    
    const sorted = Object.entries(areaTotals).sort((a, b) => b[1] - a[1]).slice(0, 10);
    const labels = sorted.map(s => s[0]);
    const data = sorted.map(s => s[1]);
    
    if (charts.topAreas) charts.topAreas.destroy();
    
    const ctx = document.getElementById('chart-top-areas').getContext('2d');
    charts.topAreas = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Incidents',
                data,
                backgroundColor: (ctx) => {
                    const idx = ctx.dataIndex;
                    const ratio = idx / (labels.length - 1);
                    return `hsl(${220 - ratio * 60}, 70%, ${45 + ratio * 15}%)`;
                },
                borderRadius: 6,
                borderSkipped: false,
            }]
        },
        options: {
            ...getChartOptions('Top 10 Areas'),
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: ctx => `${ctx.label}: ${formatNumber(ctx.raw)}`
                    }
                }
            },
            scales: {
                y: { beginAtZero: true, ticks: { callback: v => formatNumber(v) } }
            }
        }
    });
}

function updateRankings(monthCols) {
    updateCategoryRanking(monthCols);
    updateAreaRanking(monthCols);
    updateSubcategoryRanking(monthCols);
}

function updateCategoryRanking(monthCols) {
    const catTotals = {};
    filteredData.forEach(row => {
        const cat = row['Offence category'];
        monthCols.forEach(m => {
            const val = parseInt(row[m.key]) || 0;
            catTotals[cat] = (catTotals[cat] || 0) + val;
        });
    });
    
    const total = Object.values(catTotals).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]).slice(0, 10);
    
    const tbody = document.querySelector('#ranking-categories tbody');
    tbody.innerHTML = sorted.map(([cat, count], i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${cat}</td>
            <td>${formatNumber(count)}</td>
            <td>${((count / total) * 100).toFixed(1)}%</td>
        </tr>
    `).join('');
}

function updateAreaRanking(monthCols) {
    const areaTotals = {};
    filteredData.forEach(row => {
        const area = row['NSW Statistical Area'];
        monthCols.forEach(m => {
            const val = parseInt(row[m.key]) || 0;
            areaTotals[area] = (areaTotals[area] || 0) + val;
        });
    });
    
    const total = Object.values(areaTotals).reduce((a, b) => a + b, 0);
    const sorted = Object.entries(areaTotals).sort((a, b) => b[1] - a[1]).slice(0, 10);
    
    const tbody = document.querySelector('#ranking-areas tbody');
    tbody.innerHTML = sorted.map(([area, count], i) => `
        <tr>
            <td>${i + 1}</td>
            <td>${area}</td>
            <td>${formatNumber(count)}</td>
            <td>${((count / total) * 100).toFixed(1)}%</td>
        </tr>
    `).join('');
}

function updateSubcategoryRanking(monthCols) {
    const subcatTotals = {};
    filteredData.forEach(row => {
        const subcat = row['Subcategory'];
        const cat = row['Offence category'];
        const key = `${subcat} (${cat})`;
        monthCols.forEach(m => {
            const val = parseInt(row[m.key]) || 0;
            subcatTotals[key] = (subcatTotals[key] || 0) + val;
        });
    });
    
    const sorted = Object.entries(subcatTotals).sort((a, b) => b[1] - a[1]).slice(0, 10);
    
    const tbody = document.querySelector('#ranking-subcategories tbody');
    tbody.innerHTML = sorted.map(([key, count], i) => {
        const match = key.match(/(.+)\s+\((.+)\)$/);
        const subcat = match ? match[1] : key;
        const cat = match ? match[2] : '';
        return `
            <tr>
                <td>${i + 1}</td>
                <td>${subcat}</td>
                <td>${cat}</td>
                <td>${formatNumber(count)}</td>
            </tr>
        `;
    }).join('');
}

function getChartOptions(title) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            title: {
                display: false,
            },
            legend: {
                display: true,
                position: 'top',
                labels: { usePointStyle: true, padding: 16 }
            },
            tooltip: {
                backgroundColor: 'rgba(0,0,0,0.8)',
                padding: 12,
                titleFont: { size: 13 },
                bodyFont: { size: 12 },
                callbacks: {
                    label: ctx => `${ctx.dataset.label || ''}: ${formatNumber(ctx.raw)}`
                }
            }
        },
        scales: {
            x: {
                grid: { display: false },
                ticks: { maxRotation: 45, minRotation: 0 }
            },
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(0,0,0,0.05)' },
                ticks: { callback: v => formatNumber(v) }
            }
        },
        interaction: {
            intersect: false,
            mode: 'index'
        }
    };
}

function generateColors(count) {
    const colors = [];
    for (let i = 0; i < count; i++) {
        const hue = (i * 137.508) % 360;
        colors.push(`hsl(${hue}, 65%, 55%)`);
    }
    return colors;
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
}

function showLoading(show) {
    document.getElementById('loading-overlay').style.display = show ? 'flex' : 'none';
}

function showError(message) {
    document.getElementById('error-message').textContent = message;
    document.getElementById('error-overlay').classList.remove('hidden');
}

function hideError() {
    document.getElementById('error-overlay').classList.add('hidden');
}

document.addEventListener('DOMContentLoaded', () => {
    loadData();
    
    ['year-filter', 'month-filter', 'area-filter', 'category-filter', 'subcategory-filter'].forEach(id => {
        document.getElementById(id).addEventListener('change', applyFilters);
    });
    
    document.getElementById('reset-filters').addEventListener('click', () => {
        ['year-filter', 'month-filter', 'area-filter', 'category-filter', 'subcategory-filter'].forEach(id => {
            const select = document.getElementById(id);
            Array.from(select.options).forEach(opt => opt.selected = false);
        });
        applyFilters();
    });
    
    document.getElementById('retry-btn').addEventListener('click', loadData);
});