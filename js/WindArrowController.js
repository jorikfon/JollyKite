import config from './config.js';

class WindArrowController {
    constructor(mapController, windDataManager) {
        this.mapController = mapController;
        this.windDataManager = windDataManager;
        this.windArrowMarker = null;
        this.windDirection = 0;
        this.windSpeed = 0;
        this.isInitialized = false; // Флаг для отслеживания первого обновления
    }

    createArrowSVG(safety) {
        const color = safety.color;
        const darkerColor = this.getDarkerColor(color);
        
        return `
            <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
                <defs>
                    <linearGradient id="arrowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" style="stop-color:${color};stop-opacity:1" />
                        <stop offset="100%" style="stop-color:${darkerColor};stop-opacity:1" />
                    </linearGradient>
                    <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                        <feDropShadow dx="2" dy="2" stdDeviation="3" flood-color="black" flood-opacity="0.3"/>
                    </filter>
                </defs>
                <path d="M 30 5 L 40 25 L 35 25 L 35 50 L 25 50 L 25 25 L 20 25 Z" 
                      fill="url(#arrowGrad)" 
                      stroke="${darkerColor}" 
                      stroke-width="2" 
                      filter="url(#shadow)"
                      style="animation: windPulse 2s ease-in-out infinite;">
                    <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>
                </path>
            </svg>
        `;
    }

    getDarkerColor(color) {
        const colors = {
            '#00FF00': '#00CC00',
            '#FFD700': '#DAA520',
            '#FFA500': '#FF8C00',
            '#FF4500': '#DC143C',
            '#87CEEB': '#4682B4',
            '#4169E1': '#0000CD'
        };
        return colors[color] || color;
    }

    /**
     * Calculate arrow offset for given wind direction with smooth interpolation
     * @param {number} angle - Wind direction in degrees (0-360)
     * @returns {object} - {x, y} offset coordinates
     */
    getOffsetForDirection(angle) {
        const directions = [0, 45, 90, 135, 180, 225, 270, 315];
        const arrowConfig = config.windArrow;

        // Normalize angle (0-360)
        let normalizedAngle = angle % 360;
        if (normalizedAngle < 0) normalizedAngle += 360;

        // If angle exactly matches one of the 8 cardinal directions, return it directly
        if (directions.includes(normalizedAngle)) {
            return arrowConfig.directions[normalizedAngle];
        }

        // Find the two nearest directions for interpolation
        let lowerDir = 315;  // Default to NW
        let upperDir = 0;    // Default to N

        for (let i = 0; i < directions.length; i++) {
            const currentDir = directions[i];
            const nextDir = directions[(i + 1) % directions.length];

            // Handle wrap around at 360/0
            if (currentDir === 315) {
                if (normalizedAngle >= 315 || normalizedAngle < 45) {
                    lowerDir = 315;
                    upperDir = 0;
                    break;
                }
            } else if (normalizedAngle >= currentDir && normalizedAngle < nextDir) {
                lowerDir = currentDir;
                upperDir = nextDir;
                break;
            }
        }

        // Get offsets for both directions
        const lowerOffset = arrowConfig.directions[lowerDir];
        const upperOffset = arrowConfig.directions[upperDir];

        // Calculate angle difference and interpolation ratio
        let angleDiff = upperDir - lowerDir;
        if (angleDiff < 0) angleDiff += 360; // Handle wrap at 360/0

        let currentDiff = normalizedAngle - lowerDir;
        if (currentDiff < 0) currentDiff += 360; // Handle wrap at 360/0

        const ratio = currentDiff / angleDiff;

        // Linear interpolation between the two offsets
        return {
            x: lowerOffset.x + (upperOffset.x - lowerOffset.x) * ratio,
            y: lowerOffset.y + (upperOffset.y - lowerOffset.y) * ratio
        };
    }

    updateArrow() {
        console.log('🎯 updateArrow() начало работы');

        if (!this.mapController.map) {
            console.log('⚠️ Карта не инициализирована');
            return;
        }

        // Не отображаем стрелку до первого обновления данных из API
        if (!this.isInitialized) {
            console.log('⚠️ Стрелка ещё не инициализирована (ожидаем данные из API)');
            return;
        }

        console.log('📊 Получаем информацию о безопасности...');
        const safety = this.windDataManager.getWindSafety(this.windDirection, this.windSpeed);
        console.log('✅ Безопасность:', safety);

        const kiterLocation = this.mapController.getKiterLocation();
        console.log('📍 Позиция кайтера:', kiterLocation);

        // Calculate directional offset based on wind direction
        const offset = this.getOffsetForDirection(this.windDirection);
        console.log(`📐 Направление ветра: ${this.windDirection}°, Смещение:`, offset);

        // Position arrow around kiter with directional offset
        const arrowPosition = [
            kiterLocation[0] + offset.x,
            kiterLocation[1] + offset.y
        ];

        // Если маркер уже существует - обновляем позицию, иконку и поворот
        if (this.windArrowMarker) {
            console.log('🔄 Обновление существующего маркера');

            // ВАЖНО: Обновляем позицию маркера с новым смещением
            this.windArrowMarker.setLatLng(arrowPosition);
            console.log('  🔧 Позиция обновлена:', arrowPosition);

            // Обновляем иконку (цвет меняется в зависимости от безопасности)
            const windArrowIcon = L.divIcon({
                html: this.createArrowSVG(safety),
                className: 'wind-arrow-container',
                iconSize: [60, 60],
                iconAnchor: [30, 30]
            });

            this.windArrowMarker.setIcon(windArrowIcon);
            console.log('  ✅ Иконка обновлена');

            // Обновляем поворот с учетом globalAngle
            // +180° для корректного отображения направления (стрелка показывает ОТКУДА дует ветер)
            const element = this.windArrowMarker.getElement();
            if (element) {
                const globalAngleOffset = config.windArrow.globalAngle || 0;
                const finalRotation = this.windDirection + 180 + globalAngleOffset;

                // Сохраняем translate3d от Leaflet и добавляем rotate
                const currentTransform = element.style.transform;
                const translateMatch = currentTransform.match(/translate3d\([^)]+\)/);

                if (translateMatch) {
                    element.style.transform = `${translateMatch[0]} rotate(${finalRotation}deg)`;
                    console.log('  🔧 Transform установлен:', element.style.transform);
                } else {
                    element.style.transform = `rotate(${finalRotation}deg)`;
                }

                element.style.transformOrigin = 'center';
                element.title = `Ветер: ${this.windSpeed.toFixed(1)} узлов, ${this.windDirection}°\n${safety.text}`;
                console.log(`  ✅ Поворот: ${this.windDirection}° + 180° + globalAngle ${globalAngleOffset}° = ${finalRotation}°`);
            }
        } else {
            // Создаем маркер в первый раз
            console.log('🆕 Создание нового маркера');

            const windArrowIcon = L.divIcon({
                html: this.createArrowSVG(safety),
                className: 'wind-arrow-container',
                iconSize: [60, 60],
                iconAnchor: [30, 30]
            });

            this.windArrowMarker = L.marker(arrowPosition, {
                icon: windArrowIcon
            });

            // Добавляем маркер на карту
            this.mapController.addWindArrow(this.windArrowMarker);
            console.log('  ✅ Маркер добавлен на карту');

            // Принудительно обновляем позицию и поворот после добавления
            setTimeout(() => {
                if (this.windArrowMarker && this.mapController.map) {
                    this.windArrowMarker.setLatLng(arrowPosition);

                    const element = this.windArrowMarker.getElement();
                    if (element) {
                        const globalAngleOffset = config.windArrow.globalAngle || 0;
                        const finalRotation = this.windDirection + 180 + globalAngleOffset;

                        // Сохраняем translate3d от Leaflet и добавляем rotate
                        const currentTransform = element.style.transform;
                        const translateMatch = currentTransform.match(/translate3d\([^)]+\)/);

                        if (translateMatch) {
                            element.style.transform = `${translateMatch[0]} rotate(${finalRotation}deg)`;
                        } else {
                            element.style.transform = `rotate(${finalRotation}deg)`;
                        }

                        element.style.transformOrigin = 'center';
                        element.title = `Ветер: ${this.windSpeed.toFixed(1)} узлов, ${this.windDirection}°\n${safety.text}`;
                        console.log(`  ✅ Поворот установлен: ${finalRotation}°`);
                    }
                }
            }, 100);
        }
    }

    updateWind(direction, speed) {
        console.log('🌬️ updateWind() вызван с параметрами:', {
            direction: direction + '°',
            speed: speed.toFixed(1) + ' узлов'
        });
        this.windDirection = direction;
        this.windSpeed = speed;
        this.isInitialized = true; // Помечаем, что данные получены
        console.log('📍 Вызываем updateArrow()...');
        this.updateArrow();
        console.log('✅ updateArrow() завершён');
    }

    getWindArrowMarker() {
        return this.windArrowMarker;
    }

    clear() {
        if (this.windArrowMarker) {
            this.mapController.removeWindArrow(this.windArrowMarker);
            this.windArrowMarker = null;
        }
    }
}

export default WindArrowController;