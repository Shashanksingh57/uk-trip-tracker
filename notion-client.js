// Notion API Client for UK Trip Tracker
class NotionClient {
    constructor() {
        this.apiKey = CONFIG.NOTION.API_KEY;
        this.databaseId = CONFIG.NOTION.DATABASE_ID;
        this.baseUrl = CONFIG.NOTION.BASE_URL;
        this.apiVersion = CONFIG.NOTION.API_VERSION;
        this.rateLimitQueue = [];
        this.isProcessingQueue = false;
        this.offlineQueue = JSON.parse(localStorage.getItem('offlineQueue') || '[]');
        this.lastSyncTime = localStorage.getItem('lastSyncTime') || Date.now();
        
        this.setupEventListeners();
    }
    
    setupEventListeners() {
        // Handle online/offline events
        window.addEventListener('online', () => {
            console.log('Back online - processing offline queue');
            this.processOfflineQueue();
        });
        
        window.addEventListener('offline', () => {
            console.log('Gone offline - queuing requests');
        });
    }
    
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Notion-Version': this.apiVersion,
            ...options.headers
        };
        
        try {
            const response = await fetch(url, {
                ...options,
                headers
            });
            
            if (!response.ok) {
                throw new Error(`Notion API error: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Notion API request failed:', error);
            throw error;
        }
    }
    
    async createEntry(locationData) {
        const entry = {
            parent: { database_id: this.databaseId },
            properties: {
                'Title': {
                    title: [{
                        text: {
                            content: `📍 ${locationData.location} - ${new Date(locationData.timestamp).toLocaleTimeString()}`
                        }
                    }]
                },
                'Timestamp': {
                    date: {
                        start: new Date(locationData.timestamp).toISOString()
                    }
                },
                'Latitude': {
                    number: parseFloat(locationData.latitude)
                },
                'Longitude': {
                    number: parseFloat(locationData.longitude)
                },
                'Location': {
                    rich_text: [{
                        text: {
                            content: locationData.location || 'Unknown Location'
                        }
                    }]
                },
                'Description': {
                    rich_text: [{
                        text: {
                            content: locationData.description || ''
                        }
                    }]
                },
                'Day': {
                    select: {
                        name: locationData.day || 'Day 1'
                    }
                },
                'City': {
                    select: {
                        name: locationData.city || 'Other'
                    }
                },
                'Transport_Mode': {
                    select: {
                        name: locationData.transport_mode || 'Walking'
                    }
                }
            }
        };
        
        if (locationData.weather) {
            entry.properties['Weather'] = {
                rich_text: [{
                    text: {
                        content: locationData.weather
                    }
                }]
            };
        }
        
        if (locationData.photo_url) {
            entry.properties['Photo_URL'] = {
                url: locationData.photo_url
            };
        }
        
        if (!navigator.onLine) {
            return this.queueOfflineEntry(entry);
        }
        
        try {
            const response = await this.makeRequest('/pages', {
                method: 'POST',
                body: JSON.stringify(entry)
            });
            
            // Update sync status
            this.updateSyncStatus('synced');
            return response;
        } catch (error) {
            console.error('Failed to create Notion entry:', error);
            this.queueOfflineEntry(entry);
            throw error;
        }
    }
    
    queueOfflineEntry(entry) {
        this.offlineQueue.push({
            ...entry,
            timestamp: Date.now(),
            id: Date.now().toString()
        });
        localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
        this.updateSyncStatus('queued');
        return { id: Date.now().toString(), queued: true };
    }
    
    async processOfflineQueue() {
        if (this.offlineQueue.length === 0 || !navigator.onLine) {
            return;
        }
        
        this.updateSyncStatus('syncing');
        
        const queue = [...this.offlineQueue];
        this.offlineQueue = [];
        
        for (const entry of queue) {
            try {
                await this.makeRequest('/pages', {
                    method: 'POST',
                    body: JSON.stringify(entry)
                });
                
                // Remove from queue on success
                console.log('Successfully synced offline entry');
            } catch (error) {
                console.error('Failed to sync offline entry:', error);
                // Re-add to queue on failure
                this.offlineQueue.push(entry);
            }
        }
        
        localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
        this.updateSyncStatus(this.offlineQueue.length > 0 ? 'error' : 'synced');
    }
    
    async queryEntries(filter = {}) {
        try {
            const response = await this.makeRequest(`/databases/${this.databaseId}/query`, {
                method: 'POST',
                body: JSON.stringify({
                    sorts: [
                        {
                            property: 'Timestamp',
                            direction: 'descending'
                        }
                    ],
                    ...filter
                })
            });
            
            return response.results;
        } catch (error) {
            console.error('Failed to query Notion entries:', error);
            throw error;
        }
    }
    
    async getRecentEntries(limit = 10) {
        return await this.queryEntries({
            page_size: limit
        });
    }
    
    updateSyncStatus(status) {
        const event = new CustomEvent('syncStatusChange', {
            detail: { status, queueLength: this.offlineQueue.length }
        });
        document.dispatchEvent(event);
    }
    
    // Validate configuration
    isConfigured() {
        return this.apiKey !== 'YOUR_NOTION_API_KEY' && 
               this.databaseId !== 'YOUR_DATABASE_ID' &&
               this.apiKey && this.databaseId;
    }
    
    // Get sync statistics
    getSyncStats() {
        return {
            queueLength: this.offlineQueue.length,
            lastSync: this.lastSyncTime,
            isOnline: navigator.onLine,
            configured: this.isConfigured()
        };
    }
}

// Initialize global instance
const notionClient = new NotionClient();