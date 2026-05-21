#!/bin/bash

echo "========================================"
echo "  OBSIDIAN AI LEARNING COMPANION"
echo "========================================"
echo ""

echo "Checking database setup..."
npm run check-db

echo ""
echo "Starting Obsidian..."
echo "Backend will run on http://localhost:5000"
echo "Frontend will run on http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both servers"
echo ""

npm start
