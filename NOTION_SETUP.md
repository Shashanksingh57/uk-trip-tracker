# 🔗 Notion Database Setup Guide

This guide walks you through setting up your Notion integration for UK Trip Tracker.

## 📋 Quick Setup Checklist

- [ ] Create Notion Integration
- [ ] Get API Key
- [ ] Create Database with Required Properties
- [ ] Share Database with Integration
- [ ] Configure API Key in App
- [ ] Test Connection

## 🚀 Step-by-Step Setup

### Step 1: Create Notion Integration

1. **Visit Notion Developers**
   - Go to [https://developers.notion.com/docs/create-a-notion-integration](https://developers.notion.com/docs/create-a-notion-integration)
   - Click "Create an integration"

2. **Fill Integration Details**
   ```
   Name: UK Trip Tracker
   Logo: Upload a travel-related icon (optional)
   Associated workspace: Select your workspace
   ```

3. **Save and Get API Key**
   - Click "Submit"
   - Copy the "Internal Integration Token"
   - This is your `NOTION_API_KEY`

### Step 2: Create Trip Database

1. **Create New Database**
   - In Notion, create a new page
   - Type `/database` and select "Table - Full page"
   - Name it "UK Trip Tracker"

2. **Add Required Properties**

| Property Name | Type | Configuration |
|---------------|------|---------------|
| Title | Title | Default property (rename if needed) |
| Timestamp | Date | Include time |
| Latitude | Number | Decimal places: 6 |
| Longitude | Number | Decimal places: 6 |
| Location | Text | Rich text |
| Description | Text | Rich text |
| Day | Select | Options: Day 1, Day 2, Day 3, Day 4, Day 5 |
| City | Select | Options: London, Manchester, Scotland, Birmingham, Liverpool, Other |
| Transport_Mode | Select | Options: Walking, Tube, Train, Bus, Car, Flight |
| Weather | Text | Rich text (optional) |
| Photo_URL | URL | For future photo attachments |

### Step 3: Configure Database Properties

#### Day Property (Select)
```
Options to add:
✅ Day 1 (Color: Red)
✅ Day 2 (Color: Orange) 
✅ Day 3 (Color: Yellow)
✅ Day 4 (Color: Green)
✅ Day 5 (Color: Blue)
```

#### City Property (Select)
```
Options to add:
✅ London (Color: Red)
✅ Manchester (Color: Orange)
✅ Scotland (Color: Blue)
✅ Birmingham (Color: Purple)
✅ Liverpool (Color: Green)
✅ Other (Color: Gray)
```

#### Transport_Mode Property (Select)
```
Options to add:
🚶 Walking (Color: Green)
🚇 Tube (Color: Blue)
🚂 Train (Color: Purple)
🚌 Bus (Color: Orange)
🚗 Car (Color: Red)
✈️ Flight (Color: Gray)
```

### Step 4: Share Database with Integration

1. **Access Database Sharing**
   - Click "Share" button in top-right of database
   - Click "Invite" 

2. **Add Integration**
   - Search for your integration name "UK Trip Tracker"
   - Select it from the dropdown
   - Ensure it has "Edit" permissions
   - Click "Invite"

3. **Get Database ID**
   - Copy the database URL
   - Extract the database ID from URL:
   ```
   URL: https://notion.so/workspace/a8aec43384f447ed84390e8e42c2e089?v=...
   Database ID: a8aec43384f447ed84390e8e42c2e089
   ```

### Step 5: Configure App

1. **Update config.js**
   ```javascript
   const CONFIG = {
       NOTION: {
           API_KEY: 'secret_1234567890abcdef...', // Your integration token
           DATABASE_ID: 'a8aec43384f447ed84390e8e42c2e089', // Your database ID
           API_VERSION: '2022-06-28',
           // ... rest of config
       }
   }
   ```

2. **Test Configuration**
   - Open the mobile app
   - Try logging a test location
   - Check if it appears in your Notion database

## ✅ Verification Steps

### Test Integration
1. **Open Mobile App**
   - Navigate to `mobile-app.html`
   - Should show "Ready" status instead of configuration warning

2. **Log Test Location**
   - Click "Log Current Location"
   - Fill in test data:
     ```
     Location: Test Location
     Description: Testing the integration
     Day: Day 1
     City: London
     Transport: Walking
     ```

3. **Check Notion Database**
   - Refresh your Notion database
   - New entry should appear with all data
   - Verify coordinates are populated

4. **Test Dashboard**
   - Open `dashboard.html`
   - Should load data from Notion
   - Map should show test location

## 🔧 Advanced Configuration

### Database Template
You can duplicate this database template:
```
https://www.notion.so/templates/travel-trip-tracker
```

### Custom Properties
Add additional properties for enhanced tracking:

| Property | Type | Purpose |
|----------|------|---------|
| Cost | Number | Track expenses |
| Rating | Select | Rate locations 1-5 stars |
| Tags | Multi-select | Custom tags |
| Notes | Text | Detailed notes |
| Duration | Number | Time spent at location |

### Automation Setup
Create Notion automations:
1. **Auto-tag by City**: Automatically add tags based on city
2. **Daily Summary**: Create daily summary pages
3. **Photo Integration**: Connect with photo storage

## 🛠️ Troubleshooting

### Common Issues

**"Unauthorized" Error:**
```
Problem: API key not working
Solution:
1. Verify API key is correct
2. Check integration has database access
3. Ensure database is shared with integration
```

**"Database not found" Error:**
```
Problem: Database ID incorrect
Solution:
1. Copy database ID from URL
2. Remove any extra characters
3. Ensure 32-character hex string
```

**Properties Missing:**
```
Problem: Database schema doesn't match
Solution:
1. Add all required properties
2. Match exact names and types
3. Configure select options correctly
```

**Data Not Syncing:**
```
Problem: Integration permissions
Solution:
1. Re-share database with integration
2. Ensure "Edit" permissions
3. Check API key validity
```

### Testing API Connection

Use this test script in browser console:
```javascript
// Test Notion API connection
async function testNotionConnection() {
    const apiKey = 'your_api_key';
    const databaseId = 'your_database_id';
    
    try {
        const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
            }
        });
        
        const data = await response.json();
        console.log('Connection successful:', data);
    } catch (error) {
        console.error('Connection failed:', error);
    }
}

testNotionConnection();
```

## 📊 Sample Data

### Test Entry
Create this sample entry to verify setup:
```json
{
    "Title": "📍 Tower Bridge - 14:30",
    "Timestamp": "2024-01-15T14:30:00.000Z",
    "Latitude": 51.5055,
    "Longitude": -0.0754,
    "Location": "Tower Bridge, London",
    "Description": "Amazing views iconic bridge sunset photos",
    "Day": "Day 1",
    "City": "London",
    "Transport_Mode": "Walking"
}
```

### Bulk Import
For testing with multiple entries, use Notion's CSV import:
1. Create CSV with proper headers
2. Import via Notion's import feature
3. Verify data appears correctly

## 🔄 Maintenance

### Regular Checks
- **Weekly**: Verify sync is working
- **Monthly**: Check API rate limits
- **Quarterly**: Review database structure

### Backup Strategy
1. **Export Database**: Regular Notion exports
2. **API Key Security**: Store securely, rotate periodically
3. **Schema Documentation**: Keep track of changes

### Integration Updates
- Monitor Notion API changes
- Update API version when needed
- Test new features before deploying

---

**Need help?** Create an issue in the repository with your error message and setup details! 🔗