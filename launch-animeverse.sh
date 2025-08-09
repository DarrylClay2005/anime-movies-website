#!/bin/bash

# AnimeVerse Desktop Launcher
# This script launches the AnimeVerse desktop application

echo "🎌 Starting AnimeVerse Desktop..."

# Get the directory where this script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"

# Check if AppImage exists
APPIMAGE="$DIR/dist/AnimeVerse-1.0.0.AppImage"

if [ -f "$APPIMAGE" ]; then
    echo "✅ Found AppImage: $APPIMAGE"
    
    # Make sure it's executable
    chmod +x "$APPIMAGE"
    
    # Launch the application with sandbox disabled for development
    echo "🚀 Launching AnimeVerse Desktop Application..."
    "$APPIMAGE" --no-sandbox "$@" &
    
    echo "📱 AnimeVerse Desktop is starting..."
    echo "💡 If you encounter any issues, check the console output above."
    
else
    echo "❌ AnimeVerse AppImage not found at: $APPIMAGE"
    echo "📦 Please make sure you've built the application first:"
    echo "   npm run build-linux"
    exit 1
fi
