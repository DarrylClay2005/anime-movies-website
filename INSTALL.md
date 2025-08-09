# 🎌 AnimeVerse Desktop - Installation Guide

AnimeVerse has been successfully compiled into native Linux executables! Here are your installation options:

## 📦 Available Formats

### 1. AppImage (Recommended - Universal Linux)
- **File**: `dist/AnimeVerse-1.0.0.AppImage` (98MB)
- **Architecture**: x64 (Intel/AMD 64-bit)
- **No installation required** - Just download and run!

### 2. AppImage (ARM64)
- **File**: `dist/AnimeVerse-1.0.0-arm64.AppImage` (99MB)
- **Architecture**: ARM64 (Apple Silicon, Raspberry Pi 4+, etc.)

### 3. Debian Package (.deb)
- **File**: `dist/animeverse-desktop_1.0.0_amd64.deb` (69MB)
- **For**: Ubuntu, Debian, Linux Mint, Pop!_OS, Elementary OS
- **Installation**: `sudo dpkg -i animeverse-desktop_1.0.0_amd64.deb`

### 4. Debian Package ARM64 (.deb)
- **File**: `dist/animeverse-desktop_1.0.0_arm64.deb` (64MB)
- **For**: ARM-based Linux distributions

## 🚀 Quick Start

### Method 1: AppImage (Easiest)
```bash
# Make executable and run
chmod +x dist/AnimeVerse-1.0.0.AppImage
./dist/AnimeVerse-1.0.0.AppImage --no-sandbox
```

### Method 2: Using the Launch Script
```bash
# Use the provided launcher
./launch-animeverse.sh
```

### Method 3: Install DEB Package
```bash
# Install system-wide
sudo dpkg -i dist/animeverse-desktop_1.0.0_amd64.deb

# Fix dependencies if needed
sudo apt-get install -f

# Launch from applications menu or command line
animeverse-desktop
```

## 🎯 Features

Your AnimeVerse desktop application includes:

### ✨ **Core Features**
- 🔍 **Advanced Search** - Search 25,000+ anime titles
- 📺 **Streaming Integration** - Direct links to 12+ platforms
- 📚 **Watchlist Management** - Save and organize favorites
- 🔞 **Age Verification** - Proper mature content protection
- 🎨 **Beautiful UI** - Glassmorphism design with animations

### 🖥️ **Desktop Enhancements**
- 📱 **Native Menus** - Full application menu bar
- ⌨️ **Keyboard Shortcuts**:
  - `Ctrl+F` - Focus search
  - `Ctrl+H` - Go to Home
  - `Ctrl+T` - Go to Trending
  - `Ctrl+W` - Go to Watchlist
  - `F11` - Toggle fullscreen
- 🔔 **Native Notifications** - Desktop notification support
- 🎯 **Better Performance** - Optimized for desktop use

## 🛠️ System Requirements

### Minimum Requirements
- **OS**: Linux (Ubuntu 18.04+, Debian 10+, or equivalent)
- **Architecture**: x64 or ARM64
- **RAM**: 4GB minimum, 8GB recommended
- **Disk Space**: 200MB for installation
- **Network**: Internet connection required for anime data

### Recommended Requirements
- **OS**: Ubuntu 20.04+ / Pop!_OS 20.04+ / Linux Mint 20+
- **RAM**: 8GB or more
- **GPU**: Hardware acceleration supported
- **Network**: Broadband internet connection

## 🔧 Troubleshooting

### AppImage Won't Start
```bash
# Try with no sandbox (common fix)
./dist/AnimeVerse-1.0.0.AppImage --no-sandbox

# Check for missing libraries
ldd dist/AnimeVerse-1.0.0.AppImage
```

### DEB Package Issues
```bash
# Fix missing dependencies
sudo apt-get install -f

# Check package info
dpkg -l animeverse-desktop
```

### General Issues
1. **Blank screen**: Try `--disable-gpu` flag
2. **Won't start**: Check console output for errors
3. **Performance issues**: Close other applications to free RAM
4. **Network errors**: Check your internet connection

## 📁 File Locations

### AppImage
- **Executable**: `./dist/AnimeVerse-1.0.0.AppImage`
- **User data**: `~/.config/AnimeVerse/`
- **Cache**: `~/.cache/AnimeVerse/`

### Installed DEB Package
- **Executable**: `/usr/bin/animeverse-desktop`
- **Application files**: `/usr/lib/animeverse-desktop/`
- **Desktop file**: `/usr/share/applications/animeverse.desktop`
- **User data**: `~/.config/AnimeVerse/`

## 🆕 Updates

The desktop application includes automatic update checking. When a new version is available, you'll be notified and can update automatically.

## 🐛 Reporting Issues

If you encounter any problems:

1. **Check the logs**: Look in `~/.config/AnimeVerse/logs/`
2. **Try safe mode**: Launch with `--disable-gpu --no-sandbox`
3. **Report issues**: https://github.com/DarrylClay2005/anime-movies-website/issues

Include your:
- Linux distribution and version
- Installation method (AppImage/DEB)
- Error messages or logs
- Steps to reproduce the issue

## 🎉 Enjoy AnimeVerse Desktop!

Your anime website is now a fully-featured desktop application! Enjoy discovering amazing anime with native performance and desktop integration.

**Made with ❤️ by Darryl Clay**
