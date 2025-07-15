// Configuration for UK Trip Tracker
const CONFIG = {
    // Notion Configuration
    NOTION: {
        // Using your existing Notion integration token
        API_KEY: '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', // UK Trip Tracker integration
        DATABASE_ID: '033242e49e7d43bb9871d98d731344d9', // UK Trip Tracker database (working format)
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
        ATTRIBUTION: '© OpenStreetMap contributors'
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