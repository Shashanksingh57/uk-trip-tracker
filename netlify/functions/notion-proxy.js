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
    const apiKey = process.env.NOTION_API_KEY;
    const databaseId = process.env.NOTION_DATABASE_ID;

    if (!apiKey || !databaseId) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({
          error: 'Notion API key or database ID not configured',
          debug: {
            hasApiKey: !!apiKey,
            hasDbId: !!databaseId
          }
        }),
      };
    }

    const { action } = event.queryStringParameters || {};
    
    if (event.httpMethod === 'GET' && action === 'query') {
      // Query database entries using fetch
      const response = await fetch(`https://api.notion.com/v1/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify({
          sorts: [
            {
              property: 'Timestamp',
              direction: 'descending',
            },
          ],
        }),
      });

      if (!response.ok) {
        throw new Error(`Notion API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(data.results),
      };
    }

    if (event.httpMethod === 'POST' && action === 'create') {
      // Create new entry
      const data = JSON.parse(event.body);
      
      const pageData = {
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
      };

      const response = await fetch('https://api.notion.com/v1/pages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Notion-Version': '2022-06-28',
        },
        body: JSON.stringify(pageData),
      });

      if (!response.ok) {
        const errorData = await response.text();
        throw new Error(`Notion API error: ${response.status} ${response.statusText} - ${errorData}`);
      }

      const result = await response.json();

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(result),
      };
    }

    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({
        error: 'Invalid request. Use ?action=query or ?action=create',
      }),
    };

  } catch (error) {
    console.error('Notion API error:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: error.message,
        stack: error.stack
      }),
    };
  }
};