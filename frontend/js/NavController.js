/**
 * NavController — top-right dropdown menu and hash-based routing.
 *
 * Wires:
 *   - #menuButton toggles #navDropdown
 *   - dropdown items dispatch nav: 'forecast' | 'history' | 'settings'
 *   - hash routes ('', '#/forecast', '#/history') show/hide elements with [data-route]
 */
class NavController {
    constructor(menuController) {
        this.menuController = menuController;
        this.button = null;
        this.dropdown = null;
        this.routeNodes = [];
        this.currentRoute = 'home';
        this._onDocClick = this._onDocClick.bind(this);
        this._onKeyDown = this._onKeyDown.bind(this);
        this._onHashChange = this._onHashChange.bind(this);
    }

    init() {
        this.button = document.getElementById('menuButton');
        this.dropdown = document.getElementById('navDropdown');
        this.routeNodes = Array.from(document.querySelectorAll('[data-route]'));

        if (!this.button || !this.dropdown) {
            console.error('NavController: required elements not found');
            return false;
        }

        this.button.addEventListener('click', (e) => {
            e.stopPropagation();
            this.toggleDropdown();
        });

        this.dropdown.querySelectorAll('[data-nav]').forEach(item => {
            item.addEventListener('click', () => {
                const target = item.dataset.nav;
                this.closeDropdown();
                this.handleNav(target);
            });
        });

        // Language pills
        this.dropdown.querySelectorAll('.lang-pill[data-lang]').forEach(pill => {
            pill.addEventListener('click', () => {
                const lang = pill.dataset.lang;
                if (window.settings) {
                    window.settings.setSetting('locale', lang);
                }
                this._updateActiveLang(lang);
            });
        });
        this._updateActiveLang(window.settings?.getSetting('locale') || 'ru');
        window.settings?.on?.('change:locale', (locale) => this._updateActiveLang(locale));

        document.addEventListener('click', this._onDocClick);
        document.addEventListener('keydown', this._onKeyDown);
        window.addEventListener('hashchange', this._onHashChange);

        this._applyRoute(this._routeFromHash());
        return true;
    }

    handleNav(target) {
        if (target === 'settings') {
            this.menuController?.open();
            return;
        }
        if (target === 'forecast') {
            location.hash = '#/forecast';
            return;
        }
        if (target === 'history') {
            location.hash = '#/history';
            return;
        }
        if (target === 'home') {
            location.hash = '';
        }
    }

    toggleDropdown() {
        if (this.dropdown.classList.contains('active')) {
            this.closeDropdown();
        } else {
            this.openDropdown();
        }
    }

    openDropdown() {
        this.dropdown.classList.add('active');
        this.button.setAttribute('aria-expanded', 'true');
    }

    closeDropdown() {
        this.dropdown.classList.remove('active');
        this.button.setAttribute('aria-expanded', 'false');
    }

    _onDocClick(e) {
        if (!this.dropdown.classList.contains('active')) return;
        if (this.button.contains(e.target) || this.dropdown.contains(e.target)) return;
        this.closeDropdown();
    }

    _onKeyDown(e) {
        if (e.key === 'Escape' && this.dropdown.classList.contains('active')) {
            this.closeDropdown();
            this.button.focus();
        }
    }

    _onHashChange() {
        this._applyRoute(this._routeFromHash());
    }

    _routeFromHash() {
        const hash = location.hash || '';
        if (hash === '#/forecast') return 'forecast';
        if (hash === '#/history') return 'history';
        return 'home';
    }

    _updateActiveLang(lang) {
        this.dropdown.querySelectorAll('.lang-pill[data-lang]').forEach(pill => {
            pill.classList.toggle('active', pill.dataset.lang === lang);
        });
    }

    _applyRoute(route) {
        this.currentRoute = route;
        for (const node of this.routeNodes) {
            const match = node.dataset.route === route;
            node.hidden = !match;
        }
        window.dispatchEvent(new CustomEvent('routeChanged', { detail: { route } }));
        // Scroll to top on navigation for cleaner UX
        window.scrollTo({ top: 0, behavior: 'instant' });
    }
}

export default NavController;
