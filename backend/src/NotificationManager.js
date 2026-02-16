import fs from 'fs';
import path from 'path';
import webpush from 'web-push';
import { APNsProvider } from './APNsProvider.js';

/**
 * NotificationManager - manages push notifications for wind conditions
 * Supports both Web Push (PWA) and APNs (iOS)
 * Sends notifications when wind speed exceeds 10 knots with increasing trend
 * Maximum once per day per subscription
 */
export class NotificationManager {
  constructor(dbPath = './data/subscriptions.json') {
    this.subscriptionsPath = dbPath;
    this.notificationLogPath = dbPath.replace('subscriptions.json', 'notification_log.json');
    this.subscriptions = [];
    this.notificationLog = {};

    // Configure web-push with VAPID keys
    webpush.setVapidDetails(
      'mailto:support@jollykite.com',
      'BKbAJNbB1Rq1fphPamNav3wW4O9FFWvtZzD0NyxcEZwU_PtGv4_Sm7q2NQYfBBFQAlNb4pre7Z4Szhc2vJHYXYU', // Public Key
      '8bxTPyVz553qNZ9T4sXJrjKY3vyI2AVBQSXJDxBf9cA' // Private Key
    );

    // Initialize APNs provider for iOS push notifications
    this.apns = new APNsProvider();

    this.loadSubscriptions();
    this.loadNotificationLog();
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

  loadNotificationLog() {
    try {
      if (fs.existsSync(this.notificationLogPath)) {
        const data = fs.readFileSync(this.notificationLogPath, 'utf8');
        this.notificationLog = JSON.parse(data);
        console.log(`✓ Loaded notification log (${Object.keys(this.notificationLog).length} entries)`);
      }
    } catch (error) {
      console.error('Error loading notification log:', error.message);
      this.notificationLog = {};
    }
  }

  saveNotificationLog() {
    try {
      const dir = path.dirname(this.notificationLogPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.notificationLogPath, JSON.stringify(this.notificationLog, null, 2));
    } catch (error) {
      console.error('Error saving notification log:', error.message);
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
   * Get current date string in Bangkok timezone (YYYY-MM-DD)
   */
  getBangkokDateString(date = new Date()) {
    return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
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
   * Check if wind conditions are stable over the last 15 minutes
   * Requirements:
   * - Speed >= 8 knots in ALL measurements
   * - Direction stable (variance <= 45°)
   * - Gusts not critical (max - avg <= 8 knots)
   * - Trend is increasing or stable (not decreasing sharply)
   */
  checkWindStability(measurements) {
    if (!measurements || measurements.length < 3) {
      return { stable: false, reason: 'Insufficient data (need at least 3 measurements)' };
    }

    // Take last 3 measurements (15 minutes with 5-min intervals)
    const recent = measurements.slice(-3);

    // 1. Check if ALL measurements have speed >= 8 knots
    const allAboveThreshold = recent.every(m => this.getWindSpeed(m) >= 8);
    if (!allAboveThreshold) {
      const speeds = recent.map(m => this.getWindSpeed(m).toFixed(1)).join(', ');
      return { stable: false, reason: `Wind speed below 8 knots in last 15 minutes (speeds: ${speeds})` };
    }

    // 2. Check direction stability (variance <= 45°)
    const directions = recent.map(m => this.getWindDirection(m));
    const directionVariance = this.calculateDirectionVariance(directions);
    if (directionVariance > 45) {
      return { stable: false, reason: `Direction too variable (${directionVariance.toFixed(1)}°)` };
    }

    // 3. Check gusts are not critical (difference between max gust and avg speed <= 8 knots)
    const avgSpeed = recent.reduce((sum, m) => sum + this.getWindSpeed(m), 0) / recent.length;
    const maxGust = Math.max(...recent.map(m => this.getWindGust(m)));
    const gustDiff = maxGust - avgSpeed;
    if (gustDiff > 8) {
      return { stable: false, reason: `Gusts too strong (${gustDiff.toFixed(1)} knots difference)` };
    }

    // 4. Check trend is not decreasing sharply
    const firstSpeed = this.getWindSpeed(recent[0]);
    const lastSpeed = this.getWindSpeed(recent[recent.length - 1]);
    const trendChange = lastSpeed - firstSpeed;
    if (trendChange < -2) { // Allow minor fluctuations (-2 knots)
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

    console.log(`✓ Wind stable for 15 minutes: avg=${stability.avgSpeed}kn, dir_var=${stability.directionVariance}°, gusts=${stability.gustDiff}kn, trend=${stability.trendChange}kn`);
    return true;
  }

  /**
   * Check if subscription was already notified today
   */
  canNotifyToday(subscriptionId) {
    const lastNotification = this.notificationLog[subscriptionId];
    if (!lastNotification) return true;

    const lastTime = new Date(lastNotification);

    // Compare dates in Bangkok timezone
    return this.getBangkokDateString(lastTime) !== this.getBangkokDateString();
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
    const recent = measurements.slice(-3);
    const avgSpeed = recent.reduce((sum, m) => sum + this.getWindSpeed(m), 0) / recent.length;

    // Prepare notification payload
    const payload = JSON.stringify({
      title: '🌬️ Отличные условия для кайтинга!',
      body: `Ветер устойчиво держится ${avgSpeed.toFixed(1)} узлов последние 15 минут. Время на воду! 🪁`,
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
        console.log(`   Wind: ${avgSpeed.toFixed(1)} knots (stable for 15 min)`);

        // Mark as notified and persist to disk
        this.notificationLog[subId] = now;
        this.saveNotificationLog();
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

    // Send to iOS devices via APNs
    let apnsResult = { sent: 0, failed: 0, total: 0 };
    if (this.apns.enabled) {
      apnsResult = await this.apns.sendToAll(
        '🌬️ Отличные условия для кайтинга!',
        `Ветер устойчиво держится ${avgSpeed.toFixed(1)} узлов последние 15 минут. Время на воду! 🪁`,
        currentSpeed,
        parseFloat(avgSpeed.toFixed(1))
      );
      if (apnsResult.sent > 0) {
        console.log(`📱 APNs: ${apnsResult.sent} iOS notifications sent`);
      }
    }

    return {
      sent: sentCount + apnsResult.sent,
      webPush: sentCount,
      apns: apnsResult.sent,
      total: this.subscriptions.length + this.apns.devices.length,
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
        return this.getBangkokDateString(lastTime) === this.getBangkokDateString();
      }).length,
      apns: this.apns.getStats()
    };
  }

  /**
   * Reset daily notification log (called at midnight)
   */
  resetDailyLog() {
    const todayBangkok = this.getBangkokDateString();
    const keysToDelete = [];

    for (const [key, value] of Object.entries(this.notificationLog)) {
      const lastTime = new Date(value);
      if (this.getBangkokDateString(lastTime) !== todayBangkok) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => delete this.notificationLog[key]);
    this.saveNotificationLog();
    console.log(`✓ Cleaned up ${keysToDelete.length} old notification records`);
  }
}
