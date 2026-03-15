/**
 * Trends Page — страница трендов с графиком сравнения профессий
 */

import { api } from '../api.js';
import { store } from '../store.js';
import { ChartComponent } from '../components/chart.js';
import { escapeHtml, formatShortDate, getChartColors } from '../utils/helpers.js';

export class TrendsPage {
    constructor(container) {
        this.container = container;
        this.professions = [];
        this.chart = null;
        this.timeRange = 'all'; // 'week', 'month', '3months', '6months', 'year', 'all'
        
        // Элементы
        this.elements = {};
    }
    
    /**
     * Инициализация страницы
     */
    async init() {
        this._render();
        this._cacheElements();
        this.chart = new ChartComponent(this.elements.chartContainer);
        this._attachListeners();
        await this._loadProfessions();
        this._renderProfessionList();
        this._loadSelectedProfessionsData();
        
        // Рендерим пустой график сразу
        this._renderEmptyChart();
        
        // Принудительно показываем контейнер графика
        this.elements.chartContainer.classList.remove('hidden');
    }
    
    /**
     * Рендер разметки
     */
    _render() {
        this.container.innerHTML = `
            <div class="chart-container" id="chart-container">
                <h2 class="chart-title">Динамика вакансий</h2>
                <canvas></canvas>
                <div class="chart-controls" id="chart-controls">
                    <button class="chart-btn" data-range="month">Месяц</button>
                    <button class="chart-btn" data-range="3months">3 мес</button>
                    <button class="chart-btn" data-range="6months">6 мес</button>
                    <button class="chart-btn" data-range="year">Год</button>
                    <button class="chart-btn active" data-range="all">Всё время</button>
                </div>
            </div>
            <div class="chart-limit-warning hidden" id="chart-limit-warning">
                Максимум 5 профессий для сравнения
            </div>
            <div class="profession-list" id="profession-list">
                <!-- Список профессий с чекбоксами -->
            </div>
            <div class="loading hidden" id="trends-loading">Загрузка данных...</div>
            <div class="error hidden" id="trends-error"></div>
            <div class="empty hidden" id="trends-empty">Выберите профессии для отображения трендов</div>
        `;
    }
    
    /**
     * Кэширование DOM элементов
     */
    _cacheElements() {
        this.elements = {
            professionList: this.container.querySelector('#profession-list'),
            chartContainer: this.container.querySelector('#chart-container'),
            chartControls: this.container.querySelector('#chart-controls'),
            limitWarning: this.container.querySelector('#chart-limit-warning'),
            loading: this.container.querySelector('#trends-loading'),
            error: this.container.querySelector('#trends-error'),
            empty: this.container.querySelector('#trends-empty'),
        };
    }
    
    /**
     * Обработчики событий
     */
    _attachListeners() {
        // Клик по элементу профессии
        this.elements.professionList.addEventListener('click', (e) => {
            const item = e.target.closest('.profession-item');
            if (!item) return;
            
            const id = item.dataset.id;
            const checkbox = item.querySelector('.profession-checkbox');
            
            // Переключаем чекбокс
            checkbox.checked = !checkbox.checked;
            
            // Обрабатываем выбор
            this._toggleProfession(id);
        });
        
        // Контролы времени
        this.elements.chartControls.addEventListener('click', (e) => {
            if (e.target.classList.contains('chart-btn')) {
                this._setTimeRange(e.target.dataset.range);
            }
        });
        
        // Подписка на изменения store
        store.subscribe((state, type) => {
            if (type === 'profession:select' || type === 'profession:deselect') {
                this._updateChart();
                this._renderProfessionList(); // Обновляем состояние чекбоксов
            }
        });
    }
    
    /**
     * Рендер пустого графика
     */
    _renderEmptyChart() {
        const today = new Date();
        const dates = [];
        const data = [];
        
        // Генерируем 7 пустых точек для визуализации
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            dates.push(date.toISOString());
            data.push({ x: date.toISOString(), y: null });
        }
        
        this.chart.render({
            datasets: [{
                label: 'Выберите профессии',
                data: data,
                borderDash: [5, 5],
                pointRadius: 0,
            }],
            labels: dates,
            options: {
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false },
                },
                scales: {
                    x: {
                        ticks: { display: false },
                        grid: { display: false },
                    },
                    y: {
                        ticks: { display: false },
                        grid: { display: false },
                    },
                },
            },
        });
    }
    
    /**
     * Загрузка профессий
     */
    async _loadProfessions() {
        this.professions = await api.getProfessions();
    }
    
    /**
     * Рендер списка профессий
     */
    _renderProfessionList() {
        this.elements.professionList.innerHTML = '';
        
        this.professions.forEach(profession => {
            const isSelected = store.isSelected(profession.id);
            
            const item = document.createElement('div');
            item.className = `profession-item ${isSelected ? 'selected' : ''}`;
            item.dataset.id = profession.id;
            
            item.innerHTML = `
                <input 
                    type="checkbox" 
                    class="profession-checkbox" 
                    ${isSelected ? 'checked' : ''}
                    ${store.getSelectedCount() >= store.getMaxSelected() && !isSelected ? 'disabled' : ''}
                >
                <span class="profession-name">${escapeHtml(profession.name)}</span>
            `;
            
            this.elements.professionList.appendChild(item);
        });
        
        this._updateCheckboxStates();
    }
    
    /**
     * Переключение профессии
     * @param {string} id
     */
    async _toggleProfession(id) {
        const profession = this.professions.find(p => p.id === id);
        if (!profession) return;
        
        const wasSelected = store.isSelected(id);
        const success = store.selectProfession(id);
        
        if (success || wasSelected) {
            // Обновляем UI
            this._renderProfessionList();
            
            // Загружаем данные если выбрали новую профессию
            if (!wasSelected) {
                await this._loadTrendData(id);
                this._updateChart(); // Сразу обновляем график
            }
        } else {
            // Показываем предупреждение о лимите
            this.elements.limitWarning.classList.remove('hidden');
            setTimeout(() => {
                this.elements.limitWarning.classList.add('hidden');
            }, 3000);
            
            // Сбрасываем чекбокс
            const item = this.elements.professionList.querySelector(`[data-id="${id}"]`);
            if (item) {
                item.querySelector('.profession-checkbox').checked = false;
            }
        }
    }
    
    /**
     * Загрузка данных тренда для профессии
     * @param {string} id
     */
    async _loadTrendData(id) {
        try {
            const trendData = await api.getProfessionTrend(id);
            store.setTrendData(id, trendData.data || trendData.trend || []);
        } catch (error) {
            console.error('[TrendsPage] Error loading trend:', error);
        }
    }
    
    /**
     * Загрузка данных для выбранных профессий
     */
    async _loadSelectedProfessionsData() {
        const selectedIds = store.getSelectedProfessions();
        
        if (selectedIds.length === 0) {
            this.elements.empty.classList.add('hidden');
            this.elements.chartContainer.classList.remove('hidden');
            this._renderEmptyChart();
            return;
        }
        
        this.elements.empty.classList.add('hidden');
        this.elements.chartContainer.classList.remove('hidden');
        
        // Показываем загрузку
        this.elements.loading.classList.remove('hidden');
        
        // Загружаем данные для всех выбранных профессий
        for (const id of selectedIds) {
            if (!store.getTrendData(id)) {
                await this._loadTrendData(id);
            }
        }
        
        this.elements.loading.classList.add('hidden');
        this._updateChart();
    }
    
    /**
     * Обновление графика
     */
    _updateChart() {
        const selectedIds = store.getSelectedProfessions();
        
        if (selectedIds.length === 0) {
            // Не скрываем график, просто рендерим пустой
            this._renderEmptyChart();
            return;
        }
        
        this.elements.empty.classList.add('hidden');
        this.elements.chartContainer.classList.remove('hidden');
        
        // Собираем данные для графика
        const datasets = [];
        const allDates = new Set();
        const colors = getChartColors(selectedIds.length);
        
        selectedIds.forEach((id, index) => {
            const profession = this.professions.find(p => p.id === id);
            const trendData = store.getTrendData(id) || [];
            
            trendData.forEach(point => {
                // Нормализуем дату к началу дня (без времени)
                const normalizedDate = new Date(point.date);
                normalizedDate.setHours(0, 0, 0, 0);
                allDates.add(normalizedDate.toISOString());
            });
            
            datasets.push({
                label: profession?.name || 'Unknown',
                data: trendData.map(point => {
                    // Нормализуем дату к началу дня
                    const normalizedDate = new Date(point.date);
                    normalizedDate.setHours(0, 0, 0, 0);
                    return {
                        x: normalizedDate.toISOString(),
                        y: point.vacancy_count,
                    };
                }),
                color: colors[index],
            });
        });
        
        // Сортируем даты
        const sortedDates = Array.from(allDates).sort();
        const filteredDates = this._filterDatesByRange(sortedDates);
        
        // Рендерим график
        this.chart.render({
            datasets,
            labels: filteredDates,
        });
    }
    
    /**
     * Фильтрация дат по выбранному диапазону
     * @param {string[]} dates
     * @returns {string[]}
     */
    _filterDatesByRange(dates) {
        if (dates.length === 0) return [];
        
        const now = new Date();
        const cutoffDates = {
            week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
            month: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
            '3months': new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
            '6months': new Date(now.getTime() - 180 * 24 * 60 * 60 * 1000),
            year: new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000),
            all: new Date(0),
        };
        
        const cutoff = cutoffDates[this.timeRange] || cutoffDates.all;
        
        return dates.filter(date => new Date(date) >= cutoff);
    }
    
    /**
     * Установка диапазона времени
     * @param {string} range
     */
    _setTimeRange(range) {
        this.timeRange = range;
        
        // Обновляем активную кнопку
        const buttons = this.elements.chartControls.querySelectorAll('.chart-btn');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.range === range);
        });
        
        this._updateChart();
    }
    
    /**
     * Обновление состояний чекбоксов
     */
    _updateCheckboxStates() {
        const selectedCount = store.getSelectedCount();
        const maxSelected = store.getMaxSelected();
        
        const checkboxes = this.elements.professionList.querySelectorAll('.profession-checkbox');
        checkboxes.forEach(checkbox => {
            const item = checkbox.closest('.profession-item');
            const isSelected = item.classList.contains('selected');
            
            if (!isSelected && selectedCount >= maxSelected) {
                checkbox.disabled = true;
            } else {
                checkbox.disabled = false;
            }
        });
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

export default TrendsPage;
