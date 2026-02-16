import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import http2 from 'http2';

/**
 * APNsProvider - sends push notifications to iOS devices via Apple Push Notification service
 * Uses HTTP/2 and JWT (no external dependencies)
 *
 * Setup:
 * 1. Create APNs Key in Apple Developer → Keys → (+) → Enable "Apple Push Notifications service"
 * 2. Download .p8 file, note Key ID and Team ID
 * 3. Set environment variables or place config in ./data/apns-config.json:
 *    { "keyFile": "./data/AuthKey_XXXXXXXX.p8", "keyId": "XXXXXXXX", "teamId": "XXXXXXXXXX", "bundleId": "com.jollykite.app" }
 */
export class APNsProvider {
  constructor(configPath = './data/apns-config.json') {
    this.configPath = configPath;
    this.devicesPath = './data/apns-devices.json';
    this.devices = [];
    this.jwtToken = null;
    this.jwtIssuedAt = 0;
    this.config = null;
    this.enabled = false;

    this.loadConfig();
    this.loadDevices();
  }

  loadConfig() {
    // Try environment variables first
    const keyFile = process.env.APNS_KEY_FILE;
    const keyId = process.env.APNS_KEY_ID;
    const teamId = process.env.APNS_TEAM_ID;
    const bundleId = process.env.APNS_BUNDLE_ID || 'com.jollykite.app';

    if (keyFile && keyId && teamId) {
      this.config = { keyFile, keyId, teamId, bundleId };
    } else {
      // Try config file
      try {
        if (fs.existsSync(this.configPath)) {
          const data = fs.readFileSync(this.configPath, 'utf8');
          this.config = JSON.parse(data);
          if (!this.config.bundleId) this.config.bundleId = 'com.jollykite.app';
        }
      } catch (error) {
        console.log('⚠ APNs config not found, iOS push disabled');
        return;
      }
    }

    if (!this.config) {
      console.log('⚠ APNs not configured — iOS push notifications disabled');
      console.log('  To enable: create ./data/apns-config.json with keyFile, keyId, teamId');
      return;
    }

    // Verify key file exists
    try {
      const keyPath = path.resolve(this.config.keyFile);
      if (!fs.existsSync(keyPath)) {
        console.log(`⚠ APNs key file not found: ${keyPath}`);
        return;
      }
      this.privateKey = fs.readFileSync(keyPath, 'utf8');
      this.enabled = true;
      console.log(`✓ APNs configured (team: ${this.config.teamId}, key: ${this.config.keyId})`);
    } catch (error) {
      console.log(`⚠ APNs key file error: ${error.message}`);
    }
  }

  loadDevices() {
    try {
      if (fs.existsSync(this.devicesPath)) {
        const data = fs.readFileSync(this.devicesPath, 'utf8');
        this.devices = JSON.parse(data);
        console.log(`✓ Loaded ${this.devices.length} APNs device tokens`);
      }
    } catch (error) {
      console.error('Error loading APNs devices:', error.message);
      this.devices = [];
    }
  }

  saveDevices() {
    try {
      const dir = path.dirname(this.devicesPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.devicesPath, JSON.stringify(this.devices, null, 2));
    } catch (error) {
      console.error('Error saving APNs devices:', error.message);
    }
  }

  /**
   * Register an iOS device token
   */
  addDevice(deviceToken) {
    const exists = this.devices.some(d => d.token === deviceToken);
    if (!exists) {
      this.devices.push({
        token: deviceToken,
        createdAt: new Date().toISOString()
      });
      this.saveDevices();
      console.log(`✓ APNs device registered: ${deviceToken.substring(0, 16)}...`);
      return true;
    }
    return false;
  }

  /**
   * Remove an iOS device token
   */
  removeDevice(deviceToken) {
    const initialLength = this.devices.length;
    this.devices = this.devices.filter(d => d.token !== deviceToken);
    if (this.devices.length < initialLength) {
      this.saveDevices();
      console.log(`✓ APNs device removed: ${deviceToken.substring(0, 16)}...`);
      return true;
    }
    return false;
  }

  /**
   * Create JWT token for APNs authentication (cached for 50 minutes)
   */
  getJWT() {
    const now = Math.floor(Date.now() / 1000);

    // Reuse token if less than 50 minutes old (APNs tokens valid for 1 hour)
    if (this.jwtToken && (now - this.jwtIssuedAt) < 3000) {
      return this.jwtToken;
    }

    const header = Buffer.from(JSON.stringify({
      alg: 'ES256',
      kid: this.config.keyId
    })).toString('base64url');

    const claims = Buffer.from(JSON.stringify({
      iss: this.config.teamId,
      iat: now
    })).toString('base64url');

    const signable = `${header}.${claims}`;
    const sign = crypto.createSign('SHA256');
    sign.update(signable);
    const signature = sign.sign(this.privateKey, 'base64url');

    this.jwtToken = `${signable}.${signature}`;
    this.jwtIssuedAt = now;
    return this.jwtToken;
  }

  /**
   * Send push notification to a single device
   */
  sendToDevice(deviceToken, payload) {
    return new Promise((resolve, reject) => {
      const host = process.env.APNS_HOST || 'api.push.apple.com';
      const client = http2.connect(`https://${host}`);

      client.on('error', (err) => {
        client.close();
        reject(err);
      });

      const headers = {
        ':method': 'POST',
        ':path': `/3/device/${deviceToken}`,
        'authorization': `bearer ${this.getJWT()}`,
        'apns-topic': this.config.bundleId,
        'apns-push-type': 'alert',
        'apns-priority': '10',
        'apns-expiration': '0',
        'content-type': 'application/json',
      };

      const req = client.request(headers);

      let responseData = '';
      let statusCode;

      req.on('response', (headers) => {
        statusCode = headers[':status'];
      });

      req.on('data', (chunk) => {
        responseData += chunk;
      });

      req.on('end', () => {
        client.close();
        if (statusCode === 200) {
          resolve({ success: true });
        } else {
          let reason = 'Unknown';
          try {
            const body = JSON.parse(responseData);
            reason = body.reason || reason;
          } catch (_) {}
          reject({ statusCode, reason, deviceToken });
        }
      });

      req.write(JSON.stringify(payload));
      req.end();
    });
  }

  /**
   * Send push notification to all registered iOS devices
   * @returns {Object} { sent, failed, total }
   */
  async sendToAll(title, body, windSpeed, avgSpeed) {
    if (!this.enabled || this.devices.length === 0) {
      return { sent: 0, failed: 0, total: this.devices.length };
    }

    const payload = {
      aps: {
        alert: { title, body },
        sound: 'default',
        badge: 1,
        'thread-id': 'wind-conditions',
        'interruption-level': 'time-sensitive'
      },
      windSpeed,
      avgSpeed,
      timestamp: new Date().toISOString()
    };

    let sent = 0;
    let failed = 0;

    for (const device of [...this.devices]) {
      try {
        await this.sendToDevice(device.token, payload);
        sent++;
        console.log(`📱 APNs sent to: ${device.token.substring(0, 16)}...`);
      } catch (error) {
        failed++;
        console.error(`✗ APNs error for ${device.token.substring(0, 16)}...: ${error.reason || error.message}`);

        // Remove invalid tokens
        if (error.statusCode === 410 || error.reason === 'BadDeviceToken' || error.reason === 'Unregistered') {
          console.log(`🗑️  Removing invalid APNs token: ${device.token.substring(0, 16)}...`);
          this.removeDevice(device.token);
        }
      }
    }

    return { sent, failed, total: this.devices.length + failed };
  }

  getStats() {
    return {
      enabled: this.enabled,
      totalDevices: this.devices.length
    };
  }
}
