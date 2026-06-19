/**
 * Chart Component — обёртка над Chart.js
 */

import Chart from 'chart.js/auto';
import { getChartColors, formatShortDate } from '../utils/helpers.js';

function formatChartDate(value, labels = [], index = 0) {
    if (typeof value === 'number' && value > 1_000_000_000_000) {
        return formatShortDate(new Date(value));
    }

    const label = labels[index];
    if (typeof label === 'number') {
        return formatShortDate(new Date(label));
    }

    if (label) {
        return formatShortDate(label);
    }

    if (typeof value === 'number') {
        return formatShortDate(new Date(value));
    }

    return value ? formatShortDate(value) : '';
}

export class ChartComponent {
    constructor(container, options = {}) {
        this.container = container;
        this.chart = null;
        this._handleThemeChange = () => this._refreshThemeColors();
        this.options = {
            type: 'line',
            height: 400,
            ...options
        };
        window.addEventListener('psa:themechange', this._handleThemeChange);
    }
    
    /**
     * Создать/обновить график
     * @param {Object} config - Конфигурация графика
     * @param {Array} config.datasets - Наборы данных
     * @param {Array} config.labels - Метки по оси X
     * @param {Array} config.plugins - Плагины
     * @param {Object} config.options - Дополнительные опции
     */
    render({ datasets, labels, plugins = [], options = {} }) {
        const ctx = this._getOrCreateCanvas();
        const themeColors = this._getThemeColors();
        
        const chartColors = getChartColors(datasets.length);
        
        const chartDatasets = datasets.map((dataset, index) => {
            const { color, ...datasetOptions } = dataset;

            return {
                ...datasetOptions,
                borderColor: color || chartColors[index % chartColors.length],
                backgroundColor: color || chartColors[index % chartColors.length],
                borderWidth: 2,
                pointRadius: dataset.pointRadius ?? 0,
                pointHoverRadius: dataset.pointHoverRadius ?? 4,
                fill: false,
                tension: 0.3,
            };
        });
        
        // Уничтожить старый график
        if (this.chart) {
            this.chart.destroy();
        }
        
        // Плагин для вертикальной линии (crosshair)
        const crosshairPlugin = {
            id: 'crosshair',
            afterDraw: (chart) => {
                const activeElements = chart.tooltip?.getActiveElements?.() || chart.tooltip?._active || [];
                if (!activeElements.length) {
                    return;
                }

                const ctx = chart.ctx;
                const activePoint = activeElements[0];
                const x = activePoint?.element?.x;
                const { top, bottom } = chart.chartArea;

                if (typeof x !== 'number') {
                    return;
                }

                ctx.save();
                ctx.beginPath();
                ctx.moveTo(x, top);
                ctx.lineTo(x, bottom);
                ctx.lineWidth = 2;
                ctx.strokeStyle = this._getThemeColors().crosshair;
                ctx.setLineDash([5, 5]);
                ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
                ctx.shadowBlur = 4;
                ctx.stroke();
                ctx.restore();
            },
        };
        
        const defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: {
                    bottom: 30,
                },
            },
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                legend: {
                    display: datasets.length > 1,
                    position: 'top',
                    labels: {
                        color: themeColors.textPrimary,
                        usePointStyle: true,
                    },
                },
                tooltip: {
                    backgroundColor: themeColors.tooltipBg,
                    titleColor: themeColors.textPrimary,
                    bodyColor: themeColors.textMuted,
                    borderColor: themeColors.tooltipBorder,
                    borderWidth: 1,
                    padding: 12,
                    displayColors: true,
                    itemSort: (a, b) => b.parsed.y - a.parsed.y,
                    callbacks: {
                        label: (context) => {
                            const value = context.parsed.y;
                            return `${context.dataset.label}: ${value} вакансий`;
                        },
                        title: (items) => {
                            const item = items[0];
                            return item ? formatChartDate(item.parsed?.x ?? item.label, labels, item.dataIndex) : '';
                        },
                    },
                },
            },
            scales: {
                x: {
                    grid: {
                        color: themeColors.grid,
                    },
                    ticks: {
                        color: themeColors.textMuted,
                        maxTicksLimit: 10,
                        maxRotation: 0,
                        callback: (value, index) => {
                            return formatChartDate(value, labels, index);
                        },
                    },
                },
                y: {
                    grid: {
                        color: themeColors.grid,
                    },
                    ticks: {
                        color: themeColors.textMuted,
                        precision: 0,
                    },
                    beginAtZero: false,
                },
            },
        };

        const chartOptions = {
            ...defaultOptions,
            ...options,
            plugins: {
                ...defaultOptions.plugins,
                ...options.plugins,
                legend: {
                    ...defaultOptions.plugins.legend,
                    ...options.plugins?.legend,
                },
                tooltip: {
                    ...defaultOptions.plugins.tooltip,
                    ...options.plugins?.tooltip,
                    callbacks: {
                        ...defaultOptions.plugins.tooltip.callbacks,
                        ...options.plugins?.tooltip?.callbacks,
                    },
                },
            },
            scales: {
                ...defaultOptions.scales,
                ...options.scales,
                x: {
                    ...defaultOptions.scales.x,
                    ...options.scales?.x,
                    ticks: {
                        ...defaultOptions.scales.x.ticks,
                        ...options.scales?.x?.ticks,
                    },
                    grid: {
                        ...defaultOptions.scales.x.grid,
                        ...options.scales?.x?.grid,
                    },
                },
                y: {
                    ...defaultOptions.scales.y,
                    ...options.scales?.y,
                    ticks: {
                        ...defaultOptions.scales.y.ticks,
                        ...options.scales?.y?.ticks,
                    },
                    grid: {
                        ...defaultOptions.scales.y.grid,
                        ...options.scales?.y?.grid,
                    },
                },
            },
        };

        // Создать новый график
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: chartDatasets,
            },
            options: chartOptions,
            plugins: [crosshairPlugin, ...plugins],
        });
    }
    
    /**
     * Получить или создать canvas элемент
     * @returns {CanvasRenderingContext2D}
     */
    _getOrCreateCanvas() {
        let canvas = this.container.querySelector('canvas');
        
        if (!canvas) {
            this.container.innerHTML = '<canvas></canvas>';
            canvas = this.container.querySelector('canvas');
        }
        
        return canvas.getContext('2d');
    }
    
    /**
     * Обновить данные графика
     * @param {Object} data - Новые данные
     */
    update(data) {
        if (this.chart) {
            this.chart.data = data;
            this.chart.update();
        }
    }

    /**
     * Получить цвета текущей темы из CSS variables.
     * @returns {Object}
     */
    _getThemeColors() {
        const styles = getComputedStyle(document.documentElement);
        const cssVar = (name) => styles.getPropertyValue(name).trim();

        return {
            textPrimary: cssVar('--text-primary'),
            textMuted: cssVar('--text-muted'),
            grid: cssVar('--chart-grid'),
            tooltipBg: cssVar('--chart-tooltip-bg'),
            tooltipBorder: cssVar('--chart-tooltip-border'),
            crosshair: cssVar('--chart-crosshair'),
        };
    }

    /**
     * Обновить цвета canvas-графика после смены темы.
     */
    _refreshThemeColors() {
        if (!this.chart) {
            return;
        }

        const colors = this._getThemeColors();
        const { options } = this.chart;

        options.plugins.legend.labels.color = colors.textPrimary;
        options.plugins.tooltip.backgroundColor = colors.tooltipBg;
        options.plugins.tooltip.titleColor = colors.textPrimary;
        options.plugins.tooltip.bodyColor = colors.textMuted;
        options.plugins.tooltip.borderColor = colors.tooltipBorder;
        options.scales.x.grid.color = colors.grid;
        options.scales.x.ticks.color = colors.textMuted;
        options.scales.y.grid.color = colors.grid;
        options.scales.y.ticks.color = colors.textMuted;

        this.chart.update('none');
    }
    
    /**
     * Уничтожить график
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        window.removeEventListener('psa:themechange', this._handleThemeChange);
        this.container.innerHTML = '';
    }
}

export default ChartComponent;
