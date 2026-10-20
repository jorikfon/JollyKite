import App from './App.js';

// Global app instance
let jollyKiteApp;

// Force Service Worker update
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(registrations => {
        registrations.forEach(registration => {
            console.log('Updating Service Worker...');
            registration.update();
        });
    });
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', async function() {
    // Version is only logged: don't make init wait a round trip for it
    fetch('/version.json')
        .then(r => r.json())
        .then(v => console.log(`Initializing JollyKite App v${v.version}...`))
        .catch(() => {});

    try {
        jollyKiteApp = new App();
        const success = await jollyKiteApp.init();

        if (success) {
            console.log('JollyKite App initialized successfully!');

            // Make app available globally for debugging
            window.jollyKiteApp = jollyKiteApp;
        } else {
            console.error('Failed to initialize JollyKite App');
            showError('Не удалось загрузить приложение. Пожалуйста, обновите страницу.');
        }
    } catch (error) {
        console.error('Error initializing app:', error);
        showError('Произошла ошибка при загрузке приложения.');
    }
});

// Error display function
function showError(message) {
    const windTitle = document.getElementById('windTitle');
    const windSubtitle = document.getElementById('windSubtitle');
    const windIcon = document.getElementById('windIcon');

    if (windTitle) windTitle.textContent = 'Ошибка';
    if (windSubtitle) windSubtitle.textContent = message;
    if (windIcon) windIcon.textContent = '⚠️';
}

// Version check and Service Worker registration
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        // Import and initialize VersionManager
        const { default: VersionManager } = await import('./VersionManager.js');
        const versionManager = new VersionManager();

        // Check version and clear cache if needed
        const shouldProceed = await versionManager.init();
        if (!shouldProceed) {
            // Page will reload, don't continue
            return;
        }

        // Register Service Worker (VersionManager handles cache invalidation)
        navigator.serviceWorker.register('./sw.js', {
            updateViaCache: 'none'
        }).then(registration => {
            console.log('✓ Service Worker registered:', registration.scope);

            // Check for updates every page load
            registration.update().catch(err => {
                console.warn('Service Worker update check failed:', err);
            });

            // Auto-reload when new service worker is activated
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'activated') {
                        console.log('✓ New Service Worker activated, reloading...');
                        window.location.reload();
                    }
                });
            });
        }).catch(err => console.log('✗ Service Worker registration failed:', err));

        // Listen for messages from Service Worker (for language change reload)
        navigator.serviceWorker.addEventListener('message', event => {
            if (event.data && event.data.type === 'RELOAD') {
                console.log('✓ Received reload request from Service Worker');
                window.location.reload(true);
            }
        });
    });
}
