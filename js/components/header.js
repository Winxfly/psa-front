/**
 * Header Component — навигация с кнопками
 */

import { router } from '../router.js';

export class Header {
    constructor(container) {
        this.container = container;
        this.currentRoute = '';
    }
    
    /**
     * Рендер хедера
     * @param {string} currentRoute - Текущий маршрут
     */
    render(currentRoute = '/') {
        this.currentRoute = currentRoute;
        
        this.container.innerHTML = `
            <div class="logo-section">
                <a href="#/" class="logo-link">
                    <h1 class="logo">PSA</h1>
                </a>
            </div>
            <nav class="nav">
                <a href="#/" class="nav-btn ${currentRoute === '/' ? 'active' : ''}">
                    Профессии
                </a>
                <a href="#/trends" class="nav-btn ${currentRoute === '/trends' ? 'active' : ''}">
                    Тренды
                </a>
            </nav>
        `;
        
        this._attachListeners();
    }
    
    /**
     * Обработчики событий
     */
    _attachListeners() {
        const buttons = this.container.querySelectorAll('.nav-btn');
        buttons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Удаляем активный класс у всех кнопок
                buttons.forEach(b => b.classList.remove('active'));
                // Добавляем активный класс текущей
                e.target.classList.add('active');
            });
        });
    }
    
    /**
     * Обновить активную кнопку
     * @param {string} route
     */
    setActive(route) {
        this.render(route);
    }
}

export default Header;
