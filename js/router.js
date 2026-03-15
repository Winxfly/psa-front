/**
 * Router — hash-роутинг
 */

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        
        // Обработка навигации
        window.addEventListener('popstate', () => this._handlePopState());
    }
    
    /**
     * Зарегистрировать маршрут
     * @param {string} pattern - Паттерн пути (например, '/trends' или '/profession/:id')
     * @param {Function} handler - Функция-обработчик
     */
    register(pattern, handler) {
        this.routes.set(pattern, { pattern, handler });
    }
    
    /**
     * Перейти по маршруту
     * @param {string} path - Путь
     */
    navigate(path) {
        if (!path.startsWith('#')) {
            path = '#' + path;
        }
        window.location.hash = path;
    }
    
    /**
     * Получить текущий путь
     * @returns {string}
     */
    getPath() {
        return window.location.hash.slice(1) || '/';
    }
    
    /**
     * Обработчик изменения hash
     */
    _handlePopState() {
        this._matchRoute();
    }
    
    /**
     * Сопоставление маршрута
     */
    _matchRoute() {
        const path = this.getPath();
        
        for (const { pattern, handler } of this.routes.values()) {
            const params = this._matchPattern(pattern, path);
            if (params !== null) {
                this.currentRoute = { pattern, params };
                handler(params);
                return;
            }
        }
        
        // Маршрут не найден — переход на главную
        console.warn('[Router] Route not found:', path);
        this.navigate('/');
    }
    
    /**
     * Сопоставление паттерна с путём
     * @param {string} pattern - Паттерн (например, '/profession/:id')
     * @param {string} path - Путь
     * @returns {Object|null} - Параметры или null
     */
    _matchPattern(pattern, path) {
        // Точное совпадение
        if (pattern === path) {
            return {};
        }
        
        // Паттерн с параметрами (например, /profession/:id)
        if (pattern.includes(':')) {
            const patternParts = pattern.split('/');
            const pathParts = path.split('/');
            
            if (patternParts.length !== pathParts.length) {
                return null;
            }
            
            const params = {};
            for (let i = 0; i < patternParts.length; i++) {
                if (patternParts[i].startsWith(':')) {
                    const paramName = patternParts[i].slice(1);
                    params[paramName] = pathParts[i];
                } else if (patternParts[i] !== pathParts[i]) {
                    return null;
                }
            }
            return params;
        }
        
        return null;
    }
    
    /**
     * Инициализация роутера
     */
    init() {
        this._matchRoute();
    }
}

// Singleton
export const router = new Router();
export default router;
