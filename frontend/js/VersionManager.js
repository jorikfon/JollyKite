/**
 * VersionManager - handles version checking and cache invalidation
 * Checks server version on startup and clears cache if version changed
 */
class VersionManager {
    constructor() {
        this.apiUrl = '/api/version';
        this.storageKey = 'jollykite_app_version';
    }

    /**
     * Get current version from localStorage
     */
    getCurrentVersion() {
        return localStorage.getItem(this.storageKey);
    }

    /**
     * Set current version in localStorage
     */
    setCurrentVersion(version) {
        localStorage.setItem(this.storageKey, version);
        console.log('📦 App version set to:', version);
    }

    /**
     * Fetch server version
     */
    async fetchServerVersion() {
        try {
            const response = await fetch(this.apiUrl);
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            const data = await response.json();
            return data.version;
        } catch (error) {
            console.warn('⚠️ Failed to fetch server version:', error);
            return null;
        }
    }

    /**
     * Clear all caches (Service Worker and browser)
     */
    async clearAllCaches() {
        console.log('🧹 Clearing all caches...');

        try {
            // Clear Service Worker caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => {
                        console.log('  Deleting cache:', cacheName);
                        return caches.delete(cacheName);
                    })
                );
            }

            // Service Workers are NOT unregistered: unregister() drops the push
            // subscription (wind alerts), and re-subscribing needs a user click.
            // New SW code arrives anyway: sw.js changes bytes, main.js calls update().

            console.log('✅ All caches cleared');
            return true;
        } catch (error) {
            console.error('❌ Failed to clear caches:', error);
            return false;
        }
    }

    /**
     * Check version and invalidate cache if needed
     * Returns true if page should reload
     */
    async checkAndUpdate() {
        console.log('🔍 Checking app version...');

        const serverVersion = await this.fetchServerVersion();
        if (!serverVersion) {
            console.warn('⚠️ Could not fetch server version, using cached version');
            return false;
        }

        const currentVersion = this.getCurrentVersion();
        console.log('📦 Current version:', currentVersion || 'none');
        console.log('📦 Server version:', serverVersion);

        // First time - just set version
        if (!currentVersion) {
            this.setCurrentVersion(serverVersion);
            return false;
        }

        // Version changed - clear cache and reload
        if (currentVersion !== serverVersion) {
            console.log('🔄 Version changed! Clearing cache...');

            await this.clearAllCaches();
            this.setCurrentVersion(serverVersion);

            return true; // Signal that page should reload
        }

        console.log('✅ Version is up to date');
        return false;
    }

    /**
     * Initialize version manager
     * Call this before Service Worker registration
     */
    async init() {
        const shouldReload = await this.checkAndUpdate();

        if (!shouldReload) {
            // The flag only guards one reload; left set, it would skip the reload
            // on the next release in this tab
            sessionStorage.removeItem('jollykite_reloaded');
        } else {
            console.log('🔄 Reloading page with fresh cache...');
            // Use a flag to prevent infinite reload loop
            const reloadFlag = sessionStorage.getItem('jollykite_reloaded');
            if (!reloadFlag) {
                sessionStorage.setItem('jollykite_reloaded', 'true');
                window.location.reload(true);
                return false; // Don't proceed with app initialization
            } else {
                // Clear flag after successful reload
                sessionStorage.removeItem('jollykite_reloaded');
            }
        }

        return true; // Proceed with app initialization
    }
}

export default VersionManager;
