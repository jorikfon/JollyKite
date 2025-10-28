import fs from 'fs';
import path from 'path';
import webpush from 'web-push';

/**
 * NotificationManager - manages push notifications for wind conditions
 * Sends notifications when wind speed exceeds 10 knots with increasing trend
 * Maximum once per day per subscription
 */
export class NotificationManager {
  constructor(dbPath = './data/subscriptions.json') {
    this.subscriptionsPath = dbPath;
    this.subscriptions = [];
    this.notificationLog = {}; // Track last notification time per subscription

    // Configure web-push with VAPID keys
    webpush.setVapidDetails(
      'mailto:support@jollykite.com',
      'BKbAJNbB1Rq1fphPamNav3wW4O9FFWvtZzD0NyxcEZwU_PtGv4_Sm7q2NQYfBBFQAlNb4pre7Z4Szhc2vJHYXYU', // Public Key
      '8bxTPyVz553qNZ9T4sXJrjKY3vyI2AVBQSXJDxBf9cA' // Private Key
    );

    this.loadSubscriptions();
  }

  loadSubscriptions() {
    try {
      if (fs.existsSync(this.subscriptionsPath)) {
        const data = fs.readFileSync(this.subscriptionsPath, 'utf8');
        this.subscriptions = JSON.parse(data);
        console.log(`✓ Loaded ${this.subscriptions.length} push subscriptions`);
      }
    } catch (error) {
      console.error('Error loading subscriptions:', error.message);
      this.subscriptions = [];
    }
  }

  saveSubscriptions() {
    try {
      const dir = path.dirname(this.subscriptionsPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.subscriptionsPath, JSON.stringify(this.subscriptions, null, 2));
    } catch (error) {
      console.error('Error saving subscriptions:', error.message);
    }
  }

  /**
   * Add a new push subscription
   */
  addSubscription(subscription) {
    // Check if subscription already exists
    const exists = this.subscriptions.some(
      sub => sub.endpoint === subscription.endpoint
    );

    if (!exists) {
      this.subscriptions.push({
        ...subscription,
        createdAt: new Date().toISOString()
      });
      this.saveSubscriptions();
      console.log('✓ New push subscription added');
      return true;
    }
    return false;
  }

  /**
   * Remove a push subscription
   */
  removeSubscription(endpoint) {
    const initialLength = this.subscriptions.length;
    this.subscriptions = this.subscriptions.filter(
      sub => sub.endpoint !== endpoint
    );

    if (this.subscriptions.length < initialLength) {
      this.saveSubscriptions();
      console.log('✓ Push subscription removed');
      return true;
    }
    return false;
  }

  /**
   * Check if notification should be sent based on conditions
   */
  shouldNotify(windData, trend) {
    // Conditions:
    // 1. Wind speed >= 10 knots
    // 2. Trend is increasing (усиление)
    // 3. Not already notified today

    if (!windData || !trend) return false;

    const speed = windData.windSpeedKnots || 0;
    const isIncreasing = trend.change > 0;

    return speed >= 10 && isIncreasing;
  }

  /**
   * Check if subscription was already notified today
   */
  canNotifyToday(subscriptionId) {
    const lastNotification = this.notificationLog[subscriptionId];
    if (!lastNotification) return true;

    const lastTime = new Date(lastNotification);
    const now = new Date();

    // Check if it's a different day
    return lastTime.toDateString() !== now.toDateString();
  }

  /**
   * Send push notifications to all subscribed users
   */
  async sendNotifications(windData, trend) {
    if (!this.shouldNotify(windData, trend)) {
      return { sent: 0, reason: 'Conditions not met' };
    }

    let sentCount = 0;
    const now = new Date().toISOString();

    // Prepare notification payload
    const payload = JSON.stringify({
      title: '🌬️ Ветер усиливается!',
      body: `Скорость ветра: ${windData.windSpeedKnots.toFixed(1)} узлов (${trend.text}). Отличные условия для кайтсерфинга!`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      url: '/',
      windSpeed: windData.windSpeedKnots,
      timestamp: now
    });

    for (const subscription of this.subscriptions) {
      const subId = subscription.endpoint;

      if (!this.canNotifyToday(subId)) {
        console.log(`⏭ Skipping ${subId.substring(0, 50)}... - already notified today`);
        continue;
      }

      try {
        // Send real push notification
        await webpush.sendNotification(subscription, payload);

        console.log(`📨 Push notification sent to: ${subId.substring(0, 50)}...`);
        console.log(`   Wind: ${windData.windSpeedKnots.toFixed(1)} knots ${trend.text}`);

        // Mark as notified
        this.notificationLog[subId] = now;
        sentCount++;
      } catch (error) {
        console.error(`✗ Error sending notification: ${error.message}`);

        // Remove invalid subscription (410 = Gone)
        if (error.statusCode === 410 || error.statusCode === 404) {
          console.log(`🗑️  Removing expired subscription: ${subId.substring(0, 50)}...`);
          this.removeSubscription(subscription.endpoint);
        }
      }
    }

    return {
      sent: sentCount,
      total: this.subscriptions.length,
      conditions: {
        speed: windData.windSpeedKnots,
        trend: trend.text
      }
    };
  }

  /**
   * Get notification statistics
   */
  getStats() {
    return {
      totalSubscriptions: this.subscriptions.length,
      notifiedToday: Object.keys(this.notificationLog).filter(key => {
        const lastTime = new Date(this.notificationLog[key]);
        const now = new Date();
        return lastTime.toDateString() === now.toDateString();
      }).length
    };
  }

  /**
   * Reset daily notification log (called at midnight)
   */
  resetDailyLog() {
    const now = new Date();
    const keysToDelete = [];

    for (const [key, value] of Object.entries(this.notificationLog)) {
      const lastTime = new Date(value);
      if (lastTime.toDateString() !== now.toDateString()) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => delete this.notificationLog[key]);
    console.log(`✓ Cleaned up ${keysToDelete.length} old notification records`);
  }
}
