/**
 * Home Page — главная страница со списком профессий
 */

import { api } from '../api.js';
import { store } from '../store.js';
import { escapeHtml, debounce } from '../utils/helpers.js';

export class HomePage {
    constructor(container) {
        this.container = container;
        this.professions = [];
        this.filteredProfessions = [];
        
        // Элементы
        this.elements = {};
    }
    
    /**
     * Инициализация страницы
     */
    async init() {
        this._render();
        this._cacheElements();
        this._attachListeners();
        await this._loadProfessions();
    }
    
    /**
     * Рендер разметки
     */
    _render() {
        this.container.innerHTML = `
            <div class="search-container">
                <input 
                    type="text" 
                    class="search-input" 
                    placeholder="Поиск профессии..."
                    aria-label="Поиск профессии"
                    autocomplete="off"
                >
            </div>
            <div class="professions-grid" id="professions-list">
                <!-- Профессии будут загружены сюда -->
            </div>
            <div class="loading hidden" id="professions-loading">Загрузка профессий...</div>
            <div class="error hidden" id="professions-error"></div>
            <div class="empty hidden" id="professions-empty">Профессии не найдены</div>
        `;
    }
    
    /**
     * Кэширование DOM элементов
     */
    _cacheElements() {
        this.elements = {
            searchInput: this.container.querySelector('.search-input'),
            professionsList: this.container.querySelector('#professions-list'),
            loading: this.container.querySelector('#professions-loading'),
            error: this.container.querySelector('#professions-error'),
            empty: this.container.querySelector('#professions-empty'),
        };
    }
    
    /**
     * Обработчики событий
     */
    _attachListeners() {
        // Поиск с debounce
        const handleSearch = debounce((query) => {
            this._filterProfessions(query);
        }, 200);
        
        this.elements.searchInput.addEventListener('input', (e) => {
            handleSearch(e.target.value.toLowerCase().trim());
        });
    }
    
    /**
     * Загрузка профессий
     */
    async _loadProfessions() {
        this._showLoading();
        
        try {
            console.log('[HomePage] Loading professions...');
            this.professions = await api.getProfessions();
            console.log('[HomePage] Loaded professions:', this.professions.length);
            this.filteredProfessions = [...this.professions];
            store.setProfessions(this.professions);
            this._renderProfessions();
        } catch (error) {
            console.error('[HomePage] Error:', error);
            this._showError(error.message);
        }
    }
    
    /**
     * Фильтрация профессий
     * @param {string} query
     */
    _filterProfessions(query) {
        if (!query) {
            this.filteredProfessions = [...this.professions];
        } else {
            this.filteredProfessions = this.professions.filter(p =>
                p.name.toLowerCase().includes(query)
            );
        }
        this._renderProfessions();
    }
    
    /**
     * Рендер списка профессий
     */
    _renderProfessions() {
        console.log('[HomePage] _renderProfessions, count:', this.filteredProfessions.length);
        console.log('[HomePage] professionsList element:', this.elements.professionsList);
        
        if (!this.elements.professionsList) {
            console.error('[HomePage] professionsList element not found!');
            return;
        }
        
        this.elements.professionsList.innerHTML = '';
        this.elements.professionsList.classList.remove('hidden');
        
        if (this.filteredProfessions.length === 0) {
            this.elements.empty.classList.remove('hidden');
            this.elements.loading.classList.add('hidden');
            console.log('[HomePage] No professions, showing empty');
            return;
        }
        
        this.elements.empty.classList.add('hidden');
        this.elements.loading.classList.add('hidden');
        
        this.filteredProfessions.forEach((profession, index) => {
            const card = document.createElement('a');
            card.className = 'profession-card';
            card.href = `#/profession/${profession.id}`;
            
            const title = document.createElement('span');
            title.className = 'profession-card-title';
            title.textContent = profession.name;
            
            card.appendChild(title);
            this.elements.professionsList.appendChild(card);
        });
        
        console.log('[HomePage] Rendered cards:', this.elements.professionsList.children.length);
    }
    
    /**
     * Показать загрузку
     */
    _showLoading() {
        this.elements.loading.classList.remove('hidden');
        this.elements.professionsList.classList.add('hidden');
        this.elements.error.classList.add('hidden');
        this.elements.empty.classList.add('hidden');
    }
    
    /**
     * Показать ошибку
     * @param {string} message
     */
    _showError(message) {
        this.elements.error.textContent = message;
        this.elements.error.classList.remove('hidden');
        this.elements.loading.classList.add('hidden');
        this.elements.professionsList.classList.add('hidden');
    }
    
    /**
     * Очистка при уничтожении
     */
    destroy() {
        // Очистка при необходимости
    }
}

export default HomePage;
