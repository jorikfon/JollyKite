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
   * Helper to get wind speed from measurement (handles both snake_case and camelCase)
   */
  getWindSpeed(m) {
    return m.wind_speed_knots || m.windSpeedKnots || 0;
  }

  /**
   * Helper to get wind direction from measurement (handles both snake_case and camelCase)
   */
  getWindDirection(m) {
    return m.wind_direction || m.windDirection || 0;
  }

  /**
   * Helper to get wind gust from measurement (handles both snake_case and camelCase)
   */
  getWindGust(m) {
    return m.wind_gust_knots || m.gustKnots || m.windGustKnots || this.getWindSpeed(m);
  }

  /**
   * Check if wind conditions are stable over the last 20 minutes
   * Requirements:
   * - Speed >= 10 knots in ALL measurements
   * - Direction stable (variance <= 30°)
   * - Gusts not critical (max - avg <= 7 knots)
   * - Trend is increasing or stable (not decreasing)
   */
  checkWindStability(measurements) {
    if (!measurements || measurements.length < 4) {
      return { stable: false, reason: 'Insufficient data (need at least 4 measurements)' };
    }

    // Take last 4 measurements (20 minutes with 5-min intervals)
    const last20min = measurements.slice(-4);

    // 1. Check if ALL measurements have speed >= 10 knots
    const allAbove10 = last20min.every(m => this.getWindSpeed(m) >= 10);
    if (!allAbove10) {
      const speeds = last20min.map(m => this.getWindSpeed(m).toFixed(1)).join(', ');
      return { stable: false, reason: `Wind speed dropped below 10 knots in last 20 minutes (speeds: ${speeds})` };
    }

    // 2. Check direction stability (variance <= 30°)
    const directions = last20min.map(m => this.getWindDirection(m));
    const directionVariance = this.calculateDirectionVariance(directions);
    if (directionVariance > 30) {
      return { stable: false, reason: `Direction too variable (${directionVariance.toFixed(1)}°)` };
    }

    // 3. Check gusts are not critical (difference between max gust and avg speed <= 7 knots)
    const avgSpeed = last20min.reduce((sum, m) => sum + this.getWindSpeed(m), 0) / last20min.length;
    const maxGust = Math.max(...last20min.map(m => this.getWindGust(m)));
    const gustDiff = maxGust - avgSpeed;
    if (gustDiff > 7) {
      return { stable: false, reason: `Gusts too strong (${gustDiff.toFixed(1)} knots difference)` };
    }

    // 4. Check trend is not decreasing (comparing first half vs second half of 20min window)
    const firstHalf = last20min.slice(0, 2).reduce((sum, m) => sum + this.getWindSpeed(m), 0) / 2;
    const secondHalf = last20min.slice(2, 4).reduce((sum, m) => sum + this.getWindSpeed(m), 0) / 2;
    const trendChange = secondHalf - firstHalf;
    if (trendChange < -1) { // Allow minor fluctuations (-1 knot)
      return { stable: false, reason: `Wind is weakening (${trendChange.toFixed(1)} knots)` };
    }

    return {
      stable: true,
      avgSpeed: avgSpeed.toFixed(1),
      directionVariance: directionVariance.toFixed(1),
      gustDiff: gustDiff.toFixed(1),
      trendChange: trendChange.toFixed(1)
    };
  }

  /**
   * Calculate direction variance (accounting for circular nature of degrees)
   */
  calculateDirectionVariance(directions) {
    if (directions.length < 2) return 0;

    // Convert to radians
    const radians = directions.map(d => d * Math.PI / 180);

    // Calculate mean sine and cosine
    const meanSin = radians.reduce((sum, r) => sum + Math.sin(r), 0) / radians.length;
    const meanCos = radians.reduce((sum, r) => sum + Math.cos(r), 0) / radians.length;

    // Calculate mean direction
    const meanDir = Math.atan2(meanSin, meanCos) * 180 / Math.PI;

    // Calculate angular differences from mean
    const diffs = directions.map(d => {
      let diff = Math.abs(d - meanDir);
      // Handle wrap-around (e.g., 10° and 350° should be close)
      if (diff > 180) diff = 360 - diff;
      return diff;
    });

    // Return maximum deviation
    return Math.max(...diffs);
  }

  /**
   * Check if notification should be sent based on conditions
   * Now uses 20-minute stability check instead of instant trigger
   */
  shouldNotify(measurements) {
    if (!measurements || measurements.length === 0) return false;

    const stability = this.checkWindStability(measurements);

    if (!stability.stable) {
      console.log(`⏸️  Not notifying: ${stability.reason}`);
      return false;
    }

    console.log(`✓ Wind stable for 20 minutes: avg=${stability.avgSpeed}kn, dir_var=${stability.directionVariance}°, gusts=${stability.gustDiff}kn, trend=${stability.trendChange}kn`);
    return true;
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
   * @param {Array} measurements - Array of recent wind measurements (last 20+ minutes)
   */
  async sendNotifications(measurements) {
    if (!this.shouldNotify(measurements)) {
      return { sent: 0, reason: 'Conditions not met' };
    }

    let sentCount = 0;
    const now = new Date().toISOString();

    // Get current wind data (latest measurement)
    const windData = measurements[measurements.length - 1];
    const currentSpeed = this.getWindSpeed(windData);
    const avgSpeed = measurements.slice(-4).reduce((sum, m) => sum + this.getWindSpeed(m), 0) / 4;

    // Prepare notification payload
    const payload = JSON.stringify({
      title: '🌬️ Отличные условия для кайтинга!',
      body: `Ветер устойчиво держится ${avgSpeed.toFixed(1)} узлов последние 20 минут. Время на воду! 🪁`,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      url: '/',
      windSpeed: currentSpeed,
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
        console.log(`   Wind: ${avgSpeed.toFixed(1)} knots (stable for 20 min)`);

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
        speed: currentSpeed,
        avgSpeed: avgSpeed.toFixed(1),
        stable: true
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
