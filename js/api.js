/**
 * API Client с кэшированием в localStorage
 */

import { config } from './config.js';

const CACHE_PREFIX = 'psa_cache_';
const DEFAULT_TTL = 5 * 60 * 1000; // 5 минут

/**
 * Получить данные из кэша
 * @param {string} key - Ключ кэша
 * @returns {any|null}
 */
function getCache(key) {
    try {
        const cached = localStorage.getItem(CACHE_PREFIX + key);
        if (!cached) return null;
        
        const { data, expiry } = JSON.parse(cached);
        if (Date.now() > expiry) {
            localStorage.removeItem(CACHE_PREFIX + key);
            return null;
        }
        return data;
    } catch (e) {
        console.error('[Cache] Error reading cache:', e);
        return null;
    }
}

/**
 * Сохранить данные в кэш
 * @param {string} key - Ключ кэша
 * @param {any} data - Данные
 * @param {number} ttl - Время жизни в мс
 */
function setCache(key, data, ttl = DEFAULT_TTL) {
    try {
        const expiry = Date.now() + ttl;
        localStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ data, expiry }));
    } catch (e) {
        console.error('[Cache] Error writing cache:', e);
        // Если localStorage переполнен, очищаем старые записи
        if (e.name === 'QuotaExceededError') {
            clearExpiredCache();
        }
    }
}

/**
 * Очистить просроченные записи кэша
 */
function clearExpiredCache() {
    const now = Date.now();
    Object.keys(localStorage)
        .filter(key => key.startsWith(CACHE_PREFIX))
        .forEach(key => {
            try {
                const { expiry } = JSON.parse(localStorage.getItem(key));
                if (now > expiry) {
                    localStorage.removeItem(key);
                }
            } catch (e) {
                localStorage.removeItem(key);
            }
        });
}

/**
 * Очистить весь кэш
 */
export function clearAllCache() {
    Object.keys(localStorage)
        .filter(key => key.startsWith(CACHE_PREFIX))
        .forEach(key => localStorage.removeItem(key));
}

/**
 * API клиент
 */
export const api = {
    /**
     * GET запрос с кэшированием
     * @param {string} endpoint - API endpoint
     * @param {Object} options - Опции запроса
     * @param {boolean} options.cache - Использовать кэш
     * @param {number} options.ttl - Время жизни кэша
     * @returns {Promise<any>}
     */
    async get(endpoint, { cache = true, ttl = DEFAULT_TTL } = {}) {
        const cacheKey = endpoint.replace(/\W+/g, '_');
        
        // Проверка кэша
        if (cache) {
            const cached = getCache(cacheKey);
            if (cached) {
                console.log('[API] Cache hit:', endpoint);
                return cached;
            }
        }
        
        console.log('[API] Fetch:', endpoint);
        
        try {
            const response = await fetch(`${config.apiBaseUrl}${endpoint}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            // Сохранение в кэш
            if (cache) {
                setCache(cacheKey, data, ttl);
            }
            
            return data;
        } catch (error) {
            console.error('[API] Error:', error.message);
            throw error;
        }
    },
    
    /**
     * Получить список профессий
     * @returns {Promise<Array>}
     */
    async getProfessions() {
        const data = await this.get('/professions', { cache: true, ttl: 60 * 60 * 1000 }); // 1 час
        // Сортировка по алфавиту
        return data.sort((a, b) => a.name.localeCompare(b.name));
    },
    
    /**
     * Получить данные профессии
     * @param {string} id - ID профессии
     * @param {boolean} withTrend - Включить тренд
     * @returns {Promise<Object>}
     */
    async getProfessionLatest(id, withTrend = false) {
        const query = withTrend ? '?trend=true' : '';
        return this.get(`/professions/${id}/latest${query}`, { 
            cache: true, 
            ttl: 30 * 60 * 1000 // 30 минут
        });
    },
    
    /**
     * Получить тренд профессии
     * @param {string} id - ID профессии
     * @returns {Promise<Object>}
     */
    async getProfessionTrend(id) {
        return this.get(`/professions/${id}/trend`, { 
            cache: true, 
            ttl: 20 * 60 * 1000 // 20 минут
        });
    },
};

export default api;
