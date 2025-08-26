class WindArrowController {
    constructor(mapController, windDataManager) {
        this.mapController = mapController;
        this.windDataManager = windDataManager;
        this.windArrowMarker = null;
        this.windDirection = 0;
        this.windSpeed = 0;
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

    updateArrow() {
        if (!this.mapController.map) return;

        // Удаление предыдущей стрелки
        if (this.windArrowMarker) {
            this.mapController.removeWindArrow(this.windArrowMarker);
        }

        const safety = this.windDataManager.getWindSafety(this.windDirection, this.windSpeed);
        const arrowDistance = 0.01;
        const kiterLocation = this.mapController.getKiterLocation();

        let arrowPosition;
        if (safety.isOffshore) {
            // Стрелка НАЧИНАЕТСЯ от кайтера для оффшорного ветра
            const angleRad = (this.windDirection * Math.PI) / 180;
            arrowPosition = [
                kiterLocation[0] + Math.sin(angleRad) * arrowDistance,
                kiterLocation[1] + Math.cos(angleRad) * arrowDistance
            ];
        } else {
            // Стрелка УКАЗЫВАЕТ НА кайтера для оншорного ветра
            const angleRad = ((this.windDirection + 180) * Math.PI) / 180;
            arrowPosition = [
                kiterLocation[0] + Math.sin(angleRad) * arrowDistance,
                kiterLocation[1] + Math.cos(angleRad) * arrowDistance
            ];
        }

        const windArrowIcon = L.divIcon({
            html: this.createArrowSVG(safety),
            className: 'wind-arrow-container',
            iconSize: [60, 60],
            iconAnchor: [30, 30]
        });

        this.windArrowMarker = L.marker(arrowPosition, { 
            icon: windArrowIcon,
            rotationAngle: this.windDirection
        });

        // Поворот стрелки
        this.windArrowMarker.on('add', () => {
            const element = this.windArrowMarker.getElement();
            if (element) {
                element.style.transform += ` rotate(${this.windDirection}deg)`;
                element.style.transformOrigin = 'center';
                
                // Добавление информации о ветре
                element.title = `Ветер: ${this.windSpeed.toFixed(1)} узлов, ${this.windDirection}°\n${safety.text}`;
            }
        });

        this.mapController.addWindArrow(this.windArrowMarker);
    }

    updateWind(direction, speed) {
        this.windDirection = direction;
        this.windSpeed = speed;
        this.updateArrow();
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