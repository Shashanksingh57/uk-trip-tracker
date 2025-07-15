// Trip Card Generator for UK Trip Tracker
class TripCardGenerator {
    constructor() {
        this.canvas = document.getElementById('cardCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.allLocations = [];
        this.filteredLocations = [];
        this.currentSize = 'square';
        this.currentTheme = 'london';
        
        this.sizes = {
            square: { width: 1080, height: 1080 },
            story: { width: 1080, height: 1920 },
            landscape: { width: 1920, height: 1080 }
        };
        
        this.themes = {
            london: {
                primary: '#e74c3c',
                secondary: '#c0392b',
                accent: '#f39c12',
                text: '#2c3e50',
                textLight: '#ffffff'
            },
            scotland: {
                primary: '#3498db',
                secondary: '#2980b9',
                accent: '#e67e22',
                text: '#2c3e50',
                textLight: '#ffffff'
            },
            nature: {
                primary: '#27ae60',
                secondary: '#229954',
                accent: '#f39c12',
                text: '#2c3e50',
                textLight: '#ffffff'
            }
        };
        
        this.setupEventListeners();
        this.loadTripData();
    }
    
    setupEventListeners() {
        // Size selection
        document.querySelectorAll('.size-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.size-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentSize = e.target.dataset.size;
                this.updatePreview();
            });
        });
        
        // Theme selection
        document.querySelectorAll('.theme-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                this.currentTheme = e.target.dataset.theme;
                this.updatePreview();
            });
        });
        
        // Filter changes
        document.getElementById('daySelect').addEventListener('change', () => this.applyFilters());
        document.getElementById('citySelect').addEventListener('change', () => this.applyFilters());
        
        // Generate button
        document.getElementById('generateBtn').addEventListener('click', () => this.generateCard());
        
        // Download button
        document.getElementById('downloadBtn').addEventListener('click', () => this.downloadCard());
    }
    
    async loadTripData() {
        try {
            // Load from Notion if configured, otherwise from localStorage
            if (notionClient && notionClient.isConfigured()) {
                const notionData = await notionClient.queryEntries();
                this.allLocations = this.processNotionData(notionData);
            } else {
                const localData = JSON.parse(localStorage.getItem('tripEntries') || '[]');
                this.allLocations = localData;
            }
            
            this.applyFilters();
            
        } catch (error) {
            console.error('Error loading trip data:', error);
            this.showError('Failed to load trip data: ' + error.message);
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
                transport_mode: props.Transport_Mode?.select?.name || 'Walking'
            };
        }).filter(loc => loc.latitude && loc.longitude);
    }
    
    applyFilters() {
        const dayFilter = document.getElementById('daySelect').value;
        const cityFilter = document.getElementById('citySelect').value;
        
        this.filteredLocations = this.allLocations.filter(location => {
            if (dayFilter !== 'all' && location.day !== dayFilter) return false;
            if (cityFilter !== 'all' && location.city !== cityFilter) return false;
            return true;
        });
        
        // Sort by timestamp
        this.filteredLocations.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        
        this.updateStats();
    }
    
    updateStats() {
        const stats = this.calculateStats();
        
        document.getElementById('previewLocations').textContent = stats.locations;
        document.getElementById('previewDistance').textContent = stats.distance + ' km';
        document.getElementById('previewDuration').textContent = stats.duration + ' hours';
        document.getElementById('previewCities').textContent = stats.cities;
    }
    
    calculateStats() {
        if (this.filteredLocations.length === 0) {
            return { locations: 0, distance: 0, duration: 0, cities: 0 };
        }
        
        // Calculate distance
        let totalDistance = 0;
        for (let i = 1; i < this.filteredLocations.length; i++) {
            const dist = this.calculateDistance(
                this.filteredLocations[i-1].latitude, this.filteredLocations[i-1].longitude,
                this.filteredLocations[i].latitude, this.filteredLocations[i].longitude
            );
            totalDistance += dist;
        }
        
        // Calculate duration
        const firstTime = new Date(this.filteredLocations[0].timestamp);
        const lastTime = new Date(this.filteredLocations[this.filteredLocations.length - 1].timestamp);
        const duration = Math.round((lastTime - firstTime) / (1000 * 60 * 60));
        
        // Count unique cities
        const uniqueCities = new Set(this.filteredLocations.map(loc => loc.city)).size;
        
        return {
            locations: this.filteredLocations.length,
            distance: Math.round(totalDistance / 1000),
            duration: Math.max(duration, 1),
            cities: uniqueCities
        };
    }
    
    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3;
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
    
    async generateCard() {
        if (this.filteredLocations.length === 0) {
            this.showError('No locations found for the selected filters');
            return;
        }
        
        this.showLoading(true);
        
        try {
            await this.renderCard();
            this.showLoading(false);
            document.getElementById('downloadBtn').style.display = 'block';
            document.getElementById('placeholderText').style.display = 'none';
            this.canvas.style.display = 'block';
        } catch (error) {
            console.error('Error generating card:', error);
            this.showError('Failed to generate card: ' + error.message);
            this.showLoading(false);
        }
    }
    
    async renderCard() {
        const size = this.sizes[this.currentSize];
        const theme = this.themes[this.currentTheme];
        
        // Set canvas size
        this.canvas.width = size.width;
        this.canvas.height = size.height;
        
        // Clear canvas
        this.ctx.clearRect(0, 0, size.width, size.height);
        
        // Create gradient background
        const gradient = this.ctx.createLinearGradient(0, 0, size.width, size.height);
        gradient.addColorStop(0, theme.primary);
        gradient.addColorStop(1, theme.secondary);
        this.ctx.fillStyle = gradient;
        this.ctx.fillRect(0, 0, size.width, size.height);
        
        // Layout based on card size
        if (this.currentSize === 'square') {
            await this.renderSquareLayout(size, theme);
        } else if (this.currentSize === 'story') {
            await this.renderStoryLayout(size, theme);
        } else {
            await this.renderLandscapeLayout(size, theme);
        }
    }
    
    async renderSquareLayout(size, theme) {
        const padding = 60;
        const contentWidth = size.width - (padding * 2);
        
        // Header
        await this.renderHeader(padding, 80, contentWidth, theme);
        
        // Map area
        const mapY = 200;
        const mapHeight = 400;
        await this.renderMiniMap(padding, mapY, contentWidth, mapHeight, theme);
        
        // Stats
        const statsY = mapY + mapHeight + 40;
        await this.renderStats(padding, statsY, contentWidth, theme);
        
        // Top locations
        const locationsY = statsY + 120;
        await this.renderTopLocations(padding, locationsY, contentWidth, 200, theme);
        
        // Footer
        await this.renderFooter(padding, size.height - 80, contentWidth, theme);
    }
    
    async renderStoryLayout(size, theme) {
        const padding = 60;
        const contentWidth = size.width - (padding * 2);
        
        // Header
        await this.renderHeader(padding, 100, contentWidth, theme);
        
        // Stats
        await this.renderStats(padding, 250, contentWidth, theme);
        
        // Map area
        const mapY = 450;
        const mapHeight = 600;
        await this.renderMiniMap(padding, mapY, contentWidth, mapHeight, theme);
        
        // Top locations
        const locationsY = mapY + mapHeight + 60;
        await this.renderTopLocations(padding, locationsY, contentWidth, 400, theme);
        
        // Footer
        await this.renderFooter(padding, size.height - 80, contentWidth, theme);
    }
    
    async renderLandscapeLayout(size, theme) {
        const padding = 80;
        const leftWidth = 600;
        const rightWidth = size.width - leftWidth - (padding * 3);
        
        // Left side - Map
        await this.renderMiniMap(padding, 120, leftWidth, size.height - 240, theme);
        
        // Right side content
        const rightX = padding + leftWidth + padding;
        
        // Header
        await this.renderHeader(rightX, 120, rightWidth, theme);
        
        // Stats
        await this.renderStats(rightX, 280, rightWidth, theme);
        
        // Top locations
        await this.renderTopLocations(rightX, 480, rightWidth, 400, theme);
        
        // Footer
        await this.renderFooter(rightX, size.height - 80, rightWidth, theme);
    }
    
    async renderHeader(x, y, width, theme) {
        // Title
        this.ctx.fillStyle = theme.textLight;
        this.ctx.font = 'bold 64px Arial';
        this.ctx.textAlign = 'center';
        
        const title = this.getCardTitle();
        this.ctx.fillText(title, x + width/2, y);
        
        // Subtitle
        this.ctx.font = '32px Arial';
        this.ctx.fillStyle = theme.textLight;
        this.ctx.globalAlpha = 0.9;
        
        const subtitle = this.getCardSubtitle();
        this.ctx.fillText(subtitle, x + width/2, y + 60);
        
        this.ctx.globalAlpha = 1;
    }
    
    async renderMiniMap(x, y, width, height, theme) {
        // Create map background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.fillRect(x, y, width, height);
        
        // Add border
        this.ctx.strokeStyle = theme.accent;
        this.ctx.lineWidth = 4;
        this.ctx.strokeRect(x, y, width, height);
        
        if (this.filteredLocations.length === 0) return;
        
        // Calculate bounds
        const bounds = this.calculateBounds();
        
        // Draw route
        if (this.filteredLocations.length > 1) {
            this.ctx.strokeStyle = theme.primary;
            this.ctx.lineWidth = 6;
            this.ctx.beginPath();
            
            this.filteredLocations.forEach((location, index) => {
                const mapX = x + ((location.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * width;
                const mapY = y + height - ((location.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * height;
                
                if (index === 0) {
                    this.ctx.moveTo(mapX, mapY);
                } else {
                    this.ctx.lineTo(mapX, mapY);
                }
            });
            
            this.ctx.stroke();
        }
        
        // Draw markers
        this.filteredLocations.forEach((location, index) => {
            const mapX = x + ((location.longitude - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * width;
            const mapY = y + height - ((location.latitude - bounds.minLat) / (bounds.maxLat - bounds.minLat)) * height;
            
            // Marker circle
            this.ctx.fillStyle = index === 0 ? '#4CAF50' : index === this.filteredLocations.length - 1 ? '#f44336' : theme.accent;
            this.ctx.beginPath();
            this.ctx.arc(mapX, mapY, 12, 0, 2 * Math.PI);
            this.ctx.fill();
            
            // Marker border
            this.ctx.strokeStyle = 'white';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();
        });
        
        // Add compass
        this.renderCompass(x + width - 60, y + 60, 25, theme);
    }
    
    calculateBounds() {
        if (this.filteredLocations.length === 0) return null;
        
        let minLat = this.filteredLocations[0].latitude;
        let maxLat = this.filteredLocations[0].latitude;
        let minLng = this.filteredLocations[0].longitude;
        let maxLng = this.filteredLocations[0].longitude;
        
        this.filteredLocations.forEach(location => {
            minLat = Math.min(minLat, location.latitude);
            maxLat = Math.max(maxLat, location.latitude);
            minLng = Math.min(minLng, location.longitude);
            maxLng = Math.max(maxLng, location.longitude);
        });
        
        // Add padding
        const latPadding = (maxLat - minLat) * 0.1 || 0.01;
        const lngPadding = (maxLng - minLng) * 0.1 || 0.01;
        
        return {
            minLat: minLat - latPadding,
            maxLat: maxLat + latPadding,
            minLng: minLng - lngPadding,
            maxLng: maxLng + lngPadding
        };
    }
    
    renderCompass(x, y, radius, theme) {
        // Compass circle
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, 2 * Math.PI);
        this.ctx.fill();
        
        // North arrow
        this.ctx.fillStyle = theme.primary;
        this.ctx.font = 'bold 16px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('N', x, y - 5);
    }
    
    async renderStats(x, y, width, theme) {
        const stats = this.calculateStats();
        const statItems = [
            { label: 'Locations', value: stats.locations },
            { label: 'Distance', value: stats.distance + 'km' },
            { label: 'Duration', value: stats.duration + 'h' },
            { label: 'Cities', value: stats.cities }
        ];
        
        const itemWidth = width / statItems.length;
        
        statItems.forEach((stat, index) => {
            const itemX = x + (index * itemWidth);
            
            // Background
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
            this.ctx.fillRect(itemX + 10, y, itemWidth - 20, 80);
            
            // Value
            this.ctx.fillStyle = theme.textLight;
            this.ctx.font = 'bold 36px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.fillText(stat.value, itemX + itemWidth/2, y + 35);
            
            // Label
            this.ctx.font = '18px Arial';
            this.ctx.globalAlpha = 0.8;
            this.ctx.fillText(stat.label, itemX + itemWidth/2, y + 60);
            this.ctx.globalAlpha = 1;
        });
    }
    
    async renderTopLocations(x, y, width, height, theme) {
        const topLocations = this.getTopLocations();
        
        // Title
        this.ctx.fillStyle = theme.textLight;
        this.ctx.font = 'bold 28px Arial';
        this.ctx.textAlign = 'left';
        this.ctx.fillText('Top Locations', x, y);
        
        // Background
        this.ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
        this.ctx.fillRect(x, y + 20, width, height - 20);
        
        // Locations list
        const itemHeight = 45;
        topLocations.slice(0, 5).forEach((location, index) => {
            const itemY = y + 60 + (index * itemHeight);
            
            // Location icon and name
            this.ctx.fillStyle = theme.textLight;
            this.ctx.font = '20px Arial';
            this.ctx.textAlign = 'left';
            
            const text = `${index + 1}. ${location.location}`;
            const maxWidth = width - 40;
            const truncatedText = this.truncateText(text, maxWidth, '20px Arial');
            this.ctx.fillText(truncatedText, x + 20, itemY);
            
            // Description
            if (location.description) {
                this.ctx.font = '16px Arial';
                this.ctx.globalAlpha = 0.7;
                const descText = `"${location.description}"`;
                const truncatedDesc = this.truncateText(descText, maxWidth, '16px Arial');
                this.ctx.fillText(truncatedDesc, x + 20, itemY + 22);
                this.ctx.globalAlpha = 1;
            }
        });
    }
    
    getTopLocations() {
        // Return most recent or most interesting locations
        return this.filteredLocations
            .filter(loc => loc.description && loc.description.trim())
            .slice(-5)
            .reverse();
    }
    
    truncateText(text, maxWidth, font) {
        this.ctx.font = font;
        if (this.ctx.measureText(text).width <= maxWidth) {
            return text;
        }
        
        while (text.length > 0 && this.ctx.measureText(text + '...').width > maxWidth) {
            text = text.slice(0, -1);
        }
        
        return text + '...';
    }
    
    async renderFooter(x, y, width, theme) {
        // Branding
        this.ctx.fillStyle = theme.textLight;
        this.ctx.font = '18px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.globalAlpha = 0.8;
        
        const footerText = '🇬🇧 UK Trip Tracker • Generated with Claude Code';
        this.ctx.fillText(footerText, x + width/2, y);
        
        this.ctx.globalAlpha = 1;
    }
    
    getCardTitle() {
        const dayFilter = document.getElementById('daySelect').value;
        const cityFilter = document.getElementById('citySelect').value;
        
        if (dayFilter !== 'all') {
            return `🇬🇧 ${dayFilter} Adventure`;
        } else if (cityFilter !== 'all') {
            return `🇬🇧 ${cityFilter} Trip`;
        } else {
            return '🇬🇧 UK Adventure';
        }
    }
    
    getCardSubtitle() {
        const stats = this.calculateStats();
        return `${stats.locations} locations • ${stats.distance}km • ${stats.cities} cities`;
    }
    
    downloadCard() {
        const link = document.createElement('a');
        link.download = `uk-trip-${this.currentSize}-${Date.now()}.jpg`;
        link.href = this.canvas.toDataURL('image/jpeg', 0.9);
        link.click();
    }
    
    updatePreview() {
        // This could trigger a live preview update
        if (this.canvas.style.display === 'block') {
            this.generateCard();
        }
    }
    
    showLoading(show) {
        const loading = document.getElementById('loadingIndicator');
        const btn = document.getElementById('generateBtn');
        
        loading.style.display = show ? 'block' : 'none';
        btn.disabled = show;
        btn.textContent = show ? '📸 Generating...' : '📸 Generate Trip Card';
    }
    
    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.tripCardGenerator = new TripCardGenerator();
});