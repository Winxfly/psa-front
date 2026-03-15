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
        
        // Элементы
        this.elements = {};
    }
    
    /**
     * Инициализация страницы
     * @param {string} id - ID профессии
     */
    async init(id) {
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
            
            <div class="chart-container hidden" id="chart-container">
                <h2 class="chart-title">Динамика вакансий</h2>
                <canvas></canvas>
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
    }
    
    /**
     * Загрузка данных профессии
     * @param {string} id
     */
    async _loadProfessionData(id) {
        console.log('[ProfessionPage] Loading profession:', id);
        this._showLoading();
        
        try {
            // Загружаем данные с трендом
            this.profession = await api.getProfessionLatest(id, true);
            console.log('[ProfessionPage] Loaded:', this.profession);
            this._renderProfessionInfo();
            this._renderChart();
            this._renderTables();
            this._showContent();
        } catch (error) {
            console.error('[ProfessionPage] Error:', error);
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
        
        // Инициализируем график если нужно
        if (!this.chart) {
            this.chart = new ChartComponent(this.elements.chartContainer.querySelector('canvas').parentElement);
        }
        
        const labels = trend.map(point => point.date);
        const data = trend.map(point => point.vacancy_count);
        
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
                            title: (items) => {
                                const label = items[0]?.label;
                                return label ? formatShortDate(label) : '';
                            },
                        },
                    },
                },
            },
        });
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
