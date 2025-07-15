// UK-Specific Intelligence and Features
class UKIntelligence {
    constructor() {
        this.postcodeRegex = /^[A-Z]{1,2}[0-9][A-Z0-9]?\s?[0-9][A-Z]{2}$/i;
        this.londonBoroughs = [
            'City of London', 'Westminster', 'Camden', 'Islington', 'Hackney',
            'Tower Hamlets', 'Greenwich', 'Lewisham', 'Southwark', 'Lambeth',
            'Wandsworth', 'Hammersmith and Fulham', 'Kensington and Chelsea',
            'Brent', 'Ealing', 'Hounslow', 'Richmond upon Thames', 'Kingston upon Thames',
            'Merton', 'Sutton', 'Croydon', 'Bromley', 'Lewisham', 'Bexley',
            'Havering', 'Barking and Dagenham', 'Redbridge', 'Newham',
            'Waltham Forest', 'Haringey', 'Enfield', 'Barnet', 'Harrow', 'Hillingdon'
        ];
        
        this.londonZones = {
            1: { center: [51.5074, -0.1278], radius: 5 },
            2: { center: [51.5074, -0.1278], radius: 8 },
            3: { center: [51.5074, -0.1278], radius: 12 },
            4: { center: [51.5074, -0.1278], radius: 20 },
            5: { center: [51.5074, -0.1278], radius: 30 },
            6: { center: [51.5074, -0.1278], radius: 50 }
        };
        
        this.majorAttractions = {
            london: [
                { name: 'Tower Bridge', coords: [51.5055, -0.0754], keywords: ['tower bridge', 'bridge'] },
                { name: 'Big Ben', coords: [51.4994, -0.1245], keywords: ['big ben', 'parliament', 'westminster'] },
                { name: 'London Eye', coords: [51.5033, -0.1196], keywords: ['london eye', 'eye', 'wheel'] },
                { name: 'Buckingham Palace', coords: [51.5014, -0.1419], keywords: ['buckingham', 'palace'] },
                { name: 'Tower of London', coords: [51.5081, -0.0759], keywords: ['tower of london', 'tower'] },
                { name: 'British Museum', coords: [51.5194, -0.1270], keywords: ['british museum', 'museum'] },
                { name: 'Tate Modern', coords: [51.5076, -0.0994], keywords: ['tate modern', 'tate'] },
                { name: 'St Pauls Cathedral', coords: [51.5138, -0.0984], keywords: ['st paul', 'cathedral'] },
                { name: 'Hyde Park', coords: [51.5073, -0.1657], keywords: ['hyde park', 'park'] },
                { name: 'Covent Garden', coords: [51.5118, -0.1226], keywords: ['covent garden', 'market'] }
            ],
            scotland: [
                { name: 'Edinburgh Castle', coords: [55.9486, -3.1999], keywords: ['edinburgh castle', 'castle'] },
                { name: 'Loch Ness', coords: [57.3229, -4.4244], keywords: ['loch ness', 'loch', 'ness'] },
                { name: 'Stirling Castle', coords: [56.1241, -3.9460], keywords: ['stirling castle'] },
                { name: 'Glen Coe', coords: [56.6759, -5.1019], keywords: ['glen coe', 'glencoe'] },
                { name: 'Royal Mile', coords: [55.9507, -3.1844], keywords: ['royal mile', 'mile'] },
                { name: 'Arthur\'s Seat', coords: [55.9441, -3.1615], keywords: ['arthurs seat', 'arthur'] },
                { name: 'Holyrood Palace', coords: [55.9527, -3.1719], keywords: ['holyrood', 'palace'] }
            ],
            manchester: [
                { name: 'Old Trafford', coords: [53.4631, -2.2914], keywords: ['old trafford', 'united'] },
                { name: 'Manchester Cathedral', coords: [53.4851, -2.2447], keywords: ['cathedral'] },
                { name: 'Salford Quays', coords: [53.4723, -2.2979], keywords: ['salford', 'quays'] },
                { name: 'Northern Quarter', coords: [53.4843, -2.2364], keywords: ['northern quarter'] }
            ]
        };
        
        this.transportStations = {
            tube: [
                'King\'s Cross St. Pancras', 'Liverpool Street', 'London Bridge', 'Victoria',
                'Paddington', 'Waterloo', 'Oxford Circus', 'Piccadilly Circus',
                'Leicester Square', 'Covent Garden', 'Tower Hill', 'Westminster'
            ],
            train: [
                'King\'s Cross', 'St. Pancras', 'Euston', 'Paddington', 'Victoria',
                'Waterloo', 'Liverpool Street', 'London Bridge', 'Marylebone',
                'Manchester Piccadilly', 'Edinburgh Waverley', 'Glasgow Central'
            ]
        };
        
        this.weatherPatterns = {
            london: { typical: 'Mild and cloudy', rainy: 0.4 },
            scotland: { typical: 'Cool and changeable', rainy: 0.6 },
            manchester: { typical: 'Mild and wet', rainy: 0.5 }
        };
    }
    
    // Analyze and enhance location data
    enhanceLocationData(locationData) {
        const enhanced = { ...locationData };
        
        // Extract and validate postcode
        enhanced.postcode = this.extractPostcode(locationData.location);
        
        // Detect London borough and zone
        if (locationData.city === 'London') {
            enhanced.borough = this.detectLondonBorough(locationData.location);
            enhanced.zone = this.detectLondonZone(locationData.latitude, locationData.longitude);
        }
        
        // Detect major attraction
        enhanced.attraction = this.detectAttraction(locationData);
        
        // Enhance transport mode detection
        enhanced.transport_mode = this.enhanceTransportDetection(locationData);
        
        // Add activity type
        enhanced.activity_type = this.detectActivityType(locationData.location);
        
        // Add travel tips
        enhanced.tips = this.generateTravelTips(enhanced);
        
        return enhanced;
    }
    
    extractPostcode(locationString) {
        const match = locationString.match(this.postcodeRegex);
        return match ? match[0].toUpperCase() : null;
    }
    
    detectLondonBorough(locationString) {
        const location = locationString.toLowerCase();
        return this.londonBoroughs.find(borough => 
            location.includes(borough.toLowerCase())
        ) || null;
    }
    
    detectLondonZone(lat, lng) {
        const centerLat = 51.5074;
        const centerLng = -0.1278;
        const distance = this.calculateDistance(lat, lng, centerLat, centerLng) / 1000; // km
        
        for (let zone = 1; zone <= 6; zone++) {
            if (distance <= this.londonZones[zone].radius) {
                return zone;
            }
        }
        return 6; // Default to zone 6 if outside
    }
    
    detectAttraction(locationData) {
        const location = locationData.location.toLowerCase();
        const city = locationData.city.toLowerCase();
        
        if (!this.majorAttractions[city]) return null;
        
        return this.majorAttractions[city].find(attraction => {
            return attraction.keywords.some(keyword => location.includes(keyword));
        })?.name || null;
    }
    
    enhanceTransportDetection(locationData) {
        const location = locationData.location.toLowerCase();
        const speed = locationData.speed || 0;
        const speedMph = speed * 2.237;
        
        // Check for station mentions
        if (this.transportStations.tube.some(station => 
            location.includes(station.toLowerCase()))) {
            return 'Tube';
        }
        
        if (this.transportStations.train.some(station => 
            location.includes(station.toLowerCase()))) {
            return 'Train';
        }
        
        // Check for transport keywords
        if (location.includes('station') || location.includes('underground')) {
            return speedMph > 15 ? 'Train' : 'Tube';
        }
        
        if (location.includes('airport')) {
            return 'Flight';
        }
        
        if (location.includes('bus stop') || location.includes('bus station')) {
            return 'Bus';
        }
        
        // Speed-based detection with UK-specific thresholds
        if (speedMph < 3) return 'Walking';
        if (speedMph < 20 && locationData.city === 'London') return 'Tube';
        if (speedMph < 40) return 'Bus';
        if (speedMph < 80) return 'Train';
        return 'Flight';
    }
    
    detectActivityType(locationString) {
        const location = locationString.toLowerCase();
        
        const activityKeywords = {
            sightseeing: ['palace', 'castle', 'cathedral', 'museum', 'gallery', 'monument', 'tower'],
            dining: ['restaurant', 'pub', 'cafe', 'bar', 'market', 'food'],
            shopping: ['shop', 'store', 'market', 'mall', 'street', 'quarter'],
            entertainment: ['theatre', 'cinema', 'club', 'venue', 'hall'],
            nature: ['park', 'garden', 'loch', 'glen', 'moor', 'heath'],
            transport: ['station', 'airport', 'terminal', 'stop'],
            accommodation: ['hotel', 'hostel', 'b&b', 'inn']
        };
        
        for (const [activity, keywords] of Object.entries(activityKeywords)) {
            if (keywords.some(keyword => location.includes(keyword))) {
                return activity;
            }
        }
        
        return 'other';
    }
    
    generateTravelTips(locationData) {
        const tips = [];
        
        // London-specific tips
        if (locationData.city === 'London') {
            if (locationData.zone <= 2) {
                tips.push('You\'re in central London - perfect for walking between attractions');
            }
            
            if (locationData.transport_mode === 'Tube') {
                tips.push('Stand on the right side of escalators on the London Underground');
            }
            
            if (locationData.activity_type === 'sightseeing' && locationData.attraction) {
                tips.push(`${locationData.attraction} is a must-see London landmark`);
            }
        }
        
        // Scotland-specific tips
        if (locationData.city === 'Scotland') {
            tips.push('Pack layers - Scottish weather can change quickly');
            
            if (locationData.activity_type === 'nature') {
                tips.push('Great for hiking - check weather conditions before heading out');
            }
        }
        
        // Transport tips
        if (locationData.transport_mode === 'Train') {
            tips.push('Book advance tickets for cheaper rail travel');
        }
        
        // Weather tips
        if (locationData.activity_type === 'nature') {
            tips.push('Bring waterproof clothing - it\'s the UK after all!');
        }
        
        return tips;
    }
    
    // Speed and transport analysis
    analyzeTransportEfficiency(locations) {
        const analysis = {
            byMode: {},
            recommendations: []
        };
        
        // Group by transport mode
        locations.forEach(location => {
            const mode = location.transport_mode;
            if (!analysis.byMode[mode]) {
                analysis.byMode[mode] = {
                    count: 0,
                    totalDistance: 0,
                    avgSpeed: 0,
                    locations: []
                };
            }
            
            analysis.byMode[mode].count++;
            analysis.byMode[mode].locations.push(location);
        });
        
        // Calculate efficiency metrics
        for (const mode in analysis.byMode) {
            const data = analysis.byMode[mode];
            if (data.locations.length > 1) {
                // Calculate total distance and average speed
                for (let i = 1; i < data.locations.length; i++) {
                    const dist = this.calculateDistance(
                        data.locations[i-1].latitude, data.locations[i-1].longitude,
                        data.locations[i].latitude, data.locations[i].longitude
                    );
                    data.totalDistance += dist;
                }
            }
        }
        
        // Generate recommendations
        if (analysis.byMode['Walking']?.count > 10) {
            analysis.recommendations.push('Consider using public transport for longer distances');
        }
        
        if (analysis.byMode['Tube']?.count > 5) {
            analysis.recommendations.push('Great use of London\'s tube network!');
        }
        
        return analysis;
    }
    
    // Postcode validation and enhancement
    validatePostcode(postcode) {
        if (!postcode) return { valid: false };
        
        const cleaned = postcode.replace(/\s/g, '').toUpperCase();
        const isValid = this.postcodeRegex.test(postcode);
        
        if (!isValid) return { valid: false };
        
        // Extract area and district
        const area = cleaned.match(/^[A-Z]{1,2}/)[0];
        const district = cleaned.match(/[0-9][A-Z0-9]?/)[0];
        const sector = cleaned.slice(-3, -2);
        const unit = cleaned.slice(-2);
        
        return {
            valid: true,
            formatted: `${area}${district} ${sector}${unit}`,
            area,
            district,
            sector,
            unit,
            region: this.getPostcodeRegion(area)
        };
    }
    
    getPostcodeRegion(area) {
        const regions = {
            'B': 'Birmingham',
            'M': 'Manchester', 
            'E': 'London East',
            'W': 'London West',
            'N': 'London North',
            'S': 'London South',
            'SW': 'London Southwest',
            'SE': 'London Southeast',
            'NW': 'London Northwest',
            'EC': 'London City',
            'WC': 'London West Central',
            'EH': 'Edinburgh',
            'G': 'Glasgow',
            'L': 'Liverpool'
        };
        
        return regions[area] || 'UK';
    }
    
    // Weather integration (mock - would integrate with Met Office API)
    async getWeatherData(lat, lng, date) {
        // Mock weather data - in real implementation, would call Met Office API
        const city = this.detectCityFromCoords(lat, lng);
        const pattern = this.weatherPatterns[city] || this.weatherPatterns.london;
        
        return {
            temperature: Math.round(Math.random() * 10 + 10), // 10-20°C
            condition: Math.random() < pattern.rainy ? 'Rainy' : pattern.typical,
            humidity: Math.round(Math.random() * 30 + 60), // 60-90%
            windSpeed: Math.round(Math.random() * 15 + 5) // 5-20 mph
        };
    }
    
    detectCityFromCoords(lat, lng) {
        // Simple city detection based on coordinates
        if (lat > 51.3 && lat < 51.7 && lng > -0.5 && lng < 0.2) return 'london';
        if (lat > 55.8 && lat < 56.0 && lng > -3.3 && lng < -3.1) return 'scotland';
        if (lat > 53.4 && lat < 53.5 && lng > -2.3 && lng < -2.2) return 'manchester';
        return 'london';
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
    
    // Cost estimation for UK travel
    estimateTravelCosts(locations) {
        const costs = {
            transport: 0,
            attractions: 0,
            total: 0
        };
        
        const transportCosts = {
            'Tube': 2.50,
            'Bus': 1.75,
            'Train': 15.00, // Average medium distance
            'Walking': 0,
            'Flight': 100.00,
            'Car': 0.45 // per km
        };
        
        const attractionCosts = {
            'Tower of London': 29.90,
            'London Eye': 27.00,
            'Edinburgh Castle': 17.50,
            'British Museum': 0, // Free entry
            'Tate Modern': 0
        };
        
        locations.forEach(location => {
            // Transport costs
            const transportCost = transportCosts[location.transport_mode] || 0;
            costs.transport += transportCost;
            
            // Attraction costs
            if (location.attraction && attractionCosts[location.attraction]) {
                costs.attractions += attractionCosts[location.attraction];
            }
        });
        
        costs.total = costs.transport + costs.attractions;
        
        return costs;
    }
}

// Initialize global instance
const ukIntelligence = new UKIntelligence();