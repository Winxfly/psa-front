/**
 * Store — глобальное состояние приложения
 * Использует паттерн Observer для реактивности
 */

const STORAGE_KEY = 'psa_selected_professions';

class Store {
    constructor() {
        this.state = {
            professions: [],
            selectedProfessions: this._loadSelectedProfessions(),
            currentProfession: null,
            trendData: new Map(), // Кэш трендов по ID
        };
        
        this.listeners = new Set();
        this.maxSelectedProfessions = 5;
    }
    
    /**
     * Загрузка выбранных профессий из localStorage
     * @returns {string[]}
     */
    _loadSelectedProfessions() {
        // Сбрасываем выбранные профессии при каждой загрузке
        return [];
        /*
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            return stored ? JSON.parse(stored) : [];
        } catch (e) {
            console.error('[Store] Error loading selected professions:', e);
            return [];
        }
        */
    }
    
    /**
     * Сохранение выбранных профессий в localStorage
     */
    _saveSelectedProfessions() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state.selectedProfessions));
        } catch (e) {
            console.error('[Store] Error saving selected professions:', e);
        }
    }
    
    /**
     * Подписка на изменения состояния
     * @param {Function} listener
     * @returns {Function} - функция отписки
     */
    subscribe(listener) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }
    
    /**
     * Уведомление подписчиков
     * @param {string} type - Тип изменения
     */
    notify(type) {
        this.listeners.forEach(listener => listener(this.state, type));
    }
    
    /**
     * Установить список профессий
     * @param {Array} professions
     */
    setProfessions(professions) {
        this.state.professions = professions;
        this.notify('professions:set');
    }
    
    /**
     * Получить список профессий
     * @returns {Array}
     */
    getProfessions() {
        return this.state.professions;
    }
    
    /**
     * Выбрать профессию для трендов
     * @param {string} id - ID профессии
     * @returns {boolean} - Успешно ли выбрано
     */
    selectProfession(id) {
        const index = this.state.selectedProfessions.indexOf(id);
        
        // Если уже выбрана — снимаем выделение
        if (index !== -1) {
            this.state.selectedProfessions.splice(index, 1);
            this._saveSelectedProfessions();
            this.notify('profession:deselect');
            return false;
        }
        
        // Если достигнут лимит
        if (this.state.selectedProfessions.length >= this.maxSelectedProfessions) {
            console.warn('[Store] Max selected professions reached:', this.maxSelectedProfessions);
            return false;
        }
        
        // Добавляем профессию
        this.state.selectedProfessions.push(id);
        this._saveSelectedProfessions();
        this.notify('profession:select');
        return true;
    }
    
    /**
     * Выбрана ли профессия
     * @param {string} id
     * @returns {boolean}
     */
    isSelected(id) {
        return this.state.selectedProfessions.includes(id);
    }
    
    /**
     * Получить выбранные профессии
     * @returns {string[]}
     */
    getSelectedProfessions() {
        return this.state.selectedProfessions;
    }
    
    /**
     * Получить количество выбранных профессий
     * @returns {number}
     */
    getSelectedCount() {
        return this.state.selectedProfessions.length;
    }
    
    /**
     * Получить лимит выбранных профессий
     * @returns {number}
     */
    getMaxSelected() {
        return this.maxSelectedProfessions;
    }
    
    /**
     * Очистить выбранные профессии
     */
    clearSelected() {
        this.state.selectedProfessions = [];
        this._saveSelectedProfessions();
        this.notify('professions:clear');
    }
    
    /**
     * Установить текущую профессию
     * @param {Object} profession
     */
    setCurrentProfession(profession) {
        this.state.currentProfession = profession;
        this.notify('profession:current');
    }
    
    /**
     * Получить текущую профессию
     * @returns {Object|null}
     */
    getCurrentProfession() {
        return this.state.currentProfession;
    }
    
    /**
     * Сохранить тренд профессии в кэш
     * @param {string} id - ID профессии
     * @param {Array} trendData
     */
    setTrendData(id, trendData) {
        this.state.trendData.set(id, trendData);
        this.notify('trend:update');
    }
    
    /**
     * Получить тренд профессии из кэша
     * @param {string} id
     * @returns {Array|undefined}
     */
    getTrendData(id) {
        return this.state.trendData.get(id);
    }
    
    /**
     * Очистить кэш трендов
     */
    clearTrendCache() {
        this.state.trendData.clear();
        this.notify('trend:clear');
    }
}

// Singleton
export const store = new Store();
export default store;
