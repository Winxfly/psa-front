/**
 * Profession Page — страница профессии с графиком и таблицами
 */

import { api } from '../api.js';
import { ChartComponent } from '../components/chart.js';
import { store } from '../store.js';
import { escapeHtml, formatDate, formatShortDate, isShortUuid, isUuid } from '../utils/helpers.js';

const MAX_SKILL_ROWS = 200;

export class ProfessionPage {
    constructor(container) {
        this.container = container;
        this.profession = null;
        this.chart = null;
        this.timeRange = '3months';
        this.filteredTrend = [];
        
        // Для выделения диапазона кликами
        this.clickPoints = [];
        
        // Элементы
        this.elements = {};
    }
    
    /**
     * Инициализация страницы
     * @param {string} id - ID профессии или короткий публичный ID
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
                    <div class="chart-header-top">
                        <h2 class="chart-title">Динамика</h2>
                        <div class="chart-range-info hidden" id="chart-range-info">
                            <span class="chart-range-dates" id="chart-range-dates"></span>
                            <span class="chart-range-change" id="chart-range-change"></span>
                        </div>
                        <div class="chart-change-indicator" id="chart-change-indicator">
                            <!-- Индикатор изменения -->
                        </div>
                    </div>
                </div>
                <div class="chart-viewport">
                    <canvas id="chart-canvas"></canvas>
                </div>
                <div class="chart-controls" id="chart-controls">
                    <button class="chart-btn" data-range="month">1М</button>
                    <button class="chart-btn active" data-range="3months">3М</button>
                    <button class="chart-btn" data-range="6months">6М</button>
                    <button class="chart-btn" data-range="year">1Г</button>
                    <button class="chart-btn" data-range="all">Всё</button>
                </div>
            </div>
            
            <div class="loading hidden" id="profession-loading">Загрузка данных...</div>
            <div class="error hidden" id="profession-error"></div>
            
            <div class="tables-container hidden" id="tables-container">
                <div class="tables-wrapper">
                    <div class="table-section collapsed" data-collapsible-table>
                        <button class="table-title table-toggle" type="button" aria-expanded="false">
                            <span>Ключевые навыки</span>
                            <span class="table-toggle-icon" aria-hidden="true">⌄</span>
                        </button>
                        <div class="table-content">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th class="col-num">#</th>
                                        <th class="col-skill">Навык</th>
                                        <th class="col-count">Упоминаний</th>
                                    </tr>
                                </thead>
                                <tbody id="formal-skills-body">
                                    <!-- Ключевые навыки -->
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    <div class="table-section collapsed" data-collapsible-table>
                        <button class="table-title table-toggle" type="button" aria-expanded="false">
                            <span>Навыки из описания вакансий</span>
                            <span class="table-toggle-icon" aria-hidden="true">⌄</span>
                        </button>
                        <div class="table-content">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th class="col-num">#</th>
                                        <th class="col-skill">Навык</th>
                                        <th class="col-count">Упоминаний</th>
                                    </tr>
                                </thead>
                                <tbody id="extracted-skills-body">
                                    <!-- Навыки из описания вакансий -->
                                </tbody>
                            </table>
                        </div>
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

        const shouldCollapseTables = window.matchMedia('(max-width: 900px), (max-height: 500px)').matches;

        this.container.querySelectorAll('[data-collapsible-table] .table-toggle').forEach(button => {
            const section = button.closest('[data-collapsible-table]');

            if (!shouldCollapseTables) {
                section.classList.remove('collapsed');
                button.setAttribute('aria-expanded', 'true');
            }

            button.addEventListener('click', () => {
                const isCollapsed = section.classList.toggle('collapsed');
                button.setAttribute('aria-expanded', String(!isCollapsed));
            });
        });
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
        } else if (this.clickPoints.length === 1) {
            this._showSinglePointInfo();
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

        this.elements.chartRangeDates.textContent = `${startDate} (${start.vacancy_count} вак.) — ${endDate} (${end.vacancy_count} вак.)`;

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
     * Показать информацию для одной точки
     */
    _showSinglePointInfo() {
        const point = this.clickPoints[0];
        const date = this._formatDateRange(point.date);

        this.elements.chartRangeDates.textContent = `${date} (${point.vacancy_count} вак.)`;
        this.elements.chartRangeChange.textContent = '';

        this.elements.chartRangeInfo.classList.remove('hidden');
    }

    /**
     * Скрыть информацию о диапазоне
     */
    _hideRangeInfo() {
        this.elements.chartRangeInfo.classList.add('hidden');
        this.elements.chartRangeDates.textContent = '';
        this.elements.chartRangeChange.textContent = '';
    }
    
    /**
     * Форматирование даты для диапазона
     * @param {string} dateStr
     * @returns {string}
     */
    _formatDateRange(dateStr) {
        return formatShortDate(dateStr);
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
            const professionId = await this._resolveProfessionId(id);
            // Загружаем данные с трендом
            this.profession = await api.getProfessionLatest(professionId, true);
            this._renderProfessionInfo();
            this._renderChart();
            this._renderTables();
            this._showContent();
        } catch (error) {
            this._showError(error.message);
        }
    }

    /**
     * Разрешить полный UUID профессии из route параметра.
     * @param {string} routeId
     * @returns {Promise<string>}
     */
    async _resolveProfessionId(routeId) {
        if (isUuid(routeId)) {
            return routeId;
        }

        if (!isShortUuid(routeId)) {
            throw new Error('Некорректная ссылка на профессию');
        }

        const professions = await api.getProfessions();
        store.setProfessions(professions);
        const matches = professions.filter(profession => {
            return profession.id.replaceAll('-', '').startsWith(routeId);
        });

        if (matches.length === 1) {
            return matches[0].id;
        }

        if (matches.length > 1) {
            throw new Error('Неоднозначная ссылка на профессию');
        }

        throw new Error('Профессия не найдена');
    }
    
    /**
     * Рендер информации о профессии
     */
    _renderProfessionInfo() {
        const scrapedDate = formatDate(this.profession.scraped_at);
        const hhVacanciesUrl = this._buildHHVacanciesUrl();
        
        this.elements.professionInfo.innerHTML = `
            <h2 class="profession-info-title">${escapeHtml(this.profession.profession_name)}</h2>
            <div class="profession-meta">
                <div class="profession-meta-item">
                    <span class="profession-meta-label">Последний сбор данных</span>
                    <span class="profession-meta-value">${scrapedDate}</span>
                </div>
                <div class="profession-meta-item">
                    <span class="profession-meta-label">Найдено вакансий</span>
                    <span class="profession-meta-value">${this.profession.vacancy_count}</span>
                </div>
                ${hhVacanciesUrl ? `
                    <div class="profession-meta-item profession-meta-action">
                        <a class="btn btn-primary profession-vacancies-link" href="${hhVacanciesUrl}" target="_blank" rel="noopener noreferrer">
                            Посмотреть вакансии
                        </a>
                    </div>
                ` : ''}
            </div>
        `;
    }

    /**
     * Построить ссылку на HH по query профессии, если query доступен.
     * @returns {string}
     */
    _buildHHVacanciesUrl() {
        const vacancyQuery = this._getVacancyQuery();

        if (!vacancyQuery) {
            return '';
        }

        const url = new URL('https://hh.ru/search/vacancy');
        url.searchParams.set('text', `name:(${vacancyQuery})`);
        url.searchParams.set('area', '113');
        url.searchParams.set('ored_clusters', 'true');
        url.searchParams.set('enable_snippets', 'true');

        return url.toString();
    }

    /**
     * Получить HH query из latest response или fallback-списка профессий.
     * @returns {string}
     */
    _getVacancyQuery() {
        if (this.profession.vacancy_query) {
            return this.profession.vacancy_query;
        }

        const profession = store.getProfessions().find(item => {
            return item.id === this.profession.profession_id || item.name === this.profession.profession_name;
        });

        return profession?.vacancy_query || '';
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
            this.chart = new ChartComponent(this.elements.chartContainer.querySelector('.chart-viewport'));
        }
        
        const labels = this.filteredTrend.map(point => point.date);
        const data = this.filteredTrend.map(point => point.vacancy_count);
        
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
            plugins: [this.rangeHighlightPlugin],
        });

        // Рендерим индикатор изменения
        this._renderChangeIndicator();
        
        // Скрываем блок диапазона при инициализации
        this._hideRangeInfo();
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
                if (!self.filteredTrend || self.clickPoints.length === 0) return;

                const ctx = chart.ctx;
                const chartArea = chart.chartArea;
                const styles = getComputedStyle(document.documentElement);
                const crosshairColor = styles.getPropertyValue('--chart-crosshair').trim();
                const positiveRangeColor = styles.getPropertyValue('--range-positive-bg').trim();
                const negativeRangeColor = styles.getPropertyValue('--range-negative-bg').trim();

                // Рисуем линии и закрашенную область для каждой точки
                self.clickPoints.forEach((clickPoint) => {
                    const pointIndex = self.filteredTrend.findIndex(p => p.date === clickPoint.date);
                    if (pointIndex === -1) return;

                    const meta = chart.getDatasetMeta(0);
                    if (!meta.data[pointIndex]) return;

                    const pointX = meta.data[pointIndex].x;

                    // Рисуем вертикальную линию
                    ctx.save();
                    ctx.strokeStyle = crosshairColor;
                    ctx.lineWidth = 2;
                    ctx.setLineDash([5, 5]);

                    ctx.beginPath();
                    ctx.moveTo(pointX, chartArea.top);
                    ctx.lineTo(pointX, chartArea.bottom);
                    ctx.stroke();
                    ctx.restore();
                });

                // Рисуем закрашенную область между точками
                if (self.clickPoints.length === 2) {
                    const startIndex = self.filteredTrend.findIndex(p => p.date === self.clickPoints[0].date);
                    const endIndex = self.filteredTrend.findIndex(p => p.date === self.clickPoints[1].date);

                    if (startIndex !== -1 && endIndex !== -1) {
                        const meta = chart.getDatasetMeta(0);
                        if (meta.data[startIndex] && meta.data[endIndex]) {
                            const startX = meta.data[startIndex].x;
                            const endX = meta.data[endIndex].x;

                            // Определяем цвет по изменению
                            const startValue = self.clickPoints[0].vacancy_count;
                            const endValue = self.clickPoints[1].vacancy_count;
                            const isPositive = endValue >= startValue;
                            const color = isPositive ? positiveRangeColor : negativeRangeColor;

                            ctx.save();
                            ctx.fillStyle = color;
                            ctx.fillRect(startX, chartArea.top, endX - startX, chartArea.bottom - chartArea.top);
                            ctx.restore();
                        }
                    }
                }
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
        this._renderSkillsTable(this.elements.formalSkillsBody, this.profession.formal_skills);
        this._renderSkillsTable(this.elements.extractedSkillsBody, this.profession.extracted_skills);
    }

    /**
     * Рендер таблицы навыков с ограничением по количеству строк
     * @param {HTMLElement} tbody
     * @param {Array} skills
     */
    _renderSkillsTable(tbody, skills) {
        tbody.innerHTML = '';

        if (!skills || skills.length === 0) {
            tbody.innerHTML = `
                <tr><td colspan="3" class="table-empty">Нет данных</td></tr>
            `;
            return;
        }

        skills.slice(0, MAX_SKILL_ROWS).forEach((skill, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td class="col-num">${index + 1}</td>
                <td class="col-skill">${escapeHtml(skill.skill)}</td>
                <td class="col-count">${skill.count}</td>
            `;
            tbody.appendChild(row);
        });

        if (skills.length > MAX_SKILL_ROWS) {
            const row = document.createElement('tr');
            row.className = 'table-limit-row';
            row.innerHTML = `
                <td colspan="3" class="table-limit-note">
                    Показаны первые ${MAX_SKILL_ROWS} из ${skills.length}
                </td>
            `;
            tbody.appendChild(row);
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
