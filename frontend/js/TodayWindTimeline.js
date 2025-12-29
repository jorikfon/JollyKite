import WindUtils from './utils/WindUtils.js';
import UnitConverter from './utils/UnitConverter.js';

/**
 * TodayWindTimeline - displays combined history + forecast for today
 * Shows actual wind data transitioning to extrapolated forecast
 * with a bright marker separating the two
 */
class TodayWindTimeline {
    constructor(i18n = null, settings = null) {
        this.i18n = i18n;
        this.settings = settings;
        this.container = null;
        this.apiUrl = '/api';
    }

    init() {
        this.container = document.getElementById('todayWindTimeline');
        if (!this.container) {
            console.error('TodayWindTimeline container not found');
            return false;
        }
        return true;
    }

    /**
     * Get wind color based on speed
     */
    getWindColor(speed) {
        const knots = parseFloat(speed) || 0;
        if (knots < 5) return '#87CEEB';      // Голубой - слабый
        if (knots < 10) return '#00CED1';     // Бирюзовый
        if (knots < 15) return '#00FF00';     // Зелёный - отлично
        if (knots < 20) return '#FFD700';     // Жёлтый - хорошо
        if (knots < 25) return '#FFA500';     // Оранжевый
        if (knots < 30) return '#FF4500';     // Красно-оранжевый
        return '#8B0000';                      // Тёмно-красный - опасно
    }

    /**
     * Create smooth curve path using Catmull-Rom spline
     */
    createSmoothPath(points, timePositions, width, height, maxValue) {
        if (points.length === 0) return '';

        // Scale points to SVG coordinates using actual time positions
        const scaledPoints = points.map((p, i) => ({
            x: timePositions[i] * width,
            y: height - (p / maxValue) * height
        }));

        // Create smooth curve using Catmull-Rom
        let pathData = `M ${scaledPoints[0].x} ${scaledPoints[0].y}`;

        for (let i = 0; i < scaledPoints.length - 1; i++) {
            const p0 = scaledPoints[Math.max(0, i - 1)];
            const p1 = scaledPoints[i];
            const p2 = scaledPoints[i + 1];
            const p3 = scaledPoints[Math.min(scaledPoints.length - 1, i + 2)];

            // Catmull-Rom to Bezier conversion
            const cp1x = p1.x + (p2.x - p0.x) / 6;
            const cp1y = p1.y + (p2.y - p0.y) / 6;
            const cp2x = p2.x - (p3.x - p1.x) / 6;
            const cp2y = p2.y - (p3.y - p1.y) / 6;

            pathData += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
        }

        return pathData;
    }

    /**
     * Create gradient definition based on wind speeds
     */
    createGradient(points, id) {
        let stops = '';
        points.forEach((p, i) => {
            const offset = (i / (points.length - 1)) * 100;
            const color = this.getWindColor(p);
            stops += `<stop offset="${offset}%" stop-color="${color}" stop-opacity="0.8"/>`;
        });
        return `<linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="0%">${stops}</linearGradient>`;
    }

    /**
     * Fetch combined timeline data from backend
     */
    async fetchTimelineData() {
        try {
            const response = await fetch(`${this.apiUrl}/wind/today/full?interval=5`);
            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching timeline data:', error);
            throw error;
        }
    }

    /**
     * Display the combined timeline
     */
    async displayTimeline() {
        console.log('🎬 TodayWindTimeline.displayTimeline() started');

        if (!this.container) {
            console.error('❌ Container not found!');
            return;
        }

        try {
            // Show loading state
            this.showLoading();

            console.log('📡 Fetching timeline data...');
            const data = await this.fetchTimelineData();
            console.log('✅ Timeline data received:', data);

            if (!data.history || data.history.length === 0) {
                this.showMessage(this.i18n ? this.i18n.t('history.noData') : 'Нет данных за сегодня');
                return;
            }

            // Combine history and forecast into single timeline
            const timeline = [];
            const currentTime = data.currentTime;

            // Add history data
            data.history.forEach(h => {
                timeline.push({
                    hour: h.hour,
                    minute: h.minute || 0,
                    speed: h.avg_speed,
                    gust: h.max_gust,
                    type: 'history',
                    measurements: h.measurements
                });
            });

            // Save index where forecast starts (right after history)
            const forecastStartIndex = timeline.length;

            // Add forecast data (extrapolated) - directly from API
            if (data.forecast && data.forecast.length > 0) {
                // Get last history point for interpolation
                const lastHistory = timeline.length > 0 ? timeline[timeline.length - 1] : null;
                const firstForecast = data.forecast[0];

                // Add interpolated points between history and forecast if there's a gap
                if (lastHistory && firstForecast) {
                    const forecastDate = new Date(firstForecast.date);
                    const firstForecastHour = forecastDate.getHours();
                    const lastHistoryTime = lastHistory.hour * 60 + lastHistory.minute;
                    const firstForecastTime = firstForecastHour * 60 + forecastDate.getMinutes();

                    // If gap is more than 30 minutes, add intermediate points
                    if (firstForecastTime - lastHistoryTime > 30) {
                        // Interpolate every 30 minutes
                        for (let t = lastHistoryTime + 30; t < firstForecastTime; t += 30) {
                            const hour = Math.floor(t / 60);
                            const minute = t % 60;

                            // Linear interpolation of speed
                            const ratio = (t - lastHistoryTime) / (firstForecastTime - lastHistoryTime);
                            const speed = lastHistory.speed + (firstForecast.speed - lastHistory.speed) * ratio;
                            const gust = lastHistory.gust + (firstForecast.gust - lastHistory.gust) * ratio;

                            timeline.push({
                                hour,
                                minute,
                                speed,
                                gust,
                                type: 'forecast',
                                corrected: true,
                                interpolated: true
                            });
                        }
                    }
                }

                // Add all forecast points
                data.forecast.forEach(f => {
                    const forecastDate = new Date(f.date);
                    timeline.push({
                        hour: forecastDate.getHours(),
                        minute: forecastDate.getMinutes(),
                        speed: f.speed,
                        gust: f.gust,
                        type: 'forecast',
                        corrected: f.corrected
                    });
                });
            }

            // Sort by time
            timeline.sort((a, b) => {
                const timeA = a.hour * 60 + a.minute;
                const timeB = b.hour * 60 + b.minute;
                return timeA - timeB;
            });

            console.log(`📊 Timeline: ${timeline.length} points (history: ${forecastStartIndex}, forecast: ${timeline.length - forecastStartIndex})`);
            console.log(`⏰ Time range: ${timeline[0]?.hour}:${timeline[0]?.minute} → ${timeline[timeline.length-1]?.hour}:${timeline[timeline.length-1]?.minute}`);
            console.log(`🔢 Correction factor: ${data.correctionFactor}`);

            this.renderTimeline(timeline, forecastStartIndex, currentTime, data.correctionFactor);
        } catch (error) {
            this.showError(error);
        }
    }

    /**
     * Find peak values in history data with minimum 30-minute spacing
     */
    findPeaks(timeline, forecastStartIndex) {
        if (forecastStartIndex <= 0) return [];

        const historyData = timeline.slice(0, forecastStartIndex);
        if (historyData.length === 0) return [];

        // Create array of peaks with their indices
        const peaks = historyData
            .map((point, index) => ({
                index,
                speed: point.speed,
                hour: point.hour,
                minute: point.minute,
                timeMinutes: point.hour * 60 + point.minute
            }))
            .sort((a, b) => b.speed - a.speed); // Sort by speed descending

        // Select top peaks with minimum 30-minute spacing
        const selectedPeaks = [];
        const minSpacingMinutes = 30;

        for (const peak of peaks) {
            // Check if this peak is at least 30 minutes away from all selected peaks
            const tooClose = selectedPeaks.some(selected =>
                Math.abs(peak.timeMinutes - selected.timeMinutes) < minSpacingMinutes
            );

            if (!tooClose) {
                selectedPeaks.push(peak);
                if (selectedPeaks.length >= 3) break; // Max 3 peaks
            }
        }

        // Sort by time for display
        return selectedPeaks.sort((a, b) => a.timeMinutes - b.timeMinutes);
    }

    /**
     * Render the timeline SVG
     */
    renderTimeline(timeline, forecastStartIndex, currentTime, correctionFactor) {
        if (timeline.length === 0) return;

        const speeds = timeline.map(t => t.speed);
        const maxSpeed = Math.max(...speeds) * 1.1;

        // Find peak values in history data
        const peaks = this.findPeaks(timeline, forecastStartIndex);

        const width = 1000;
        const height = 156;
        const padding = { top: 35, right: 30, bottom: 40, left: 50 };
        const chartWidth = width - padding.left - padding.right;

        // Time scale: 6:00 (360 min) to 19:00 (1140 min) = 780 minutes total
        const startTimeMinutes = 6 * 60; // 6:00
        const endTimeMinutes = 19 * 60;  // 19:00
        const totalMinutes = endTimeMinutes - startTimeMinutes;

        // Calculate time position for each point (0 to 1)
        const timePositions = timeline.map(t => {
            const timeMinutes = t.hour * 60 + t.minute;
            return (timeMinutes - startTimeMinutes) / totalMinutes;
        });

        // Create smooth path with time-based positions
        const windPath = this.createSmoothPath(speeds, timePositions, chartWidth, height, maxSpeed);
        const windGradient = this.createGradient(speeds, 'todayWindGradient');
        const windAreaPath = windPath + ` L ${chartWidth} ${height} L 0 ${height} Z`;

        // Calculate position of the divider (between history and forecast)
        let dividerX = null;
        if (forecastStartIndex > 0 && forecastStartIndex < timeline.length) {
            dividerX = timePositions[forecastStartIndex] * chartWidth;
        }

        // Generate time labels (every 2 hours from 6:00 to 18:00)
        const timeLabels = [];
        for (let hour = 6; hour <= 18; hour += 2) {
            const timeMinutes = hour * 60;
            const x = ((timeMinutes - startTimeMinutes) / totalMinutes) * chartWidth;
            timeLabels.push({ hour, x });
        }

        let html = `
            <div class="mb-6">
                <div style="position: relative; width: 100%;">
                    <svg width="100%" viewBox="0 0 ${width} ${height + padding.top + padding.bottom}" preserveAspectRatio="none" style="display: block;">
                        <defs>
                            ${windGradient}
                            <filter id="glowToday">
                                <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                <feMerge>
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                        </defs>

                        <g transform="translate(${padding.left}, ${padding.top})">
                            <!-- Grid lines -->
                            ${[0, 0.5, 1].map(ratio => `
                                <line x1="0" y1="${height * ratio}" x2="${chartWidth}" y2="${height * ratio}"
                                      stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="5,5"/>
                            `).join('')}

                            <!-- Filled area under wind curve -->
                            <path d="${windAreaPath}" fill="url(#todayWindGradient)" opacity="0.6"/>

                            <!-- Smooth wind curve line -->
                            <path d="${windPath}" fill="none" stroke="url(#todayWindGradient)"
                                  stroke-width="3" filter="url(#glowToday)"/>

                            <!-- Peak markers (only in history section) -->
                            ${peaks.map(peak => {
                                const peakX = timePositions[peak.index] * chartWidth;
                                const peakY = height - (peak.speed / maxSpeed) * height;

                                // Get current unit setting
                                const currentUnit = this.settings ? this.settings.getSetting('windSpeedUnit') : 'knots';
                                const unitShort = currentUnit === 'knots' ?
                                    (this.i18n ? this.i18n.t('units.knotsShort') : 'kn') :
                                    (this.i18n ? this.i18n.t('units.msShort') : 'm/s');

                                // Convert speed if needed
                                const displaySpeed = currentUnit === 'ms' ?
                                    UnitConverter.knotsToMs(peak.speed) :
                                    peak.speed;

                                const speedText = `${displaySpeed.toFixed(1)} ${unitShort}`;
                                const timeText = `${String(peak.hour).padStart(2, '0')}:${String(peak.minute).padStart(2, '0')}`;

                                return `
                                    <!-- Peak marker circle -->
                                    <circle cx="${peakX}" cy="${peakY}" r="6"
                                            fill="#FF6B6B" stroke="white" stroke-width="2"/>

                                    <!-- Peak value label -->
                                    <g transform="translate(${peakX}, ${peakY - 15})">
                                        <!-- Background rect for better readability -->
                                        <rect x="-28" y="-14" width="56" height="14"
                                              rx="3" fill="rgba(255, 107, 107, 0.9)"/>
                                        <!-- Speed text -->
                                        <text x="0" y="-4"
                                              text-anchor="middle"
                                              fill="white"
                                              font-size="11"
                                              font-weight="700">
                                            ${speedText}
                                        </text>
                                    </g>

                                    <!-- Time label below -->
                                    <text x="${peakX}" y="${peakY + 20}"
                                          text-anchor="middle"
                                          fill="rgba(255, 107, 107, 0.9)"
                                          font-size="10"
                                          font-weight="600">
                                        ${timeText}
                                    </text>
                                `;
                            }).join('')}

                            <!-- Wind speed labels on Y axis -->
                            ${[0, maxSpeed * 0.5, maxSpeed].map((speed, i) => `
                                <text x="-5" y="${height - (speed / maxSpeed) * height + 5}"
                                      text-anchor="end" fill="rgba(255,255,255,0.7)" font-size="13">
                                    ${speed.toFixed(0)}
                                </text>
                            `).join('')}

                            ${dividerX !== null ? `
                                <!-- Divider line between history and forecast -->
                                <line x1="${dividerX}" y1="0" x2="${dividerX}" y2="${height}"
                                      stroke="#FFD700" stroke-width="2" stroke-dasharray="8,4" opacity="0.8"/>

                                <!-- Bright marker at divider -->
                                <g transform="translate(${dividerX}, ${height - (timeline[forecastStartIndex].speed / maxSpeed) * height})">
                                    <!-- Pulsing outer circle -->
                                    <circle r="12" fill="#FFD700" opacity="0.3">
                                        <animate attributeName="r" from="8" to="16" dur="2s" repeatCount="indefinite"/>
                                        <animate attributeName="opacity" from="0.5" to="0" dur="2s" repeatCount="indefinite"/>
                                    </circle>
                                    <!-- Main bright circle -->
                                    <circle r="8" fill="#FFD700" stroke="white" stroke-width="2"/>
                                    <!-- Inner glow -->
                                    <circle r="4" fill="white" opacity="0.8"/>
                                </g>

                                <!-- Labels -->
                                <text x="${dividerX - 5}" y="-8" text-anchor="end" fill="rgba(255,255,255,0.9)" font-size="14" font-weight="600">
                                    ${this.i18n ? this.i18n.t('history.actual') : 'Факт'}
                                </text>
                                <text x="${dividerX + 5}" y="-8" text-anchor="start" fill="rgba(255,215,0,0.9)" font-size="14" font-weight="600">
                                    ${this.i18n ? this.i18n.t('history.forecast') : 'Прогноз'} ${correctionFactor !== 1.0 ? `×${correctionFactor}` : ''}
                                </text>
                            ` : ''}

                            <!-- Time labels on X axis -->
                            ${timeLabels.map(t => `
                                <text x="${t.x}" y="${height + 20}" text-anchor="middle"
                                      fill="rgba(255,255,255,0.8)" font-size="15" font-weight="600">
                                    ${t.hour}:00
                                </text>
                            `).join('')}
                        </g>
                    </svg>
                </div>
            </div>
        `;

        this.container.innerHTML = html;
    }

    showLoading() {
        if (this.container) {
            this.container.innerHTML = `
                <div class="text-center py-8">
                    <div class="inline-block w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin mb-3"></div>
                    <p class="text-white/80">${this.i18n ? this.i18n.t('app.loading') : 'Загружаем данные...'}</p>
                </div>
            `;
        }
    }

    showMessage(message) {
        if (this.container) {
            this.container.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-white/70">${message}</p>
                </div>
            `;
        }
    }

    showError(error) {
        if (this.container) {
            const errorText = this.i18n ? this.i18n.t('history.loadingError') : 'Ошибка загрузки';
            this.container.innerHTML = `
                <div class="text-center py-8">
                    <p class="text-red-400">${errorText}: ${error.message}</p>
                </div>
            `;
        }
    }

    clear() {
        if (this.container) {
            this.container.innerHTML = '';
        }
    }
}

export default TodayWindTimeline;
