// Dashboard JavaScript for UK Trip Tracker
class Dashboard {
    constructor() {
        this.map = null;
        this.markers = [];
        this.routes = [];
        this.allLocations = [];
        this.filteredLocations = [];
        this.showRoutes = true;
        this.refreshInterval = null;
        
        this.colors = {
            'Day 1': '#FF6B6B',
            'Day 2': '#4ECDC4',
            'Day 3': '#45B7D1',
            'Day 4': '#96CEB4',
            'Day 5': '#FFEAA7',
            'Day 6': '#FD79A8',
            'Day 7': '#FDCB6E',
            'Day 8': '#6C5CE7',
            'Day 9': '#A29BFE',
            'Day 10': '#00B894',
            'Day 11': '#E17055',
            'Day 12': '#81ECEC',
            'default': '#74B9FF'
        };
        
        this.transportIcons = {
            'Walking': '🚶',
            'Tube': '🚇',
            'Train': '🚂',
            'Bus': '🚌',
            'Car': '🚗',
            'Flight': '✈️'
        };
        
        this.initializeMap();
        this.setupEventListeners();
        this.startAutoRefresh();
        this.loadData();
    }
    
    initializeMap() {
        this.map = L.map('map').setView(CONFIG.MAP.DEFAULT_CENTER, CONFIG.MAP.DEFAULT_ZOOM);
        
        L.tileLayer(CONFIG.MAP.TILE_URL, {
            attribution: CONFIG.MAP.ATTRIBUTION,
            maxZoom: 19
        }).addTo(this.map);
        
        // Add custom controls
        this.map.on('zoomend', () => this.updateMarkerSizes());
        this.map.on('moveend', () => this.updateVisibleMarkers());
    }
    
    setupEventListeners() {
        // Filter controls
        document.getElementById('filterDay').addEventListener('change', () => this.applyFilters());
        document.getElementById('filterCity').addEventListener('change', () => this.applyFilters());
        document.getElementById('filterTransport').addEventListener('change', () => this.applyFilters());
        document.getElementById('searchInput').addEventListener('input', () => this.applyFilters());
        
        // Map controls
        document.getElementById('centerMapBtn').addEventListener('click', () => this.centerMap());
        document.getElementById('fitAllBtn').addEventListener('click', () => this.fitAllLocations());
        document.getElementById('toggleRoutesBtn').addEventListener('click', () => this.toggleRoutes());
        document.getElementById('refreshBtn').addEventListener('click', () => this.refreshData());
        
        // Trip card generator
        document.getElementById('generateCardBtn').addEventListener('click', () => this.generateTripCard());
        
        // Notion sync status listener
        document.addEventListener('syncStatusChange', (e) => {
            this.updateSyncStatus(e.detail.status);
        });
    }
    
    async loadData() {
        try {
            this.updateSyncStatus('loading');
            
            // Load from Notion if configured
            if (notionClient.isConfigured()) {
                const notionData = await notionClient.queryEntries();
                this.allLocations = this.processNotionData(notionData);
            } else {
                // Fallback to localStorage
                const localData = JSON.parse(localStorage.getItem('tripEntries') || '[]');
                this.allLocations = localData;
            }
            
            this.processLocations();
            this.updateSyncStatus('loaded');
            
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load trip data: ' + error.message);
            this.updateSyncStatus('error');
        }
    }
    
    processNotionData(notionResults) {
        return notionResults.map(page => {
            const props = page.properties;
            return {
                id: page.id,
                timestamp: props.Timestamp?.date?.start,
                latitude: props.Latitude?.number,
                longitude: props.Longitude?.number,
                location: props.Location?.rich_text?.[0]?.text?.content || '',
                description: props.Description?.rich_text?.[0]?.text?.content || '',
                day: props.Day?.select?.name || 'Day 1',
                city: props.City?.select?.name || 'Other',
                transport_mode: props.Transport_Mode?.select?.name || 'Walking',
                weather: props.Weather?.rich_text?.[0]?.text?.content || '',
                photo_url: props.Photo_URL?.url || ''
            };
        }).filter(loc => loc.latitude && loc.longitude);
    }
    
    processLocations() {
        // Sort by timestamp
        this.allLocations.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        // Apply current filters
        this.applyFilters();
        
        // Update statistics
        this.updateStatistics();
        
        // Update locations list
        this.updateLocationsList();
        
        // Update map
        this.updateMap();
    }
    
    applyFilters() {
        const dayFilter = document.getElementById('filterDay').value;
        const cityFilter = document.getElementById('filterCity').value;
        const transportFilter = document.getElementById('filterTransport').value;
        const searchQuery = document.getElementById('searchInput').value.toLowerCase();
        
        this.filteredLocations = this.allLocations.filter(location => {
            // Day filter
            if (dayFilter && location.day !== dayFilter) return false;
            
            // City filter
            if (cityFilter && location.city !== cityFilter) return false;
            
            // Transport filter
            if (transportFilter && location.transport_mode !== transportFilter) return false;
            
            // Search filter
            if (searchQuery) {
                const searchText = [
                    location.location,
                    location.description,
                    location.city
                ].join(' ').toLowerCase();
                
                if (!searchText.includes(searchQuery)) return false;
            }
            
            return true;
        });
        
        this.updateMap();
        this.updateLocationsList();
        this.updateStatistics();
    }
    
    updateMap() {
        // Clear existing markers and routes
        this.clearMap();
        
        if (this.filteredLocations.length === 0) return;
        
        // Add markers
        this.filteredLocations.forEach((location, index) => {
            this.addLocationMarker(location, index);
        });
        
        // Add routes if enabled
        if (this.showRoutes && this.filteredLocations.length > 1) {
            this.addRoutes();
        }
        
        // Fit map to show all locations
        if (this.filteredLocations.length > 0) {
            this.fitAllLocations();
        }
    }
    
    addLocationMarker(location, index) {
        const color = this.colors[location.day] || this.colors.default;
        const icon = this.transportIcons[location.transport_mode] || '📍';
        
        // Create custom marker
        const marker = L.circleMarker([location.latitude, location.longitude], {
            radius: 8,
            fillColor: color,
            color: '#fff',
            weight: 2,
            opacity: 1,
            fillOpacity: 0.8
        }).addTo(this.map);
        
        // Create popup content
        const popupContent = `
            <div style="min-width: 200px;">
                <h4>${icon} ${location.location}</h4>
                <p><strong>Time:</strong> ${new Date(location.timestamp).toLocaleString()}</p>
                <p><strong>Day:</strong> ${location.day}</p>
                <p><strong>City:</strong> ${location.city}</p>
                <p><strong>Transport:</strong> ${location.transport_mode}</p>
                ${location.description ? `<p><strong>Description:</strong> ${location.description}</p>` : ''}
                ${location.weather ? `<p><strong>Weather:</strong> ${location.weather}</p>` : ''}
                <p style="font-size: 12px; color: #666;">
                    ${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}
                </p>
            </div>
        `;
        
        marker.bindPopup(popupContent);
        
        // Add click handler
        marker.on('click', () => {
            this.highlightLocation(location.id);
        });
        
        this.markers.push(marker);
    }
    
    addRoutes() {
        const points = this.filteredLocations.map(loc => [loc.latitude, loc.longitude]);
        
        // Group by day for different colored routes
        const dayGroups = {};
        this.filteredLocations.forEach(location => {
            if (!dayGroups[location.day]) {
                dayGroups[location.day] = [];
            }
            dayGroups[location.day].push([location.latitude, location.longitude]);
        });
        
        // Create routes for each day
        Object.keys(dayGroups).forEach(day => {
            if (dayGroups[day].length > 1) {
                const route = L.polyline(dayGroups[day], {
                    color: this.colors[day] || this.colors.default,
                    weight: 3,
                    opacity: 0.7,
                    dashArray: '5, 10'
                }).addTo(this.map);
                
                this.routes.push(route);
            }
        });
    }
    
    clearMap() {
        this.markers.forEach(marker => this.map.removeLayer(marker));
        this.routes.forEach(route => this.map.removeLayer(route));
        this.markers = [];
        this.routes = [];
    }
    
    updateLocationsList() {
        const container = document.getElementById('locationsList');
        
        if (this.filteredLocations.length === 0) {
            container.innerHTML = '<div class="loading">No locations found</div>';
            return;
        }
        
        const html = this.filteredLocations
            .slice()
            .reverse() // Show most recent first
            .map(location => `
                <div class="location-item" data-id="${location.id}" onclick="dashboard.focusLocation('${location.id}')">
                    <div class="location-time">${new Date(location.timestamp).toLocaleString()}</div>
                    <div class="location-name">${this.transportIcons[location.transport_mode] || '📍'} ${location.location}</div>
                    <div class="location-details">
                        <span>${location.day}</span>
                        <span>${location.city}</span>
                        <span>${location.transport_mode}</span>
                    </div>
                    ${location.description ? `<div class="location-description">"${location.description}"</div>` : ''}
                </div>
            `).join('');
        
        container.innerHTML = html;
    }
    
    updateStatistics() {
        const stats = this.calculateStatistics();
        
        document.getElementById('totalLocations').textContent = stats.totalLocations;
        document.getElementById('totalDistance').textContent = stats.totalDistance + 'km';
        document.getElementById('totalDays').textContent = stats.uniqueDays;
        document.getElementById('totalCities').textContent = stats.uniqueCities;
    }
    
    calculateStatistics() {
        const locations = this.filteredLocations;
        
        if (locations.length === 0) {
            return {
                totalLocations: 0,
                totalDistance: 0,
                uniqueDays: 0,
                uniqueCities: 0
            };
        }
        
        // Calculate total distance
        let totalDistance = 0;
        for (let i = 1; i < locations.length; i++) {
            const dist = this.calculateDistance(
                locations[i-1].latitude, locations[i-1].longitude,
                locations[i].latitude, locations[i].longitude
            );
            totalDistance += dist;
        }
        
        // Count unique days and cities
        const uniqueDays = new Set(locations.map(loc => loc.day)).size;
        const uniqueCities = new Set(locations.map(loc => loc.city)).size;
        
        return {
            totalLocations: locations.length,
            totalDistance: Math.round(totalDistance / 1000), // Convert to km
            uniqueDays,
            uniqueCities
        };
    }
    
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Earth's radius in meters
        const φ1 = lat1 * Math.PI/180;
        const φ2 = lat2 * Math.PI/180;
        const Δφ = (lat2-lat1) * Math.PI/180;
        const Δλ = (lon2-lon1) * Math.PI/180;
        
        const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                  Math.cos(φ1) * Math.cos(φ2) *
                  Math.sin(Δλ/2) * Math.sin(Δλ/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c;
    }
    
    focusLocation(locationId) {
        const location = this.allLocations.find(loc => loc.id === locationId);
        if (location) {
            this.map.setView([location.latitude, location.longitude], 15);
            this.highlightLocation(locationId);
        }
    }
    
    highlightLocation(locationId) {
        // Remove previous highlights
        document.querySelectorAll('.location-item').forEach(item => {
            item.classList.remove('highlighted');
        });
        
        // Add highlight to selected item
        const item = document.querySelector(`[data-id="${locationId}"]`);
        if (item) {
            item.classList.add('highlighted');
            item.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
    
    centerMap() {
        this.map.setView(CONFIG.MAP.DEFAULT_CENTER, CONFIG.MAP.DEFAULT_ZOOM);
    }
    
    fitAllLocations() {
        if (this.filteredLocations.length === 0) return;
        
        const group = new L.featureGroup(this.markers);
        this.map.fitBounds(group.getBounds().pad(0.1));
    }
    
    toggleRoutes() {
        this.showRoutes = !this.showRoutes;
        const btn = document.getElementById('toggleRoutesBtn');
        btn.textContent = this.showRoutes ? '📍 Hide Routes' : '📍 Show Routes';
        this.updateMap();
    }
    
    async refreshData() {
        const btn = document.getElementById('refreshBtn');
        btn.innerHTML = '🔄 Refreshing...';
        btn.disabled = true;
        
        try {
            await this.loadData();
        } finally {
            btn.innerHTML = '🔄 Refresh';
            btn.disabled = false;
        }
    }
    
    startAutoRefresh() {
        this.refreshInterval = setInterval(() => {
            if (notionClient.isConfigured()) {
                this.loadData();
            }
        }, CONFIG.APP.SYNC_INTERVAL);
    }
    
    generateTripCard() {
        // This will be implemented in the trip card generator
        const btn = document.getElementById('generateCardBtn');
        btn.innerHTML = '📸 Generating...';
        btn.disabled = true;
        
        setTimeout(() => {
            // For now, just open the trip card generator
            window.open('trip-card-generator.html', '_blank');
            btn.innerHTML = '📸 Generate Trip Card';
            btn.disabled = false;
        }, 1000);
    }
    
    updateSyncStatus(status) {
        const statusEl = document.getElementById('syncStatus');
        
        switch (status) {
            case 'loading':
                statusEl.innerHTML = '🔄 Loading trip data...';
                break;
            case 'loaded':
                statusEl.innerHTML = `✅ ${this.allLocations.length} locations loaded`;
                break;
            case 'error':
                statusEl.innerHTML = '❌ Failed to load data';
                break;
            case 'syncing':
                statusEl.innerHTML = '🔄 Syncing with Notion...';
                break;
            default:
                statusEl.innerHTML = '📡 Ready';
        }
    }
    
    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error';
        errorDiv.textContent = message;
        
        const container = document.querySelector('.container');
        container.insertBefore(errorDiv, container.firstChild);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
    
    updateMarkerSizes() {
        // Adjust marker sizes based on zoom level
        const zoom = this.map.getZoom();
        const size = Math.max(4, Math.min(12, zoom - 8));
        
        this.markers.forEach(marker => {
            marker.setRadius(size);
        });
    }
    
    updateVisibleMarkers() {
        // Performance optimization for large datasets
        const bounds = this.map.getBounds();
        
        this.markers.forEach(marker => {
            const latLng = marker.getLatLng();
            if (bounds.contains(latLng)) {
                marker.addTo(this.map);
            } else {
                this.map.removeLayer(marker);
            }
        });
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new Dashboard();
});

// Add some CSS for highlighting
const style = document.createElement('style');
style.textContent = `
    .location-item.highlighted {
        background-color: #e3f2fd !important;
        border-left: 4px solid #2196F3 !important;
    }
`;
document.head.appendChild(style);