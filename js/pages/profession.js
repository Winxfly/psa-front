/**
 * Profession Page — страница профессии с графиком и таблицами
 */

import { api } from '../api.js';
import { ChartComponent } from '../components/chart.js';
import { escapeHtml, formatDate, formatShortDate } from '../utils/helpers.js';

export class ProfessionPage {
    constructor(container) {
        this.container = container;
        this.profession = null;
        this.chart = null;
        this.timeRange = 'all';
        this.filteredTrend = [];
        
        // Для выделения диапазона кликами
        this.clickPoints = [];
        
        // Элементы
        this.elements = {};
    }
    
    /**
     * Инициализация страницы
     * @param {string} id - ID профессии
     */
    async init(id) {
        // Сбрасываем состояние
        this.clickPoints = [];
        this.filteredTrend = [];
        
        this._render();
        this._cacheElements();
        this._attachListeners();
        await this._loadProfessionData(id);
    }
    
    /**
     * Рендер разметки
     */
    _render() {
        this.container.innerHTML = `
            <button class="back-button" id="back-button">← Назад к профессиям</button>
            
            <div class="profession-info hidden" id="profession-info">
                <!-- Информация о профессии -->
            </div>
            
            <div class="chart-container" id="chart-container">
                <div class="chart-header">
                    <h2 class="chart-title">Динамика вакансий</h2>
                    <div class="chart-header-center">
                        <div class="chart-range-info hidden" id="chart-range-info">
                            <span class="chart-range-dates" id="chart-range-dates"></span>
                            <span class="chart-range-change" id="chart-range-change"></span>
                        </div>
                    </div>
                    <div class="chart-header-right">
                        <div class="chart-change-indicator" id="chart-change-indicator">
                            <!-- Индикатор изменения -->
                        </div>
                    </div>
                </div>
                <canvas id="chart-canvas"></canvas>
                <div class="chart-controls" id="chart-controls">
                    <button class="chart-btn" data-range="month">Месяц</button>
                    <button class="chart-btn" data-range="3months">3 мес</button>
                    <button class="chart-btn" data-range="6months">6 мес</button>
                    <button class="chart-btn" data-range="year">Год</button>
                    <button class="chart-btn active" data-range="all">Всё время</button>
                </div>
            </div>
            
            <div class="loading hidden" id="profession-loading">Загрузка данных...</div>
            <div class="error hidden" id="profession-error"></div>
            
            <div class="tables-container hidden" id="tables-container">
                <div class="tables-wrapper">
                    <div class="table-section">
                        <h2 class="table-title">Формальные навыки</h2>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th class="col-num">#</th>
                                    <th class="col-skill">Навык</th>
                                    <th class="col-count">Упоминаний</th>
                                </tr>
                            </thead>
                            <tbody id="formal-skills-body">
                                <!-- Формальные навыки -->
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="table-section">
                        <h2 class="table-title">Извлечённые навыки</h2>
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th class="col-num">#</th>
                                    <th class="col-skill">Навык</th>
                                    <th class="col-count">Упоминаний</th>
                                </tr>
                            </thead>
                            <tbody id="extracted-skills-body">
                                <!-- Извлечённые навыки -->
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
    }
    
    /**
     * Кэширование DOM элементов
     */
    _cacheElements() {
        this.elements = {
            backButton: this.container.querySelector('#back-button'),
            professionInfo: this.container.querySelector('#profession-info'),
            chartContainer: this.container.querySelector('#chart-container'),
            chartControls: this.container.querySelector('#chart-controls'),
            chartCanvas: this.container.querySelector('#chart-canvas'),
            chartChangeIndicator: this.container.querySelector('#chart-change-indicator'),
            chartRangeInfo: this.container.querySelector('#chart-range-info'),
            chartRangeDates: this.container.querySelector('#chart-range-dates'),
            chartRangeChange: this.container.querySelector('#chart-range-change'),
            loading: this.container.querySelector('#profession-loading'),
            error: this.container.querySelector('#profession-error'),
            tablesContainer: this.container.querySelector('#tables-container'),
            formalSkillsBody: this.container.querySelector('#formal-skills-body'),
            extractedSkillsBody: this.container.querySelector('#extracted-skills-body'),
        };
    }
    
    /**
     * Обработчики событий
     */
    _attachListeners() {
        this.elements.backButton.addEventListener('click', (e) => {
            e.preventDefault();
            window.location.hash = '#/';
        });
        
        // Контролы времени
        this.elements.chartControls.addEventListener('click', (e) => {
            if (e.target.classList.contains('chart-btn')) {
                this._setTimeRange(e.target.dataset.range);
            }
        });
        
        // Клик по canvas для выделения диапазона
        const canvas = this.elements.chartCanvas;
        
        if (canvas) {
            canvas.addEventListener('click', (e) => {
                this._handleChartClick(e);
            });
        }
    }
    
    /**
     * Обработка клика по графику
     * @param {MouseEvent} e
     */
    _handleChartClick(e) {
        if (!this.chart || !this.filteredTrend.length) {
            return;
        }

        const rect = this.elements.chartCanvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        
        // Находим ближайшую точку по X координате
        const meta = this.chart.chart.getDatasetMeta(0);
        let closestPoint = null;
        let closestDistance = Infinity;
        
        meta.data.forEach((element, index) => {
            const pointX = element.x;
            const distance = Math.abs(pointX - clickX);
            
            if (distance < closestDistance) {
                closestDistance = distance;
                closestPoint = this.filteredTrend[index];
            }
        });

        if (!closestPoint) return;

        const clickedPoint = closestPoint;

        // Логика кликов:
        // 0 точек -> 1 точка (первый клик)
        // 1 точка -> 2 точки (второй клик, показываем выделение)
        // 2 точки -> сброс в 0 (третий клик)
        // Клик по той же точке -> сброс
        if (this.clickPoints.length === 2) {
            // Третий клик — полный сброс
            this.clickPoints = [];
        } else if (this.clickPoints.length === 1) {
            // Проверяем, не та ли это же точка
            const exists = this.clickPoints.find(p => p.date === clickedPoint.date);
            if (exists) {
                // Клик по той же точке — сброс
                this.clickPoints = [];
            } else {
                // Вторая точка
                this.clickPoints.push(clickedPoint);
                // Сортируем по дате
                this.clickPoints.sort((a, b) => new Date(a.date) - new Date(b.date));
            }
        } else {
            // Первый клик
            this.clickPoints = [clickedPoint];
        }

        // Обновляем график без перерисовки
        if (this.chart && this.chart.chart) {
            this.chart.chart.update('none');
        }

        // Показываем/скрываем данные
        if (this.clickPoints.length === 2) {
            this._showRangeInfo();
        } else {
            this._hideRangeInfo();
        }
    }
    
    /**
     * Показать информацию о диапазоне
     */
    _showRangeInfo() {
        const [start, end] = this.clickPoints;
        const startDate = this._formatDateRange(start.date);
        const endDate = this._formatDateRange(end.date);

        this.elements.chartRangeDates.textContent = `${startDate} — ${endDate}`;

        const change = end.vacancy_count - start.vacancy_count;
        const percent = start.vacancy_count !== 0 
            ? ((change / start.vacancy_count) * 100).toFixed(2) 
            : 0;

        const sign = change >= 0 ? '+' : '';
        const colorClass = change >= 0 ? 'positive' : 'negative';

        this.elements.chartRangeChange.innerHTML = `
            <span class="${colorClass}">${sign}${change} (${sign}${percent}%)</span>
        `;

        this.elements.chartRangeInfo.classList.remove('hidden');
    }
    
    /**
     * Скрыть информацию о диапазоне
     */
    _hideRangeInfo() {
        this.elements.chartRangeInfo.classList.add('hidden');
    }
    
    /**
     * Форматирование даты для диапазона
     * @param {string} dateStr
     * @returns {string}
     */
    _formatDateRange(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
        });
    }
    
    /**
     * Расчёт изменения для индикатора
     * @returns {Object}
     */
    _calculateChange() {
        if (!this.filteredTrend || this.filteredTrend.length < 2) {
            return null;
        }
        
        const start = this.filteredTrend[0];
        const end = this.filteredTrend[this.filteredTrend.length - 1];
        
        const change = end.vacancy_count - start.vacancy_count;
        const percent = start.vacancy_count !== 0 
            ? ((change / start.vacancy_count) * 100).toFixed(2) 
            : 0;
        
        return { change, percent };
    }
    
    /**
     * Отобразить индикатор изменения
     */
    _renderChangeIndicator() {
        const data = this._calculateChange();

        if (!data) {
            this.elements.chartChangeIndicator.innerHTML = '';
            return;
        }

        const sign = data.change >= 0 ? '+' : '';
        const percentSign = data.change >= 0 ? '+' : '';
        const colorClass = data.change >= 0 ? 'positive' : 'negative';

        this.elements.chartChangeIndicator.innerHTML = `
            <span class="chart-change ${colorClass}">
                ${sign}${data.change} (${percentSign}${data.percent}%)
            </span>
        `;
    }
    
    /**
     * Установка диапазона времени
     * @param {string} range
     */
    _setTimeRange(range) {
        this.timeRange = range;
        this.clickPoints = []; // Сбрасываем точки при смене периода
        this._hideRangeInfo();
        
        // Обновляем активную кнопку
        const buttons = this.elements.chartControls.querySelectorAll('.chart-btn');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.range === range);
        });
        
        this._renderChart();
    }
    
    /**
     * Загрузка данных профессии
     * @param {string} id
     */
    async _loadProfessionData(id) {
        this._showLoading();
        
        try {
            // Загружаем данные с трендом
            this.profession = await api.getProfessionLatest(id, true);
            this._renderProfessionInfo();
            this._renderChart();
            this._renderTables();
            this._showContent();
        } catch (error) {
            this._showError(error.message);
        }
    }
    
    /**
     * Рендер информации о профессии
     */
    _renderProfessionInfo() {
        const scrapedDate = formatDate(this.profession.scraped_at);
        
        this.elements.professionInfo.innerHTML = `
            <h2 class="profession-info-title">${escapeHtml(this.profession.profession_name)}</h2>
            <div class="profession-meta">
                <div class="profession-meta-item">
                    <span class="profession-meta-label">Дата сбора данных</span>
                    <span class="profession-meta-value">${scrapedDate}</span>
                </div>
                <div class="profession-meta-item">
                    <span class="profession-meta-label">Найдено вакансий</span>
                    <span class="profession-meta-value">${this.profession.vacancy_count}</span>
                </div>
            </div>
        `;
    }
    
    /**
     * Рендер графика
     */
    _renderChart() {
        const trend = this.profession.trend || this.profession.data || [];
        
        if (trend.length === 0) {
            this.elements.chartContainer.classList.add('hidden');
            return;
        }
        
        this.elements.chartContainer.classList.remove('hidden');
        
        // Фильтруем данные по периоду
        this.filteredTrend = this._filterTrendByRange(trend);
        
        // Инициализируем график если нужно
        if (!this.chart) {
            this.chart = new ChartComponent(this.elements.chartContainer.querySelector('canvas').parentElement);
        }
        
        const labels = this.filteredTrend.map(point => point.date);
        const data = this.filteredTrend.map(point => point.vacancy_count);
        
        // Создаём плагин для выделения
        this.rangeHighlightPlugin = this._createRangeHighlightPlugin();
        
        this.chart.render({
            datasets: [{
                label: this.profession.profession_name,
                data: data.map((value, index) => ({
                    x: labels[index],
                    y: value,
                })),
            }],
            labels: labels,
            plugins: [this.rangeHighlightPlugin],
            options: {
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                const value = context.parsed.y;
                                return `${value} вакансий`;
                            },
                            title: (items) => {
                                const label = items[0]?.label;
                                return label ? formatShortDate(label) : '';
                            },
                        },
                    },
                },
            },
        });
        
        // Рендерим индикатор изменения
        this._renderChangeIndicator();
    }
    
    /**
     * Создать плагин для выделения диапазона
     * @returns {Object}
     */
    _createRangeHighlightPlugin() {
        const self = this;
        
        return {
            id: 'rangeHighlight',
            afterDatasetsDraw: (chart) => {
                // Проверяем что это наш график (с filteredTrend)
                if (!self.filteredTrend || self.clickPoints.length !== 2) return;
                
                const ctx = chart.ctx;
                const chartArea = chart.chartArea;
                
                // Находим индексы точек
                const startIndex = self.filteredTrend.findIndex(p => p.date === self.clickPoints[0].date);
                const endIndex = self.filteredTrend.findIndex(p => p.date === self.clickPoints[1].date);
                
                if (startIndex === -1 || endIndex === -1) return;
                
                // Получаем X координаты
                const meta = chart.getDatasetMeta(0);
                if (!meta.data[startIndex] || !meta.data[endIndex]) return;
                
                const startX = meta.data[startIndex].x;
                const endX = meta.data[endIndex].x;
                const startY = meta.data[startIndex].y;
                const endY = meta.data[endIndex].y;
                
                // Рисуем закрашенную область
                ctx.save();
                ctx.fillStyle = 'rgba(122, 162, 247, 0.1)';
                ctx.fillRect(startX, chartArea.top, endX - startX, chartArea.bottom - chartArea.top);
                
                // Рисуем вертикальные линии
                ctx.strokeStyle = '#7aa2f7';
                ctx.lineWidth = 2;
                ctx.setLineDash([5, 5]);
                
                ctx.beginPath();
                ctx.moveTo(startX, chartArea.top);
                ctx.lineTo(startX, chartArea.bottom);
                ctx.stroke();
                
                ctx.beginPath();
                ctx.moveTo(endX, chartArea.top);
                ctx.lineTo(endX, chartArea.bottom);
                ctx.stroke();
                
                // Рисуем текст с датой и значением для первой точки (справа от линии)
                const startDate = self._formatDateRange(self.clickPoints[0].date);
                const startValue = self.clickPoints[0].vacancy_count;
                
                ctx.fillStyle = '#e0e0e0';
                ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'bottom';
                
                const startXText = startX + 5;
                const startXTextY = startY - 10;
                
                ctx.fillText(startDate, startXText, startXTextY);
                ctx.fillText(startValue + ' вак.', startXText, startXTextY - 14);
                
                // Рисуем текст с датой и значением для второй точки (справа от линии)
                const endDate = self._formatDateRange(self.clickPoints[1].date);
                const endValue = self.clickPoints[1].vacancy_count;
                
                const endXText = endX + 5;
                const endXTextY = endY - 10;
                
                ctx.fillText(endDate, endXText, endXTextY);
                ctx.fillText(endValue + ' вак.', endXText, endXTextY - 14);
                
                ctx.restore();
            },
        };
    }
    
    /**
     * Фильтрация тренда по периоду
     * @param {Array} trend
     * @returns {Array}
     */
    _filterTrendByRange(trend) {
        if (this.timeRange === 'all') {
            return trend;
        }
        
        const now = new Date();
        const cutoffDates = {
            month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            '3months': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
            '6months': new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
            year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
        };
        
        const cutoff = cutoffDates[this.timeRange];
        if (!cutoff) return trend;
        
        return trend.filter(point => new Date(point.date) >= cutoff);
    }
    
    /**
     * Рендер таблиц
     */
    _renderTables() {
        // Формальные навыки
        this.elements.formalSkillsBody.innerHTML = '';
        if (this.profession.formal_skills && this.profession.formal_skills.length > 0) {
            this.profession.formal_skills.forEach((skill, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="col-num">${index + 1}</td>
                    <td class="col-skill">${escapeHtml(skill.skill)}</td>
                    <td class="col-count">${skill.count}</td>
                `;
                this.elements.formalSkillsBody.appendChild(row);
            });
        } else {
            this.elements.formalSkillsBody.innerHTML = `
                <tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Нет данных</td></tr>
            `;
        }
        
        // Извлечённые навыки
        this.elements.extractedSkillsBody.innerHTML = '';
        if (this.profession.extracted_skills && this.profession.extracted_skills.length > 0) {
            this.profession.extracted_skills.forEach((skill, index) => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td class="col-num">${index + 1}</td>
                    <td class="col-skill">${escapeHtml(skill.skill)}</td>
                    <td class="col-count">${skill.count}</td>
                `;
                this.elements.extractedSkillsBody.appendChild(row);
            });
        } else {
            this.elements.extractedSkillsBody.innerHTML = `
                <tr><td colspan="3" style="text-align: center; color: var(--text-muted);">Нет данных</td></tr>
            `;
        }
    }
    
    /**
     * Показать загрузку
     */
    _showLoading() {
        this.elements.loading.classList.remove('hidden');
        this.elements.professionInfo.classList.add('hidden');
        this.elements.chartContainer.classList.add('hidden');
        this.elements.tablesContainer.classList.add('hidden');
        this.elements.error.classList.add('hidden');
    }
    
    /**
     * Показать контент
     */
    _showContent() {
        this.elements.loading.classList.add('hidden');
        this.elements.professionInfo.classList.remove('hidden');
        this.elements.tablesContainer.classList.remove('hidden');
    }
    
    /**
     * Показать ошибку
     * @param {string} message
     */
    _showError(message) {
        this.elements.error.textContent = message;
        this.elements.error.classList.remove('hidden');
        this.elements.loading.classList.add('hidden');
    }
    
    /**
     * Очистка при уничтожении
     */
    destroy() {
        if (this.chart) {
            this.chart.destroy();
        }
    }
}

export default ProfessionPage;
