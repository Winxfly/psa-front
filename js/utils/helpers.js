/**
 * Debounce функция — ограничивает частоту вызова
 * @param {Function} func - Функция для вызова
 * @param {number} wait - Задержка в мс
 * @returns {Function}
 */
export function debounce(func, wait = 300) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Форматирование даты в локальный формат
 * @param {string|Date} date - Дата
 * @param {Object} options - Опции форматирования
 * @returns {string}
 */
export function formatDate(date, options = {}) {
    const d = typeof date === 'string' ? new Date(date) : date;
    const defaultOptions = {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    return d.toLocaleDateString('ru-RU', { ...defaultOptions, ...options });
}

/**
 * Форматирование короткой даты
 * @param {string|Date} date
 * @returns {string}
 */
export function formatShortDate(date) {
    const d = typeof date === 'string' ? new Date(date) : date;
    return d.toLocaleDateString('ru-RU', {
        day: 'numeric',
        month: 'short',
        year: '2-digit'
    });
}

/**
 * Экранирование HTML для защиты от XSS
 * @param {string} text
 * @returns {string}
 */
export function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

/**
 * Генерация уникального ID
 * @returns {string}
 */
export function generateId() {
    return Math.random().toString(36).substring(2, 9);
}

/**
 * Получить цвета для графиков
 * @param {number} count - Количество цветов
 * @returns {string[]}
 */
export function getChartColors(count) {
    const colors = [
        '#7aa2f7', // синий
        '#9ece6a', // зелёный
        '#e0af68', // жёлтый
        '#f7768e', // красный
        '#bb9af7', // фиолетовый
        '#7dcfff', // голубой
        '#ff9e64', // оранжевый
        '#2ac3de', // циан
        '#c099ff', // лаванда
        '#73daca', // мятный
    ];
    return colors.slice(0, count);
}
