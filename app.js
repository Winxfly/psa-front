/**
 * PSA Frontend — Application Entry Point
 */

import { router } from './js/router.js';
import { store } from './js/store.js';
import { Header } from './js/components/header.js';
import { HomePage } from './js/pages/home.js';
import { TrendsPage } from './js/pages/trends.js';
import { ProfessionPage } from './js/pages/profession.js';

// Глобальные компоненты
let header = null;
let currentPage = null;

// DOM элементы
const elements = {
    header: document.getElementById('header'),
    main: document.querySelector('#main .container'),
};

/**
 * Инициализация приложения
 */
function init() {
    console.log('[PSA] Initializing application...');
    
    // Инициализация хедера
    header = new Header(elements.header);
    header.render('/');
    
    // Регистрация маршрутов
    router.register('/', handleHome);
    router.register('/trends', handleTrends);
    router.register('/profession/:id', handleProfession);
    
    // Запуск роутера
    router.init();
}

/**
 * Обработчик главной страницы
 */
async function handleHome() {
    console.log('[PSA] Route: Home');

    header.setActive('/');

    // Очистка предыдущей страницы
    if (currentPage && currentPage.destroy) {
        currentPage.destroy();
    }
    
    // Очистка контейнера
    elements.main.innerHTML = '';

    // Создание и инициализация страницы
    currentPage = new HomePage(elements.main);
    await currentPage.init();
}

/**
 * Обработчик страницы трендов
 */
async function handleTrends() {
    console.log('[PSA] Route: Trends');

    header.setActive('/trends');

    // Очистка предыдущей страницы
    if (currentPage && currentPage.destroy) {
        currentPage.destroy();
    }
    
    // Очистка контейнера
    elements.main.innerHTML = '';

    // Создание и инициализация страницы
    currentPage = new TrendsPage(elements.main);
    await currentPage.init();
}

/**
 * Обработчик страницы профессии
 * @param {Object} params - Параметры маршрута
 * @param {string} params.id - ID профессии
 */
async function handleProfession(params) {
    console.log('[PSA] Route: Profession', params.id);

    header.setActive('/');

    // Очистка предыдущей страницы
    if (currentPage && currentPage.destroy) {
        currentPage.destroy();
    }
    
    // Очистка контейнера
    elements.main.innerHTML = '';

    // Создание и инициализация страницы
    currentPage = new ProfessionPage(elements.main);
    await currentPage.init(params.id);
}

// Запуск приложения после загрузки DOM
document.addEventListener('DOMContentLoaded', init);
