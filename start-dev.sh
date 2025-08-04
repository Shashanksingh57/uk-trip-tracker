#!/bin/bash
echo "Starting UK Trip Tracker Development Server..."
echo ""
echo "This will start Netlify Dev with function support for Notion API"
echo ""

# Kill any existing servers
pkill -f "http-server" 2>/dev/null
pkill -f "python -m http.server" 2>/dev/null

# Start Netlify dev
npx netlify dev --port 8080

echo ""
echo "Server should be running at: http://localhost:8080"
echo "Story Map: http://localhost:8080/story-map.html"