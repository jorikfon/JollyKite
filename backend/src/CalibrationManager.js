import fs from 'fs';

/**
 * CalibrationManager - manages wind direction calibration offset
 * Stores offset in a JSON file and applies it to wind direction data
 */
export class CalibrationManager {
  constructor(filePath) {
    this.filePath = filePath;
    this.data = { windDirOffset: 0 };
    this.load();
  }

  /**
   * Load calibration data from file
   */
  load() {
    try {
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf8');
        this.data = JSON.parse(raw);
      } else {
        this.save();
      }
    } catch (error) {
      console.warn('CalibrationManager: could not load, using defaults:', error.message);
      this.save();
    }
  }

  /**
   * Save calibration data to file
   */
  save() {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2), 'utf8');
    } catch (error) {
      console.error('CalibrationManager: could not save:', error.message);
    }
  }

  /**
   * Get current wind direction offset
   * @returns {number} Offset in degrees (-180 to +180)
   */
  getOffset() {
    return this.data.windDirOffset || 0;
  }

  /**
   * Set wind direction offset
   * @param {number} offset - Offset in degrees (-180 to +180)
   * @returns {boolean} Success
   */
  setOffset(offset) {
    const value = parseInt(offset, 10);
    if (isNaN(value) || value < -180 || value > 180) {
      return false;
    }
    this.data.windDirOffset = value;
    this.save();
    return true;
  }

  /**
   * Apply offset to a wind direction value
   * @param {number} direction - Raw direction in degrees (0-360)
   * @returns {number} Corrected direction (0-359)
   */
  applyOffset(direction) {
    if (direction === null || direction === undefined) return direction;
    const offset = this.getOffset();
    if (offset === 0) return direction;
    return ((direction + offset) % 360 + 360) % 360;
  }
}
