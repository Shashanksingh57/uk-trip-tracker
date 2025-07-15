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
        // Use Netlify function instead of direct API calls
        const isProduction = window.location.hostname !== 'localhost';
        const baseUrl = isProduction ? '/.netlify/functions' : 'http://localhost:8888/.netlify/functions';
        
        try {
            const response = await fetch(`${baseUrl}/notion-proxy${endpoint}`, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                }
            });
            
            if (!response.ok) {
                throw new Error(`Notion proxy error: ${response.status} ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('Notion proxy request failed:', error);
            throw error;
        }
    }
    
    async createEntry(locationData) {
        if (!navigator.onLine) {
            return this.queueOfflineEntry(locationData);
        }
        
        try {
            const response = await this.makeRequest('?action=create', {
                method: 'POST',
                body: JSON.stringify(locationData)
            });
            
            // Update sync status
            this.updateSyncStatus('synced');
            return response;
        } catch (error) {
            console.error('Failed to create Notion entry:', error);
            this.queueOfflineEntry(locationData);
            throw error;
        }
    }
    
    queueOfflineEntry(locationData) {
        this.offlineQueue.push({
            ...locationData,
            queued_timestamp: Date.now(),
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
        
        for (const locationData of queue) {
            try {
                await this.makeRequest('?action=create', {
                    method: 'POST',
                    body: JSON.stringify(locationData)
                });
                
                // Remove from queue on success
                console.log('Successfully synced offline entry');
            } catch (error) {
                console.error('Failed to sync offline entry:', error);
                // Re-add to queue on failure
                this.offlineQueue.push(locationData);
            }
        }
        
        localStorage.setItem('offlineQueue', JSON.stringify(this.offlineQueue));
        this.updateSyncStatus(this.offlineQueue.length > 0 ? 'error' : 'synced');
    }
    
    async queryEntries(filter = {}) {
        try {
            const response = await this.makeRequest('?action=query', {
                method: 'GET'
            });
            
            return response;
        } catch (error) {
            console.error('Failed to query Notion entries:', error);
            throw error;
        }
    }
    
    async getRecentEntries(limit = 10) {
        return await this.queryEntries();
    }
    
    updateSyncStatus(status) {
        const event = new CustomEvent('syncStatusChange', {
            detail: { status, queueLength: this.offlineQueue.length }
        });
        document.dispatchEvent(event);
    }
    
    // Validate configuration
    isConfigured() {
        // For Netlify function, we assume it's configured if we can reach the function
        return true;
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