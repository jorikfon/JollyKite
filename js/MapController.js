import config from './config.js';

class MapController {
    constructor() {
        this.map = null;
        this.kitesurferMarker = null;
        this.spotMarkers = [];

        // Координаты из конфигурации
        this.spotLocation = config.locations.spot;
        this.kiterLocation = config.locations.kiter;
        this.beachNorth = config.locations.beachNorth;
        this.beachSouth = config.locations.beachSouth;
        this.seaBearing = config.bearings.sea;
        this.landBearing = config.bearings.land;
    }

    initMap() {
        // Инициализация карты
        const mapCenter = [this.spotLocation[0], this.spotLocation[1] + config.map.centerOffset];

        this.map = L.map(config.map.containerId, {
            center: mapCenter,
            zoom: config.map.defaultZoom,
            ...config.map.interactions // Spread all interaction settings
        });

        // Добавление тайлов карты
        L.tileLayer(config.map.tileServer, {
            attribution: ''
        }).addTo(this.map);

        this.addMarkers();
        return this.map;
    }

    addMarkers() {
        // Иконка кайтсерфера (красивая PNG картинка)
        const kitesurferIcon = L.icon({
            iconUrl: 'kiter.png',
            iconSize: [100, 100],
            iconAnchor: [50, 50],
            popupAnchor: [0, -50]
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
        const beachMarker = L.marker(config.locations.beach, {
            icon: L.divIcon({
                html: '<div class="beach-marker">🏖️</div>',
                className: 'beach-icon',
                iconSize: [25, 25],
                iconAnchor: [12, 12]
            })
        }).addTo(this.map);
        beachMarker.bindPopup('Пляж Пак Нам Пран');

        // Маркер парковки
        const parkingMarker = L.marker(config.locations.parking, {
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