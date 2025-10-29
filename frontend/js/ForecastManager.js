class ForecastManager {
    constructor() {
        this.forecastContainer = null;
    }

    init() {
        this.forecastContainer = document.getElementById('windForecast');
        if (!this.forecastContainer) {
            console.error('Forecast container not found');
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
    createSmoothPath(points, width, height, maxValue) {
        if (points.length === 0) return '';

        // Scale points to SVG coordinates
        const scaledPoints = points.map((p, i) => ({
            x: (i / (points.length - 1)) * width,
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
     * Find top N peaks in data array
     * Returns array of {index, value} objects
     */
    findPeaks(data, topN = 5) {
        const peaks = data.map((value, index) => ({ index, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, Math.min(topN, data.length));
        return peaks;
    }

    showLoading() {
        if (this.forecastContainer) {
            this.forecastContainer.innerHTML = `
                <div class="text-center py-8">
                    <div class="inline-block w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin mb-3"></div>
                    <p class="text-white/80">Загружаем прогноз ветра...</p>
                </div>
            `;
        }
    }

    showError(error) {
        if (this.forecastContainer) {
            this.forecastContainer.innerHTML = `
                <div class="forecast-loading">
                    <p class="text-red-400">Ошибка загрузки прогноза: ${error.message}</p>
                </div>
            `;
        }
    }

    displayForecast(hoursData) {
        if (!this.forecastContainer) return;

        // Включаем все часы с 6:00 до 19:00 включительно
        const filteredHours = hoursData.filter(hour => {
            const hourTime = hour.time;
            return hourTime >= 6 && hourTime <= 19;
        });

        // Группировка по дням
        const dayGroups = {};
        filteredHours.forEach(hour => {
            const dayKey = hour.date.toDateString();
            if (!dayGroups[dayKey]) {
                dayGroups[dayKey] = [];
            }
            dayGroups[dayKey].push(hour);
        });

        let forecastHTML = '';
        Object.entries(dayGroups).forEach(([dayKey, group], dayIndex) => {
            const dayName = this.getDayName(new Date(dayKey));

            // Extract data for smooth curves
            const windSpeeds = group.map(h => parseFloat(h.speed));
            const waveHeights = group.map(h => h.waveHeight !== undefined ? parseFloat(h.waveHeight) : 0);
            const times = group.map(h => h.time);

            // SVG dimensions
            const width = 1000;  // Increased for better text spacing
            const windHeight = 80;
            const waveHeight = 60;
            const totalHeight = windHeight + waveHeight + 10; // 10px gap
            const padding = { top: 35, right: 30, bottom: 40, left: 50 };  // More padding for text
            const chartWidth = width - padding.left - padding.right;

            // Find max values for scaling
            const maxWindSpeed = Math.max(...windSpeeds) * 1.1;
            const maxWaveHeight = Math.max(...waveHeights, 0.5) * 1.2;

            // Create smooth paths
            const windPath = this.createSmoothPath(windSpeeds, chartWidth, windHeight, maxWindSpeed);
            const windGradientId = `windGradient${dayIndex}`;
            const windGradient = this.createGradient(windSpeeds, windGradientId);

            // Create filled area path for wind
            const windAreaPath = windPath + ` L ${chartWidth} ${windHeight} L 0 ${windHeight} Z`;

            // Create normal wave path (not mirrored - higher values = higher peaks)
            const wavePath = this.createSmoothPath(waveHeights, chartWidth, waveHeight, maxWaveHeight);
            const waveAreaPath = wavePath + ` L ${chartWidth} ${waveHeight} L 0 ${waveHeight} Z`;

            // Find peak values (top 5)
            const windPeaks = this.findPeaks(windSpeeds, 5);
            const wavePeaks = this.findPeaks(waveHeights, 5);

            // Generate time labels for every 2 hours (only even hours: 6, 8, 10, 12, 14, 16, 18)
            // Always show 18:00 as the last label even if data goes to 19:00
            const timeLabels = [];
            group.forEach((hour, i) => {
                if (hour.time % 2 === 0 && hour.time <= 18) {
                    const x = (i / (group.length - 1)) * chartWidth;
                    timeLabels.push({ hour: hour.time, x });
                }
            });

            // If we have 19:00 data but didn't add 18:00 label, ensure we have it
            if (group.length > 0 && group[group.length - 1].time === 19) {
                const has18Label = timeLabels.some(l => l.hour === 18);
                if (!has18Label) {
                    // Find 18:00 in data
                    const index18 = group.findIndex(h => h.time === 18);
                    if (index18 !== -1) {
                        const x = (index18 / (group.length - 1)) * chartWidth;
                        timeLabels.push({ hour: 18, x });
                        timeLabels.sort((a, b) => a.hour - b.hour);
                    }
                }
            }

            forecastHTML += `
                <div class="mb-8">
                    <div class="text-sm font-semibold text-white mb-3 text-center">
                        ${dayName}
                    </div>
                    <div style="position: relative; width: 100%;">
                        <svg width="100%" viewBox="0 0 ${width} ${totalHeight + padding.top + padding.bottom}" preserveAspectRatio="none" style="display: block;">
                            <defs>
                                ${windGradient}
                                <linearGradient id="waveGradient${dayIndex}" x1="0%" y1="100%" x2="0%" y2="0%">
                                    <stop offset="0%" stop-color="#87CEEB" stop-opacity="0.8"/>
                                    <stop offset="50%" stop-color="#4682B4" stop-opacity="0.6"/>
                                    <stop offset="100%" stop-color="#1E90FF" stop-opacity="0.4"/>
                                </linearGradient>
                                <filter id="glow">
                                    <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
                                    <feMerge>
                                        <feMergeNode in="coloredBlur"/>
                                        <feMergeNode in="SourceGraphic"/>
                                    </feMerge>
                                </filter>
                            </defs>

                            <g transform="translate(${padding.left}, ${padding.top})">
                                <!-- Wind section -->
                                <g>
                                    <!-- Grid lines for wind -->
                                    ${[0, 0.5, 1].map(ratio => `
                                        <line x1="0" y1="${windHeight * ratio}" x2="${chartWidth}" y2="${windHeight * ratio}"
                                              stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="5,5"/>
                                    `).join('')}

                                    <!-- Filled area under wind curve -->
                                    <path d="${windAreaPath}" fill="url(#${windGradientId})" opacity="0.6"/>

                                    <!-- Smooth wind curve line -->
                                    <path d="${windPath}" fill="none" stroke="url(#${windGradientId})"
                                          stroke-width="3" filter="url(#glow)"/>

                                    <!-- Wind speed labels -->
                                    ${[0, maxWindSpeed * 0.5, maxWindSpeed].map((speed, i) => `
                                        <text x="-5" y="${windHeight - (speed / maxWindSpeed) * windHeight + 5}"
                                              text-anchor="end" fill="rgba(255,255,255,0.7)" font-size="10">
                                            ${speed.toFixed(0)}
                                        </text>
                                    `).join('')}

                                    <!-- Wind peak markers -->
                                    ${windPeaks.map((peak, i) => {
                                        const x = (peak.index / (windSpeeds.length - 1)) * chartWidth;
                                        const y = windHeight - (peak.value / maxWindSpeed) * windHeight;
                                        return `
                                            <g>
                                                <circle cx="${x}" cy="${y}" r="5" fill="${this.getWindColor(peak.value)}"
                                                        stroke="white" stroke-width="2" opacity="0.95"/>
                                                <circle cx="${x}" cy="${y}" r="7" fill="none"
                                                        stroke="white" stroke-width="1" opacity="0.6"/>
                                                <text x="${x}" y="${y - 12}" text-anchor="middle"
                                                      fill="white" font-size="12" font-weight="700"
                                                      style="text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">
                                                    ${peak.value.toFixed(1)}
                                                </text>
                                            </g>
                                        `;
                                    }).join('')}
                                </g>

                                <!-- Wave section (below wind) -->
                                <g transform="translate(0, ${windHeight + 10})">
                                    <!-- Filled area for waves -->
                                    <path d="${waveAreaPath}" fill="url(#waveGradient${dayIndex})" opacity="0.7"/>

                                    <!-- Smooth wave curve line -->
                                    <path d="${wavePath}" fill="none" stroke="#4682B4"
                                          stroke-width="2.5" opacity="0.9"/>

                                    <!-- Wave height labels -->
                                    <text x="-5" y="${waveHeight - 5}"
                                          text-anchor="end" fill="rgba(135,206,235,0.8)" font-size="10">
                                        ${maxWaveHeight.toFixed(1)}м
                                    </text>

                                    <!-- Wave peak markers (normal orientation - labels above) -->
                                    ${wavePeaks.map((peak, i) => {
                                        const x = (peak.index / (waveHeights.length - 1)) * chartWidth;
                                        // Normal Y position (higher waves = lower Y coordinate)
                                        const y = waveHeight - (peak.value / maxWaveHeight) * waveHeight;
                                        return `
                                            <g>
                                                <circle cx="${x}" cy="${y}" r="4" fill="#4682B4"
                                                        stroke="white" stroke-width="2" opacity="0.95"/>
                                                <circle cx="${x}" cy="${y}" r="6" fill="none"
                                                        stroke="rgba(135,206,235,0.8)" stroke-width="1" opacity="0.7"/>
                                                <text x="${x}" y="${y - 12}" text-anchor="middle"
                                                      fill="#87CEEB" font-size="11" font-weight="700"
                                                      style="text-shadow: 1px 1px 2px rgba(0,0,0,0.8);">
                                                    ${peak.value.toFixed(1)}м
                                                </text>
                                            </g>
                                        `;
                                    }).join('')}
                                </g>

                                <!-- Time labels -->
                                ${timeLabels.map(t => `
                                    <text x="${t.x}" y="${totalHeight + 20}" text-anchor="middle"
                                          fill="rgba(255,255,255,0.8)" font-size="12" font-weight="600">
                                        ${t.hour}:00
                                    </text>
                                `).join('')}
                            </g>
                        </svg>
                    </div>
                </div>
            `;
        });

        // Add legend once at the end for all days
        forecastHTML += `
            <div style="display: flex; justify-content: center; gap: 20px; margin-top: 15px; font-size: 0.75rem; color: rgba(255,255,255,0.85); padding: 12px; background: rgba(255,255,255,0.05); border-radius: 10px; max-width: 400px; margin-left: auto; margin-right: auto;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 24px; height: 4px; background: linear-gradient(to right, #00FF00, #FFD700); border-radius: 2px;"></div>
                    <span>Ветер (узлы)</span>
                </div>
                <div style="display: flex; align-items: center; gap: 8px;">
                    <div style="width: 24px; height: 4px; background: #4682B4; border-radius: 2px;"></div>
                    <span>Волны (м)</span>
                </div>
            </div>
        `;

        this.forecastContainer.innerHTML = forecastHTML;
    }

    getDayName(date) {
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dayAfterTomorrow = new Date(today);
        dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 2);

        const targetDate = new Date(date);
        
        if (targetDate.toDateString() === today.toDateString()) {
            return 'Сегодня';
        } else if (targetDate.toDateString() === tomorrow.toDateString()) {
            return 'Завтра';
        } else if (targetDate.toDateString() === dayAfterTomorrow.toDateString()) {
            return 'Послезавтра';
        } else {
            const options = { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'short' 
            };
            return targetDate.toLocaleDateString('ru-RU', options);
        }
    }

    // Метод для симуляции ветра (будет вызываться извне)
    setupSimulation(simulateCallback) {
        window.simulateWind = simulateCallback;
    }

    clear() {
        if (this.forecastContainer) {
            this.forecastContainer.innerHTML = '';
        }
    }
}

export default ForecastManager;