/**
 * Header Component — навигация с кнопками
 */

import { router } from '../router.js';
import { applyTheme, getCurrentThemeMode } from '../theme.js';

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
        const currentThemeMode = getCurrentThemeMode();

        this.container.innerHTML = `
            <div class="container">
                <div class="header-primary">
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
                            Сравнение
                        </a>
                    </nav>
                </div>
                <div class="theme-switch" role="group" aria-label="Выбор темы">
                    <button class="theme-switch-btn ${currentThemeMode === 'system' ? 'active' : ''}" type="button" data-theme-mode="system" aria-label="Системная тема" title="Системная тема">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <rect x="4" y="5" width="16" height="11" rx="2"></rect>
                            <path d="M9 20h6"></path>
                            <path d="M12 16v4"></path>
                        </svg>
                    </button>
                    <button class="theme-switch-btn ${currentThemeMode === 'light' ? 'active' : ''}" type="button" data-theme-mode="light" aria-label="Светлая тема" title="Светлая тема">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <circle cx="12" cy="12" r="4"></circle>
                            <path d="M12 2v2"></path>
                            <path d="M12 20v2"></path>
                            <path d="m4.93 4.93 1.41 1.41"></path>
                            <path d="m17.66 17.66 1.41 1.41"></path>
                            <path d="M2 12h2"></path>
                            <path d="M20 12h2"></path>
                            <path d="m6.34 17.66-1.41 1.41"></path>
                            <path d="m19.07 4.93-1.41 1.41"></path>
                        </svg>
                    </button>
                    <button class="theme-switch-btn ${currentThemeMode === 'dark' ? 'active' : ''}" type="button" data-theme-mode="dark" aria-label="Тёмная тема" title="Тёмная тема">
                        <svg viewBox="0 0 24 24" aria-hidden="true">
                            <path d="M20 14.5A7.5 7.5 0 0 1 9.5 4 8.5 8.5 0 1 0 20 14.5Z"></path>
                        </svg>
                    </button>
                </div>
            </div>
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

        this.container.querySelectorAll('.theme-switch-btn').forEach(button => {
            button.addEventListener('click', () => {
                applyTheme(button.dataset.themeMode);
                this.render(this.currentRoute);
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
