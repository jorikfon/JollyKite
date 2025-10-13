class MapController {
    constructor() {
        this.map = null;
        this.kitesurferMarker = null;
        this.spotMarkers = [];
        
        // Координаты
        this.spotLocation = [12.346596280786017, 99.99817902532192]; // JollyKite спот
        this.kiterLocation = [12.3468, 100.0125]; // Кайтер в море
        this.beachNorth = [12.350, 99.996];
        this.beachSouth = [12.343, 100.001];
        this.seaBearing = 90;
        this.landBearing = 270;
    }

    initMap() {
        // Инициализация карты
        const mapCenter = [this.spotLocation[0], this.spotLocation[1] - 0.002]; // Сдвиг влево
        
        this.map = L.map('map', {
            center: mapCenter,
            zoom: 14,
            zoomControl: false,  // Убираем кнопки зума
            attributionControl: false,
            dragging: false,     // Запрет перетаскивания
            touchZoom: false,    // Запрет зума касанием (pinch)
            doubleClickZoom: false,  // Запрет зума двойным кликом
            scrollWheelZoom: false,  // Запрет зума колесом мыши
            boxZoom: false,      // Запрет зума выделением
            keyboard: false,     // Запрет управления клавиатурой
            tap: false           // Отключить tap handler (может вызывать проблемы на мобильных)
        });

        // Добавление тайлов карты
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: ''
        }).addTo(this.map);

        this.addMarkers();
        return this.map;
    }

    addMarkers() {
        // Иконка кайтсерфера
        const kitesurferIcon = L.divIcon({
            html: `
                <div class="kitesurfer-icon">
                    <div class="kitesurfer-animation">
                        <div class="kite-icon">🪁</div>
                        <div class="surfer-icon">🏄‍♂️</div>
                    </div>
                </div>
            `,
            className: 'kitesurfer-marker-icon',
            iconSize: [60, 60],
            iconAnchor: [30, 30]
        });

        // Добавление маркера кайтсерфера
        this.kitesurferMarker = L.marker(this.kiterLocation, { 
            icon: kitesurferIcon 
        }).addTo(this.map);

        // Маркер спота JollyKite
        const spotMarker = L.marker(this.spotLocation, {
            icon: L.divIcon({
                html: '<div class="spot-marker">🏖️</div>',
                className: 'spot-icon',
                iconSize: [30, 30],
                iconAnchor: [15, 15]
            })
        }).addTo(this.map);
        spotMarker.bindPopup('<b>JollyKite Spot</b><br>Лучшее место для кайтсерфинга!');

        // Маркер пляжа
        const beachMarker = L.marker([12.347, 99.998], {
            icon: L.divIcon({
                html: '<div class="beach-marker">🏖️</div>',
                className: 'beach-icon',
                iconSize: [25, 25],
                iconAnchor: [12, 12]
            })
        }).addTo(this.map);
        beachMarker.bindPopup('Пляж Пак Нам Пран');

        // Маркер парковки
        const parkingMarker = L.marker([12.3445, 99.9985], {
            icon: L.divIcon({
                html: '<div class="parking-marker">🅿️</div>',
                className: 'parking-icon',
                iconSize: [20, 20],
                iconAnchor: [10, 10]
            })
        }).addTo(this.map);
        parkingMarker.bindPopup('Парковка');

        // Сохранение маркеров для управления
        this.spotMarkers = [spotMarker, beachMarker, parkingMarker];
    }

    getKiterLocation() {
        return this.kiterLocation;
    }

    getSpotLocation() {
        return this.spotLocation;
    }

    addWindArrow(windArrowMarker) {
        if (windArrowMarker && this.map) {
            windArrowMarker.addTo(this.map);
        }
    }

    removeWindArrow(windArrowMarker) {
        if (windArrowMarker && this.map) {
            this.map.removeLayer(windArrowMarker);
        }
    }

    fitBounds() {
        if (this.map && this.spotMarkers.length > 0) {
            const group = new L.featureGroup([this.kitesurferMarker, ...this.spotMarkers]);
            this.map.fitBounds(group.getBounds().pad(0.1));
        }
    }

    setView(latlng, zoom = 14) {
        if (this.map) {
            this.map.setView(latlng, zoom);
        }
    }

    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
    }
}

export default MapController;