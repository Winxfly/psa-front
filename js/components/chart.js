/**
 * Chart Component — обёртка над Chart.js
 */

import { getChartColors, formatShortDate } from '../utils/helpers.js';

export class ChartComponent {
    constructor(container, options = {}) {
        this.container = container;
        this.chart = null;
        this.options = {
            type: 'line',
            height: 400,
            ...options
        };
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
        
        const chartColors = getChartColors(datasets.length);
        
        const chartDatasets = datasets.map((dataset, index) => ({
            label: dataset.label,
            data: dataset.data,
            borderColor: dataset.color || chartColors[index % chartColors.length],
            backgroundColor: dataset.color || chartColors[index % chartColors.length],
            borderWidth: 2,
            pointRadius: 0,
            pointHoverRadius: 4,
            fill: false,
            tension: 0.3,
        }));
        
        // Уничтожить старый график
        if (this.chart) {
            this.chart.destroy();
        }
        
        // Плагин для вертикальной линии (crosshair)
        const crosshairPlugin = {
            id: 'crosshair',
            afterDraw: (chart) => {
                if (chart.tooltip._active && chart.tooltip._active.length) {
                    const ctx = chart.ctx;
                    const activePoint = chart.tooltip._active[0];
                    const { x } = activePoint.element;
                    const { top, bottom } = chart.chartArea;

                    ctx.save();
                    ctx.beginPath();
                    ctx.moveTo(x, top);
                    ctx.lineTo(x, bottom);
                    ctx.lineWidth = 2;
                    ctx.strokeStyle = '#7aa2f7';
                    ctx.setLineDash([5, 5]);
                    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
                    ctx.shadowBlur = 4;
                    ctx.stroke();
                    ctx.restore();
                }
            },
        };
        
        // Создать новый график
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: chartDatasets,
            },
            plugins: plugins,
            options: {
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
                            color: '#e0e0e0',
                            usePointStyle: true,
                        },
                    },
                    tooltip: {
                        backgroundColor: 'rgba(33, 34, 52, 0.95)',
                        titleColor: '#e0e0e0',
                        bodyColor: '#a0a0b0',
                        borderColor: '#3d405f',
                        borderWidth: 1,
                        padding: 12,
                        displayColors: true,
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed.y;
                                return `${context.dataset.label}: ${value} вакансий`;
                            },
                            title: (items) => {
                                const label = items[0]?.label;
                                return label ? formatShortDate(label) : '';
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        grid: {
                            color: '#3d405f',
                        },
                        ticks: {
                            color: '#a0a0b0',
                            maxTicksLimit: 10,
                            maxRotation: 0,
                            callback: (value, index) => {
                                const label = labels[index];
                                return label ? formatShortDate(label) : '';
                            },
                        },
                    },
                    y: {
                        grid: {
                            color: '#3d405f',
                        },
                        ticks: {
                            color: '#a0a0b0',
                            precision: 0,
                        },
                        beginAtZero: false,
                    },
                },
                ...options,
            },
            plugins: [crosshairPlugin],
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
     * Уничтожить график
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
            this.chart = null;
        }
        this.container.innerHTML = '';
    }
}

export default ChartComponent;
