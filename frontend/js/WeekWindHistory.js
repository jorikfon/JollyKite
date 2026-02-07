/**
 * WeekWindHistory - displays wind history for the last 7 days
 * Shows actual wind data for each day from 6:00 to 19:00
 */
class WeekWindHistory {
    constructor(i18n = null) {
        this.i18n = i18n;
        this.container = null;
        this.apiUrl = '/api';
    }

    init() {
        this.container = document.getElementById('weekWindHistory');
        if (!this.container) {
            console.error('WeekWindHistory container not found');
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
     * Fetch 7-day history data from backend
     */
    async fetchHistoryData() {
        try {
            const response = await fetch(`${this.apiUrl}/wind/history/week`);
            if (!response.ok) {
                throw new Error(`API returned ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching week history data:', error);
            throw error;
        }
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (date.toDateString() === today.toDateString()) {
            return this.i18n ? this.i18n.t('forecast.today') : 'Сегодня';
        } else if (date.toDateString() === yesterday.toDateString()) {
            // For yesterday, just use localized short date format
            const locale = this.i18n ? this.i18n.getFullLocale() : 'ru-RU';
            const options = {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            };
            return date.toLocaleDateString(locale, options);
        } else {
            const locale = this.i18n ? this.i18n.getFullLocale() : 'ru-RU';
            const options = {
                weekday: 'short',
                day: 'numeric',
                month: 'short'
            };
            return date.toLocaleDateString(locale, options);
        }
    }

    /**
     * Display the 7-day history
     */
    async displayHistory() {
        if (!this.container) {
            console.error('WeekWindHistory: container not found');
            return;
        }

        try {
            console.log('WeekWindHistory: Starting to load history...');
            this.showLoading();

            console.log('WeekWindHistory: Fetching data from API...');
            const historyData = await this.fetchHistoryData();
            console.log('WeekWindHistory: Received data:', historyData);

            if (!historyData || !Array.isArray(historyData) || historyData.length === 0) {
                console.warn('WeekWindHistory: No data received');
                this.showNoData();
                return;
            }

            // Filter out today's data (it's already shown in "Today's Wind Timeline")
            const today = new Date().toDateString();
            const filteredHistoryData = historyData.filter(dayData => {
                const dayDate = new Date(dayData.date).toDateString();
                return dayDate !== today;
            });

            if (filteredHistoryData.length === 0) {
                console.warn('WeekWindHistory: No historical data (only today)');
                this.showNoData();
                return;
            }

            // Get current unit for display
            const currentUnit = window.settings?.getSetting('windSpeedUnit') || 'knots';
            const unitSymbol = window.unitConverter?.getUnitSymbol(currentUnit) || 'kn';

            let html = '';

            // Process each day
            filteredHistoryData.forEach((dayData, dayIndex) => {
                const { date, data } = dayData;

                if (!data || data.length === 0) {
                    return; // Skip days with no data
                }

                // Sort data by time (earliest to latest) for correct graph display
                const sortedData = [...data].sort((a, b) => new Date(a.time) - new Date(b.time));

                // Extract wind speeds and times from sorted data
                const windSpeeds = sortedData.map(d => parseFloat(d.avg_speed || 0));
                const times = sortedData.map(d => {
                    const dt = new Date(d.time);
                    return dt.getHours() + dt.getMinutes() / 60;
                });

                // Calculate time positions (6:00 = 0, 19:00 = 1)
                const timePositions = times.map(t => (t - 6) / 13);

                // SVG dimensions (height increased for better visibility on mobile)
                const width = 1000;
                const height = 195;
                const padding = { top: 35, right: 30, bottom: 40, left: 50 };
                const chartWidth = width - padding.left - padding.right;
                const chartHeight = height - padding.top - padding.bottom;

                // Find max value for scaling
                const maxWindSpeed = Math.max(...windSpeeds, 20) * 1.1;

                // Create smooth paths
                const windPath = this.createSmoothPath(windSpeeds, timePositions, chartWidth, chartHeight, maxWindSpeed);
                const windGradientId = `weekWindGradient${dayIndex}`;
                const windGradient = this.createGradient(windSpeeds, windGradientId);

                // Create filled area path
                const windAreaPath = windPath + ` L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;

                // Find peak wind speeds (top 3) with minimum 30-minute interval
                const MIN_PEAK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes in milliseconds

                // Create candidates sorted by speed (highest first)
                const peakCandidates = windSpeeds
                    .map((speed, index) => ({
                        speed,
                        index,
                        timePos: timePositions[index],
                        timestamp: new Date(sortedData[index].time).getTime()
                    }))
                    .sort((a, b) => b.speed - a.speed);

                // Filter peaks with minimum time interval
                const peaks = [];
                for (const candidate of peakCandidates) {
                    // Check if this peak is far enough from already selected peaks
                    const isFarEnough = peaks.every(peak =>
                        Math.abs(candidate.timestamp - peak.timestamp) >= MIN_PEAK_INTERVAL_MS
                    );

                    if (isFarEnough) {
                        peaks.push(candidate);
                    }

                    // Stop when we have 3 peaks
                    if (peaks.length >= 3) {
                        break;
                    }
                }

                // Generate time labels (every 3 hours for better readability on mobile)
                const timeLabels = [];
                for (let hour = 6; hour <= 18; hour += 3) {
                    const pos = (hour - 6) / 13;
                    timeLabels.push({ hour, x: pos * chartWidth });
                }

                html += `
                    <div style="margin-bottom: 30px;">
                        <div style="font-size: 0.9rem; font-weight: 600; color: rgba(255,255,255,0.9); margin-bottom: 12px; text-align: center;">
                            ${this.formatDate(date)}
                        </div>
                        <div style="position: relative; width: 100%;">
                            <svg width="100%" viewBox="0 0 ${width} ${height + padding.top + padding.bottom}" preserveAspectRatio="xMinYMid meet" style="display: block;">
                                <defs>
                                    ${windGradient}
                                    <filter id="glow">
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
                                        <line x1="0" y1="${chartHeight * ratio}" x2="${chartWidth}" y2="${chartHeight * ratio}"
                                              stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="5,5"/>
                                    `).join('')}

                                    <!-- Filled area under curve -->
                                    <path d="${windAreaPath}" fill="url(#${windGradientId})" opacity="0.6"/>

                                    <!-- Smooth curve line -->
                                    <path d="${windPath}" fill="none" stroke="url(#${windGradientId})"
                                          stroke-width="3" filter="url(#glow)"/>

                                    <!-- Wind speed labels -->
                                    ${[0, maxWindSpeed * 0.5, maxWindSpeed].map((speed, i) => {
                                        const displaySpeed = window.unitConverter ? window.unitConverter.convert(speed, 'knots', currentUnit) : speed;
                                        const label = i === 2 ? `${displaySpeed.toFixed(0)} ${unitSymbol}` : displaySpeed.toFixed(0);
                                        return `
                                        <text x="-5" y="${chartHeight - (speed / maxWindSpeed) * chartHeight + 5}"
                                              text-anchor="end" fill="rgba(255,255,255,0.7)" font-size="13">
                                            ${label}
                                        </text>
                                    `}).join('')}

                                    <!-- Peak markers -->
                                    ${peaks.map((peak, i) => {
                                        const x = peak.timePos * chartWidth;
                                        const y = chartHeight - (peak.speed / maxWindSpeed) * chartHeight;
                                        const displaySpeed = window.unitConverter ? window.unitConverter.convert(peak.speed, 'knots', currentUnit) : peak.speed;
                                        return `
                                            <g>
                                                <circle cx="${x}" cy="${y}" r="5" fill="${this.getWindColor(peak.speed)}"
                                                        stroke="white" stroke-width="2" opacity="0.95"/>
                                                <circle cx="${x}" cy="${y}" r="7" fill="none"
                                                        stroke="white" stroke-width="1" opacity="0.6"/>
                                                <text x="${x}" y="${y - 12}" text-anchor="middle"
                                                      fill="white" font-size="15" font-weight="700"
                                                      style="text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">
                                                    ${displaySpeed.toFixed(1)}
                                                </text>
                                            </g>
                                        `;
                                    }).join('')}

                                    <!-- Time labels -->
                                    ${timeLabels.map(t => `
                                        <text x="${t.x}" y="${chartHeight + 20}" text-anchor="middle"
                                              fill="rgba(255,255,255,0.8)" font-size="14" font-weight="600">
                                            ${t.hour}:00
                                        </text>
                                    `).join('')}
                                </g>
                            </svg>
                        </div>
                    </div>
                `;
            });

            this.container.innerHTML = html;

        } catch (error) {
            console.error('Error displaying week history:', error);
            this.showError(error);
        }
    }

    showLoading() {
        if (this.container) {
            this.container.innerHTML = `
                <div class="text-center py-6">
                    <div class="inline-block w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin mb-3"></div>
                    <p class="text-white/80 text-sm">Загружаем историю...</p>
                </div>
            `;
        }
    }

    showNoData() {
        if (this.container) {
            this.container.innerHTML = `
                <div class="text-center py-6">
                    <p class="text-white/70">Нет данных за последние 7 дней</p>
                </div>
            `;
        }
    }

    showError(error) {
        if (this.container) {
            this.container.innerHTML = `
                <div class="text-center py-6">
                    <p class="text-red-400">Ошибка загрузки истории: ${error.message}</p>
                </div>
            `;
        }
    }
}

export default WeekWindHistory;
