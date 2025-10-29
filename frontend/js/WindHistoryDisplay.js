/**
 * WindHistoryDisplay - displays today's wind history as a smooth gradient bar (6:00-20:00)
 * Uses 5-minute intervals for smooth visualization
 */
class WindHistoryDisplay {
    constructor() {
        this.historyContainer = null;
        this.titleElement = null;
        this.apiBaseUrl = '/api';
    }

    init() {
        this.historyContainer = document.getElementById('windHistory');
        this.titleElement = document.getElementById('windHistoryTitle');
        if (!this.historyContainer) {
            console.error('Wind history container not found');
            return false;
        }
        return true;
    }

    showLoading() {
        if (this.historyContainer) {
            this.historyContainer.innerHTML = `
                <div class="text-center py-8">
                    <div class="inline-block w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin mb-3"></div>
                    <p class="text-white/80">Загружаем историю ветра...</p>
                </div>
            `;
        }
    }

    showError(error) {
        if (this.historyContainer) {
            this.historyContainer.innerHTML = `
                <div class="text-center py-6">
                    <p class="text-red-400">Ошибка загрузки истории: ${error.message || 'Неизвестная ошибка'}</p>
                </div>
            `;
        }
    }

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
     * Fetch today's wind history from backend API
     * Requests data in 5-minute intervals for smooth gradient
     */
    async fetchTodayHistory() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/wind/today/gradient?start=6&end=19&interval=5`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching wind history:', error);
            throw error;
        }
    }

    /**
     * Create smooth curve path using Catmull-Rom spline
     */
    createSmoothPath(points, width, height, maxSpeed) {
        if (points.length === 0) return '';

        // Scale points to SVG coordinates
        const scaledPoints = points.map((p, i) => ({
            x: (i / (points.length - 1)) * width,
            y: height - (p.speed / maxSpeed) * height
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
            const color = this.getWindColor(p.speed);
            stops += `<stop offset="${offset}%" stop-color="${color}" stop-opacity="0.8"/>`;
        });
        return `<linearGradient id="${id}" x1="0%" y1="0%" x2="100%" y2="0%">${stops}</linearGradient>`;
    }

    /**
     * Display wind history as smooth wave with gradient fill
     */
    async displayHistory() {
        try {
            this.showLoading();
            const hourlyData = await this.fetchTodayHistory();

            if (!hourlyData || hourlyData.length === 0) {
                this.historyContainer.innerHTML = `
                    <div class="text-center py-6">
                        <p class="text-white/70">Данные о ветре за сегодня пока отсутствуют</p>
                        <p class="text-white/50 text-sm mt-2">Сбор данных начинается с 6:00</p>
                    </div>
                `;
                return;
            }

            // Prepare data points
            const startHour = 6;
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();

            // End hour is either 19:00 or current time (whichever is earlier)
            const endHour = Math.min(19, currentHour < 6 ? 19 : currentHour);
            const points = [];

            // Collect all data points up to current time
            hourlyData.forEach(d => {
                if (d.measurements > 0) {
                    const pointHour = parseInt(d.hour);
                    const pointMinute = parseInt(d.minute || 0);

                    // Only include points up to current time
                    if (pointHour < currentHour || (pointHour === currentHour && pointMinute <= currentMinute)) {
                        points.push({
                            hour: pointHour,
                            minute: pointMinute,
                            speed: parseFloat(d.avg_speed),
                            maxGust: parseFloat(d.max_gust) || parseFloat(d.avg_speed)
                        });
                    }
                }
            });

            if (points.length === 0) {
                this.historyContainer.innerHTML = `
                    <div class="text-center py-6">
                        <p class="text-white/70">Нет данных о ветре за сегодня</p>
                    </div>
                `;
                return;
            }

            // Find max speed for scaling
            const maxSpeed = Math.max(...points.map(p => p.maxGust)) * 1.1; // 10% padding

            // SVG dimensions
            const width = 800;
            const height = 150;
            const padding = { top: 10, right: 20, bottom: 30, left: 40 };
            const chartWidth = width - padding.left - padding.right;
            const chartHeight = height - padding.top - padding.bottom;

            // Create smooth path
            const curvePath = this.createSmoothPath(points, chartWidth, chartHeight, maxSpeed);
            const gradientId = 'windGradient';
            const gradient = this.createGradient(points, gradientId);

            // Create filled area path
            const firstPoint = points[0];
            const lastPoint = points[points.length - 1];
            const firstX = 0;
            const lastX = chartWidth;
            const areaPath = curvePath + ` L ${lastX} ${chartHeight} L ${firstX} ${chartHeight} Z`;

            // Generate time labels for every hour (only up to current time)
            const timeLabels = [];
            for (let hour = startHour; hour <= endHour; hour++) {
                // Show label for every hour up to current hour
                if (hour <= currentHour) {
                    const x = ((hour - startHour) / (endHour - startHour)) * chartWidth;
                    timeLabels.push({ hour, x });
                }
            }

            // Add current time label if we're not at exact hour (more than 5 minutes past)
            if (currentMinute > 5 && currentHour > startHour) {
                // Replace the current hour label with exact time
                const currentHourLabelIndex = timeLabels.findIndex(t => t.hour === currentHour);
                if (currentHourLabelIndex !== -1) {
                    timeLabels[currentHourLabelIndex].isCurrent = true;
                }
            }

            // Update title with actual time range
            if (this.titleElement) {
                const endTimeStr = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;
                this.titleElement.textContent = `📊 История ветра сегодня (6:00-${endTimeStr})`;
            }

            // Create HTML with SVG visualization
            const historyHTML = `
                <div style="position: relative; width: 100%; max-width: 100%; overflow-x: auto;">
                    <svg width="100%" height="${height}" viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" style="display: block;">
                        <defs>
                            ${gradient}
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
                            ${[0, 0.25, 0.5, 0.75, 1].map(ratio => `
                                <line x1="0" y1="${chartHeight * ratio}" x2="${chartWidth}" y2="${chartHeight * ratio}"
                                      stroke="rgba(255,255,255,0.1)" stroke-width="1" stroke-dasharray="5,5"/>
                            `).join('')}

                            <!-- Filled area under curve -->
                            <path d="${areaPath}" fill="url(#${gradientId})" opacity="0.6"/>

                            <!-- Smooth curve line -->
                            <path d="${curvePath}" fill="none" stroke="url(#${gradientId})"
                                  stroke-width="3" filter="url(#glow)"/>

                            <!-- Time labels -->
                            ${timeLabels.map(t => `
                                <text x="${t.x}" y="${chartHeight + 20}" text-anchor="middle"
                                      fill="rgba(255,255,255,${t.isCurrent ? '1' : '0.8'})"
                                      font-size="12" font-weight="${t.isCurrent ? '700' : '600'}">
                                    ${t.hour}:${t.isCurrent ? currentMinute.toString().padStart(2, '0') : '00'}
                                </text>
                            `).join('')}

                            <!-- Y-axis speed labels -->
                            ${[0, maxSpeed * 0.5, maxSpeed].map((speed, i) => `
                                <text x="-5" y="${chartHeight - (speed / maxSpeed) * chartHeight + 5}"
                                      text-anchor="end" fill="rgba(255,255,255,0.7)" font-size="11">
                                    ${speed.toFixed(0)}
                                </text>
                            `).join('')}
                        </g>
                    </svg>

                    <!-- Legend -->
                    <div style="display: flex; justify-content: center; gap: 15px; margin-top: 15px; font-size: 0.7rem; color: rgba(255,255,255,0.8); flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <div style="width: 12px; height: 12px; background: #87CEEB; border-radius: 2px;"></div>
                            <span>&lt;5 узлов</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <div style="width: 12px; height: 12px; background: #00FF00; border-radius: 2px;"></div>
                            <span>10-15 узлов</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <div style="width: 12px; height: 12px; background: #FFD700; border-radius: 2px;"></div>
                            <span>15-20 узлов</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <div style="width: 12px; height: 12px; background: #FF4500; border-radius: 2px;"></div>
                            <span>25-30 узлов</span>
                        </div>
                    </div>
                </div>
            `;

            this.historyContainer.innerHTML = historyHTML;

        } catch (error) {
            console.error('Error displaying wind history:', error);
            this.showError(error);
        }
    }

    clear() {
        if (this.historyContainer) {
            this.historyContainer.innerHTML = '';
        }
    }
}

export default WindHistoryDisplay;
