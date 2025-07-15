// Mobile App JavaScript for UK Trip Tracker
class MobileApp {
    constructor() {
        this.currentLocation = null;
        this.lastLoggedLocation = null;
        this.isLogging = false;
        this.entries = JSON.parse(localStorage.getItem('tripEntries') || '[]');
        
        this.initializeApp();
        this.setupEventListeners();
        this.checkConfiguration();
        this.loadRecentEntries();
    }
    
    initializeApp() {
        // Check if geolocation is supported
        if (!navigator.geolocation) {
            this.showError('Geolocation is not supported by this browser');
            return;
        }
        
        // Register service worker for PWA
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('sw.js').catch(console.error);
        }
        
        // Setup sync status listener
        document.addEventListener('syncStatusChange', (e) => {
            this.updateSyncStatus(e.detail.status, e.detail.queueLength);
        });
        
        this.updateSyncStatus('offline', 0);
    }
    
    setupEventListeners() {
        const logBtn = document.getElementById('logLocationBtn');
        const descriptionField = document.getElementById('description');
        
        logBtn.addEventListener('click', () => this.logCurrentLocation());
        descriptionField.addEventListener('input', () => this.updateWordCounter());
        
        // Auto-save form data
        const formFields = document.querySelectorAll('#locationForm input, #locationForm select, #locationForm textarea');
        formFields.forEach(field => {
            field.addEventListener('change', () => this.saveFormData());
        });
        
        // Load saved form data
        this.loadFormData();
    }
    
    checkConfiguration() {
        const warning = document.getElementById('configWarning');
        if (notionClient.isConfigured()) {
            warning.style.display = 'none';
        } else {
            warning.style.display = 'block';
        }
    }
    
    async logCurrentLocation() {
        if (this.isLogging) return;
        
        this.isLogging = true;
        this.showLoading(true);
        this.clearError();
        
        const logBtn = document.getElementById('logLocationBtn');
        logBtn.disabled = true;
        logBtn.textContent = '📍 Getting Location...';
        
        try {
            const position = await this.getCurrentPosition();
            const locationName = await this.reverseGeocode(position.coords.latitude, position.coords.longitude);
            
            // Check for duplicates
            if (this.isDuplicateLocation(position.coords)) {
                throw new Error('Location already logged recently (within 50m)');
            }
            
            // Populate form
            document.getElementById('location').value = locationName;
            document.getElementById('gpsAccuracy').textContent = 
                `Accuracy: ±${Math.round(position.coords.accuracy)}m`;
            
            // Auto-detect transport mode based on speed
            const transportMode = this.detectTransportMode(position.coords.speed);
            document.getElementById('transport').value = transportMode;
            
            // Auto-detect city
            const city = this.detectCity(locationName);
            if (city) {
                document.getElementById('city').value = city;
            }
            
            // Create entry data
            const entryData = this.getFormData();
            entryData.latitude = position.coords.latitude;
            entryData.longitude = position.coords.longitude;
            entryData.timestamp = new Date().toISOString();
            entryData.accuracy = position.coords.accuracy;
            
            // Validate description
            if (!this.validateDescription(entryData.description)) {
                throw new Error('Description must be 10 words or less');
            }
            
            // Save locally first
            this.saveEntry(entryData);
            
            // Sync to Notion
            if (notionClient.isConfigured()) {
                await notionClient.createEntry(entryData);
                this.showSuccess('Location logged and synced!');
            } else {
                this.showError('Logged locally - configure Notion to sync');
            }
            
            // Update UI
            this.loadRecentEntries();
            this.clearForm();
            this.lastLoggedLocation = position.coords;
            
            // Haptic feedback
            if (navigator.vibrate) {
                navigator.vibrate(100);
            }
            
        } catch (error) {
            console.error('Error logging location:', error);
            this.showError(error.message);
        } finally {
            this.isLogging = false;
            this.showLoading(false);
            logBtn.disabled = false;
            logBtn.textContent = '📍 Log Current Location';
        }
    }
    
    getCurrentPosition() {
        return new Promise((resolve, reject) => {
            const options = {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 30000
            };
            
            navigator.geolocation.getCurrentPosition(resolve, reject, options);
        });
    }
    
    async reverseGeocode(lat, lng) {
        try {
            const response = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`
            );
            const data = await response.json();
            
            if (data.display_name) {
                // Extract meaningful location name
                const address = data.address || {};
                const parts = [
                    address.attraction || address.tourism,
                    address.amenity,
                    address.shop,
                    address.road,
                    address.neighbourhood || address.suburb,
                    address.city || address.town || address.village
                ].filter(Boolean);
                
                return parts.length > 0 ? parts.join(', ') : data.display_name;
            }
            
            return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        } catch (error) {
            console.error('Reverse geocoding failed:', error);
            return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
    }
    
    detectTransportMode(speed) {
        if (!speed) return 'Walking';
        
        const speedMph = speed * 2.237; // Convert m/s to mph
        const thresholds = CONFIG.UK.SPEED_THRESHOLDS;
        
        if (speedMph < thresholds.WALKING) return 'Walking';
        if (speedMph < thresholds.TUBE) return 'Tube';
        if (speedMph < thresholds.TRAIN) return 'Train';
        if (speedMph < thresholds.CAR) return 'Car';
        return 'Flight';
    }
    
    detectCity(locationName) {
        const cities = CONFIG.UK.CITIES;
        for (const city of cities) {
            if (locationName.toLowerCase().includes(city.toLowerCase())) {
                return city;
            }
        }
        return null;
    }
    
    isDuplicateLocation(coords) {
        if (!this.lastLoggedLocation) return false;
        
        const distance = this.calculateDistance(
            this.lastLoggedLocation.latitude,
            this.lastLoggedLocation.longitude,
            coords.latitude,
            coords.longitude
        );
        
        return distance < CONFIG.APP.DUPLICATE_RADIUS;
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
    
    validateDescription(description) {
        if (!description) return true;
        const words = description.trim().split(/\s+/).filter(word => word.length > 0);
        return words.length <= CONFIG.APP.DESCRIPTION_MAX_WORDS;
    }
    
    updateWordCounter() {
        const description = document.getElementById('description').value;
        const counter = document.getElementById('wordCounter');
        const words = description.trim().split(/\s+/).filter(word => word.length > 0);
        const count = description.trim() === '' ? 0 : words.length;
        
        counter.textContent = `${count}/${CONFIG.APP.DESCRIPTION_MAX_WORDS} words`;
        
        if (count > CONFIG.APP.DESCRIPTION_MAX_WORDS) {
            counter.classList.add('over-limit');
        } else {
            counter.classList.remove('over-limit');
        }
    }
    
    getFormData() {
        return {
            location: document.getElementById('location').value,
            description: document.getElementById('description').value,
            day: document.getElementById('day').value,
            city: document.getElementById('city').value,
            transport_mode: document.getElementById('transport').value
        };
    }
    
    saveEntry(entryData) {
        this.entries.unshift({
            ...entryData,
            id: Date.now().toString(),
            localTimestamp: new Date().toISOString()
        });
        
        // Keep only last 50 entries
        this.entries = this.entries.slice(0, 50);
        localStorage.setItem('tripEntries', JSON.stringify(this.entries));
    }
    
    loadRecentEntries() {
        const container = document.getElementById('recentEntriesList');
        
        if (this.entries.length === 0) {
            container.innerHTML = `
                <div class="entry-item">
                    <div class="entry-time">No entries yet</div>
                    <div class="entry-location">Start logging your UK adventure!</div>
                </div>
            `;
            return;
        }
        
        const recentEntries = this.entries.slice(0, 5);
        container.innerHTML = recentEntries.map(entry => `
            <div class="entry-item">
                <div class="entry-time">${new Date(entry.localTimestamp).toLocaleString()}</div>
                <div class="entry-location">📍 ${entry.location}</div>
                <div class="entry-description">${entry.description || 'No description'}</div>
                <div style="font-size: 12px; opacity: 0.7; margin-top: 5px;">
                    ${entry.city} • ${entry.transport_mode} • ${entry.day}
                </div>
            </div>
        `).join('');
    }
    
    clearForm() {
        document.getElementById('description').value = '';
        this.updateWordCounter();
    }
    
    saveFormData() {
        const formData = this.getFormData();
        localStorage.setItem('formData', JSON.stringify(formData));
    }
    
    loadFormData() {
        const saved = localStorage.getItem('formData');
        if (saved) {
            const formData = JSON.parse(saved);
            if (formData.day) document.getElementById('day').value = formData.day;
            if (formData.city) document.getElementById('city').value = formData.city;
            if (formData.transport_mode) document.getElementById('transport').value = formData.transport_mode;
        }
    }
    
    updateSyncStatus(status, queueLength = 0) {
        const indicator = document.getElementById('statusIndicator');
        indicator.className = 'status-indicator';
        
        switch (status) {
            case 'synced':
                indicator.classList.add('status-synced');
                indicator.innerHTML = '✅ Synced to Notion';
                break;
            case 'syncing':
                indicator.classList.add('status-syncing');
                indicator.innerHTML = '🔄 Syncing...';
                break;
            case 'queued':
                indicator.classList.add('status-offline');
                indicator.innerHTML = `📱 Offline (${queueLength} queued)`;
                break;
            case 'error':
                indicator.classList.add('status-error');
                indicator.innerHTML = '❌ Sync error';
                break;
            default:
                indicator.classList.add('status-offline');
                indicator.innerHTML = navigator.onLine ? '📡 Ready' : '📱 Offline';
        }
    }
    
    showLoading(show) {
        const loading = document.getElementById('loadingIndicator');
        loading.style.display = show ? 'block' : 'none';
    }
    
    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
    
    showSuccess(message) {
        // Create temporary success message
        const successDiv = document.createElement('div');
        successDiv.className = 'status-indicator status-synced';
        successDiv.textContent = message;
        successDiv.style.position = 'fixed';
        successDiv.style.top = '20px';
        successDiv.style.left = '50%';
        successDiv.style.transform = 'translateX(-50%)';
        successDiv.style.zIndex = '1000';
        
        document.body.appendChild(successDiv);
        
        setTimeout(() => {
            successDiv.remove();
        }, 3000);
    }
    
    clearError() {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.style.display = 'none';
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.mobileApp = new MobileApp();
});

// Handle visibility change for background sync
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && notionClient) {
        notionClient.processOfflineQueue();
    }
});