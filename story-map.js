// story-map.js

class StoryMap {
    constructor() {
        this.locations = [];
        this.map = null;
        this.animation = null;
        this.animationProgress = 0; // 0 to 1
        this.animationDuration = 30000; // Default, will be recalculated
        this.isPaused = true;
        this.lastLocationIndex = -1;

        // DOM elements
        this.loadingIndicator = document.getElementById('loading');
        this.content = document.getElementById('content');
        this.playPauseButton = document.getElementById('play-pause-button');
        this.resetButton = document.getElementById('reset-button');
        this.locationCard = document.getElementById('location-card');
        this.locationTitle = document.getElementById('location-title');
        this.locationDescription = document.getElementById('location-description');
        this.locationDetails = document.getElementById('location-details');

        if (typeof notionClient === 'undefined' || typeof CONFIG === 'undefined' || typeof turf === 'undefined') {
            this.showError('A required library is not found. Please check the console.');
            return;
        }

        this.init();
    }

    async init() {
        this.initializeMap();
        if (this.map) {
            this.map.on('load', async () => {
                await this.loadTripData();
                if (this.locations.length > 0) {
                    this.setupAnimationLayers();
                    this.setupControls();
                    this.showContent();
                } else {
                    this.showError('No trip data found. Please check your Notion database.');
                }
            });
        }
    }
    
    showError(message) {
        this.loadingIndicator.innerHTML = `<p style="color: red;">${message}</p>`;
    }

    showContent() {
        this.loadingIndicator.style.display = 'none';
        this.content.style.display = 'block';
    }

    initializeMap() {
        if (!CONFIG.MAP.MAPBOX_ACCESS_TOKEN || CONFIG.MAP.MAPBOX_ACCESS_TOKEN === 'your_mapbox_access_token_here') {
            this.showError('Mapbox access token is missing in config.js');
            document.getElementById('map').innerHTML = ''; // Clear map container
            return;
        }
        mapboxgl.accessToken = CONFIG.MAP.MAPBOX_ACCESS_TOKEN;
        this.map = new mapboxgl.Map({
            container: 'map',
            style: 'mapbox://styles/mapbox/streets-v12',
            center: CONFIG.MAP.DEFAULT_CENTER,
            zoom: CONFIG.MAP.DEFAULT_ZOOM
        });
    }

    async loadTripData() {
        try {
            const notionData = await notionClient.queryEntries();
            if (!notionData || notionData.length < 2) {
                return;
            }
            const processed = this.processNotionData(notionData);
            processed.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
            this.locations = processed;
        } catch (error) {
            console.error('Error loading trip data:', error);
            this.showError('Failed to load trip data from Notion.');
        }
    }

    processNotionData(results) {
        return results.map(page => ({
            id: page.id,
            timestamp: page.properties.Timestamp?.date?.start,
            latitude: page.properties.Latitude?.number,
            longitude: page.properties.Longitude?.number,
            location: page.properties.Location?.rich_text?.[0]?.text?.content || '',
            description: page.properties.Description?.rich_text?.[0]?.text?.content || '',
            transport_mode: page.properties.Transport_Mode?.select?.name || 'N/A',
        })).filter(loc => loc.latitude && loc.longitude && loc.timestamp);
    }

    setupAnimationLayers() {
        const coordinates = this.locations.map(loc => [loc.longitude, loc.latitude]);
        this.fullRoute = turf.lineString(coordinates);
        this.routeDistance = turf.length(this.fullRoute, { units: 'kilometers' });

        // Dynamically calculate animation duration
        const speed = CONFIG.APP.STORY_MAP_ANIMATION_SPEED || 100; // km/s
        this.animationDuration = (this.routeDistance / speed) * 1000;

        // Pre-calculate distance for each point
        let traveled = 0;
        this.locations[0].distanceFromStart = 0;
        for (let i = 1; i < this.locations.length; i++) {
            traveled += turf.distance(turf.point(coordinates[i-1]), turf.point(coordinates[i]), { units: 'kilometers' });
            this.locations[i].distanceFromStart = traveled;
        }

        this.map.addSource('full-route-source', { type: 'geojson', data: this.fullRoute });
        this.map.addLayer({ /* ... full route layer ... */ });
        this.map.addSource('animated-route-source', { type: 'geojson', data: turf.lineString([coordinates[0]]) });
        this.map.addLayer({ /* ... animated route layer ... */ });
        this.map.addSource('marker-source', { type: 'geojson', data: turf.point(coordinates[0]) });
        this.map.addLayer({ /* ... marker layer ... */ });

        // Re-add layer definitions that might be removed by mistake
        this.map.getLayer('full-route-layer') || this.map.addLayer({ id: 'full-route-layer', type: 'line', source: 'full-route-source', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#ccc', 'line-width': 3, 'line-dasharray': [2, 2] } });
        this.map.getLayer('animated-route-layer') || this.map.addLayer({ id: 'animated-route-layer', type: 'line', source: 'animated-route-source', layout: { 'line-join': 'round', 'line-cap': 'round' }, paint: { 'line-color': '#007cbf', 'line-width': 4 } });
        this.map.getLayer('marker-layer') || this.map.addLayer({ id: 'marker-layer', type: 'circle', source: 'marker-source', paint: { 'circle-radius': 8, 'circle-color': '#007cbf', 'circle-stroke-color': 'white', 'circle-stroke-width': 2 } });


        this.map.fitBounds(turf.bbox(this.fullRoute), { padding: 50 });
    }
    
    setupControls() {
        this.playPauseButton.addEventListener('click', () => {
            if (this.isPaused) this.startAnimation(); else this.pauseAnimation();
        });
        this.resetButton.addEventListener('click', () => this.resetAnimation());
    }

    startAnimation() {
        this.isPaused = false;
        this.playPauseButton.textContent = 'Pause';
        this.startTime = performance.now() - (this.animationProgress * this.animationDuration);
        this.animate();
    }

    pauseAnimation() {
        this.isPaused = true;
        this.playPauseButton.textContent = 'Play';
        cancelAnimationFrame(this.animation);
    }
    
    resetAnimation() {
        this.pauseAnimation();
        this.animationProgress = 0;
        this.lastLocationIndex = -1;
        this.locationCard.style.display = 'none';
        const startPoint = this.fullRoute.geometry.coordinates[0];
        this.map.getSource('animated-route-source').setData(turf.lineString([startPoint]));
        this.map.getSource('marker-source').setData(turf.point(startPoint));
        this.playPauseButton.textContent = 'Start Journey';
        this.map.fitBounds(turf.bbox(this.fullRoute), { padding: 50 });
    }

    animate(now) {
        if (this.isPaused) return;
        const elapsed = now - this.startTime;
        this.animationProgress = elapsed / this.animationDuration;

        if (this.animationProgress >= 1) {
            this.animationProgress = 1;
            // Ensure last point card is shown
            if (this.lastLocationIndex < this.locations.length - 1) {
                this.displayLocationCard(this.locations[this.locations.length - 1]);
                this.lastLocationIndex = this.locations.length - 1;
            }
            this.pauseAnimation();
            this.playPauseButton.textContent = 'Journey Complete';
        }

        const currentDistance = this.animationProgress * this.routeDistance;
        
        if (this.lastLocationIndex + 1 < this.locations.length) {
            const nextLocation = this.locations[this.lastLocationIndex + 1];
            if (currentDistance >= nextLocation.distanceFromStart) {
                this.displayLocationCard(nextLocation);
                this.lastLocationIndex++;
            }
        }

        const currentPoint = turf.along(this.fullRoute, currentDistance, { units: 'kilometers' });
        
        const coords = this.fullRoute.geometry.coordinates;
        const animatedCoords = [];
        let traveled = 0;
        for (let i = 0; i < coords.length; i++) {
            animatedCoords.push(coords[i]);
            if (i < coords.length - 1) {
                const segmentDistance = turf.distance(turf.point(coords[i]), turf.point(coords[i+1]), { units: 'kilometers' });
                if (traveled + segmentDistance > currentDistance) {
                    break;
                }
                traveled += segmentDistance;
            }
        }
        animatedCoords.push(currentPoint.geometry.coordinates);

        this.map.getSource('animated-route-source').setData(turf.lineString(animatedCoords));
        this.map.getSource('marker-source').setData(currentPoint);
        this.map.panTo(currentPoint.geometry.coordinates, { duration: 0 });

        this.animation = requestAnimationFrame((t) => this.animate(t));
    }

    displayLocationCard(location) {
        this.locationTitle.textContent = location.location;
        this.locationDescription.textContent = location.description;
        const time = new Date(location.timestamp).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true });
        this.locationDetails.textContent = `${location.transport_mode} • ${time}`;
        this.locationCard.style.display = 'block';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.storyMap = new StoryMap();
});
