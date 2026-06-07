#!/bin/bash

# StudiMate AI - Quick Setup Script
# This script will install dependencies and start the development server

echo "🎓 StudiMate AI - Setup Script"
echo "================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null
then
    echo "❌ Node.js is not installed. Please install Node.js first."
    echo "   Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo "✅ npm version: $(npm --version)"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ package.json not found. Please run this script from the 'front' directory."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Dependencies installed successfully!"
    echo ""
    echo "🚀 Starting development server..."
    echo ""
    echo "   The app will be available at: http://localhost:3000"
    echo ""
    echo "   Press Ctrl+C to stop the server"
    echo ""
    npm run dev
else
    echo ""
    echo "❌ Failed to install dependencies. Please check the error messages above."
    exit 1
fi
