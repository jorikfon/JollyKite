import config from './config.js';

/**
 * NotificationManager - manages push notification subscriptions
 */
class NotificationManager {
    constructor(i18n = null) {
        this.i18n = i18n;
        this.apiBaseUrl = config.api.backend;
        this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
        this.subscription = null;
    }

    /**
     * Check if push notifications are supported
     */
    isNotificationSupported() {
        return this.isSupported;
    }

    /**
     * Check current permission status
     */
    getPermissionStatus() {
        if (!this.isSupported) return 'unsupported';
        return Notification.permission;
    }

    /**
     * Request notification permission
     */
    async requestPermission() {
        if (!this.isSupported) {
            throw new Error('Push notifications are not supported');
        }

        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    /**
     * Subscribe to push notifications
     */
    async subscribe() {
        try {
            // Request permission first
            const granted = await this.requestPermission();
            if (!granted) {
                throw new Error('Notification permission denied');
            }

            // Get service worker registration
            const registration = await navigator.serviceWorker.ready;

            // Subscribe to push notifications with VAPID public key
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: this.urlBase64ToUint8Array(
                    'BKbAJNbB1Rq1fphPamNav3wW4O9FFWvtZzD0NyxcEZwU_PtGv4_Sm7q2NQYfBBFQAlNb4pre7Z4Szhc2vJHYXYU'
                )
            });

            // Send subscription to backend
            const response = await fetch(`${this.apiBaseUrl}/notifications/subscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(subscription)
            });

            if (!response.ok) {
                throw new Error('Failed to save subscription');
            }

            this.subscription = subscription;
            console.log('✓ Successfully subscribed to push notifications');
            return true;
        } catch (error) {
            console.error('Error subscribing to push notifications:', error);
            throw error;
        }
    }

    /**
     * Unsubscribe from push notifications
     */
    async unsubscribe() {
        try {
            if (!this.subscription) {
                const registration = await navigator.serviceWorker.ready;
                this.subscription = await registration.pushManager.getSubscription();
            }

            if (!this.subscription) {
                console.log('No active subscription found');
                return true;
            }

            // Unsubscribe from push
            await this.subscription.unsubscribe();

            // Remove from backend
            await fetch(`${this.apiBaseUrl}/notifications/unsubscribe`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    endpoint: this.subscription.endpoint
                })
            });

            this.subscription = null;
            console.log('✓ Successfully unsubscribed from push notifications');
            return true;
        } catch (error) {
            console.error('Error unsubscribing from push notifications:', error);
            throw error;
        }
    }

    /**
     * Check if currently subscribed
     */
    async isSubscribed() {
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            this.subscription = subscription;
            return subscription !== null;
        } catch (error) {
            console.error('Error checking subscription status:', error);
            return false;
        }
    }

    /**
     * Convert base64 string to Uint8Array
     * Required for VAPID key
     */
    urlBase64ToUint8Array(base64String) {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    }

    /**
     * Show notification UI button based on current state
     */
    async updateUI(buttonElement) {
        if (!this.isSupported) {
            buttonElement.disabled = true;
            buttonElement.textContent = this.i18n ? this.i18n.t('notifications.notSupported') : '🔕 Уведомления не поддерживаются';
            buttonElement.classList.add('opacity-50', 'cursor-not-allowed');
            return;
        }

        const permission = this.getPermissionStatus();
        const subscribed = await this.isSubscribed();

        if (permission === 'denied') {
            buttonElement.disabled = true;
            buttonElement.textContent = this.i18n ? this.i18n.t('notifications.blocked') : '🔕 Уведомления заблокированы';
            buttonElement.classList.add('opacity-50');
            return;
        }

        if (subscribed) {
            buttonElement.textContent = this.i18n ? this.i18n.t('notifications.disable') : '🔔 Отключить уведомления';
            buttonElement.classList.remove('opacity-50');
            buttonElement.classList.add('bg-red-500', 'hover:bg-red-600');
            buttonElement.classList.remove('bg-green-500', 'hover:bg-green-600');
        } else {
            buttonElement.textContent = this.i18n ? this.i18n.t('notifications.enable') : '🔔 Получать уведомления о ветре';
            buttonElement.classList.remove('opacity-50', 'bg-red-500', 'hover:bg-red-600');
            buttonElement.classList.add('bg-green-500', 'hover:bg-green-600');
        }

        buttonElement.disabled = false;
    }
}

export default NotificationManager;
