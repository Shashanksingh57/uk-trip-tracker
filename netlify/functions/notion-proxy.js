const { Client } = require('@notionhq/client');

exports.handler = async (event, context) => {
  // Set CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  };

  // Handle preflight requests
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: '',
    };
  }

  try {
    // Initialize Notion client with API key from environment variable
    const notion = new Client({
      auth: process.env.NOTION_API_KEY,
    });

    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!process.env.NOTION_API_KEY || !databaseId) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Notion API key or database ID not configured',
        }),
      };
    }

    const { action } = event.queryStringParameters || {};
    
    if (event.httpMethod === 'GET' && action === 'query') {
      // Query database entries
      const response = await notion.databases.query({
        database_id: databaseId,
        sorts: [
          {
            property: 'Timestamp',
            direction: 'descending',
          },
        ],
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response.results),
      };
    }

    if (event.httpMethod === 'POST' && action === 'create') {
      // Create new entry
      const data = JSON.parse(event.body);
      
      const response = await notion.pages.create({
        parent: { database_id: databaseId },
        properties: {
          'Title': {
            title: [{
              text: {
                content: `📍 ${data.location} - ${new Date(data.timestamp).toLocaleTimeString()}`
              }
            }]
          },
          'Timestamp': {
            date: {
              start: new Date(data.timestamp).toISOString()
            }
          },
          'Latitude': {
            number: parseFloat(data.latitude)
          },
          'Longitude': {
            number: parseFloat(data.longitude)
          },
          'Location': {
            rich_text: [{
              text: {
                content: data.location || 'Unknown Location'
              }
            }]
          },
          'Description': {
            rich_text: [{
              text: {
                content: data.description || ''
              }
            }]
          },
          'Day': {
            select: {
              name: data.day || 'Day 1'
            }
          },
          'City': {
            select: {
              name: data.city || 'Other'
            }
          },
          'Transport_Mode': {
            select: {
              name: data.transport_mode || 'Walking'
            }
          }
        }
      });

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response),
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Invalid request',
      }),
    };

  } catch (error) {
    console.error('Notion API error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
      }),
    };
  }
};