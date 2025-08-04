// Configuration for UK Trip Tracker
const CONFIG = {
    // Notion Configuration
    NOTION: {
        // These values should be set via environment variables on your server
        // For local development, the Netlify functions will use .env file
        API_KEY: 'YOUR_NOTION_API_KEY', // Set via environment variable
        DATABASE_ID: 'YOUR_DATABASE_ID', // Set via environment variable
        API_VERSION: '2022-06-28',
        BASE_URL: 'https://api.notion.com/v1',
        RATE_LIMIT: {
            REQUESTS_PER_SECOND: 3,
            RETRY_ATTEMPTS: 3,
            RETRY_DELAY: 1000
        }
    },
    
    // App Configuration
    APP: {
        NAME: 'UK Trip Tracker',
        VERSION: '1.0.0',
        DESCRIPTION_MAX_WORDS: 10,
        SYNC_INTERVAL: 30000, // 30 seconds
        GPS_ACCURACY_THRESHOLD: 50, // meters
        DUPLICATE_RADIUS: 50 // meters
    },
    
    // Map Configuration
    MAP: {
        DEFAULT_CENTER: [54.5, -2.5], // UK center
        DEFAULT_ZOOM: 6,
        TILE_URL: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        ATTRIBUTION: '© OpenStreetMap contributors',
        MAPBOX_ACCESS_TOKEN: 'pk.eyJ1Ijoic2hhc2hhbms1NyIsImEiOiJjbWR1bGFmeWgwNnR2Mm9xNW95eHk3dnJmIn0.jv2hGloCijtJQbGb3Vkz9A'
    },
    
    // UK Specific Configuration
    UK: {
        CITIES: ['London', 'Manchester', 'Scotland', 'Birmingham', 'Liverpool', 'Other'],
        TRANSPORT_MODES: ['Walking', 'Tube', 'Train', 'Bus', 'Car', 'Flight'],
        TRIP_DAYS: ['Day 1', 'Day 2', 'Day 3', 'Day 4', 'Day 5', 'Day 6', 'Day 7', 'Day 8', 'Day 9', 'Day 10', 'Day 11', 'Day 12'],
        LONDON_ZONES: [1, 2, 3, 4, 5, 6],
        SPEED_THRESHOLDS: {
            WALKING: 5, // mph
            TUBE: 30,
            TRAIN: 100,
            CAR: 70,
            FLIGHT: 200
        }
    }
};

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CONFIG;
}