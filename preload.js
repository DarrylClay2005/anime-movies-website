const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // App information
  getVersion: () => ipcRenderer.invoke('app-version'),
  
  // Dialog methods
  showMessageBox: (options) => ipcRenderer.invoke('show-message-box', options),
  showOpenDialog: (options) => ipcRenderer.invoke('show-open-dialog', options),
  showSaveDialog: (options) => ipcRenderer.invoke('show-save-dialog', options),
  
  // Platform information
  platform: process.platform,
  isElectron: true,
  
  // Version information
  versions: {
    node: process.versions.node,
    chrome: process.versions.chrome,
    electron: process.versions.electron
  }
});

// Desktop-specific enhancements
contextBridge.exposeInMainWorld('desktopAPI', {
  // Notification support
  showNotification: (title, body, icon = null) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      return new Notification(title, { body, icon });
    }
  },
  
  // Request notification permission
  requestNotificationPermission: async () => {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      return permission;
    }
    return 'denied';
  },
  
  // Check if running in desktop mode
  isDesktop: true,
  
  // Desktop-specific features
  features: {
    notifications: 'Notification' in window,
    fileSystem: true,
    menuBar: true,
    systemTray: false,
    autoUpdater: true
  }
});

// Add desktop-specific CSS when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // Add desktop class to body
  document.body.classList.add('desktop-app');
  
  // Inject desktop-specific styles
  const desktopStyles = document.createElement('style');
  desktopStyles.textContent = `
    /* Desktop-specific styles */
    body.desktop-app {
      user-select: none;
      -webkit-user-select: none;
    }
    
    body.desktop-app input,
    body.desktop-app textarea,
    body.desktop-app [contenteditable] {
      user-select: text;
      -webkit-user-select: text;
    }
    
    /* Prevent text selection on cards but allow on inputs */
    .anime-card {
      user-select: none;
      -webkit-user-select: none;
    }
    
    /* Better scrollbars for desktop */
    ::-webkit-scrollbar {
      width: 8px;
      height: 8px;
    }
    
    ::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.3);
      border-radius: 4px;
    }
    
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.5);
    }
    
    /* Desktop navigation enhancements */
    .nav-link {
      cursor: pointer;
    }
    
    /* Desktop-specific hover effects */
    body.desktop-app .anime-card:hover {
      transform: translateY(-8px);
      box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
    }
    
    /* Desktop modal improvements */
    body.desktop-app .modal-overlay {
      backdrop-filter: blur(20px);
    }
    
    /* Desktop button styles */
    body.desktop-app button:focus {
      outline: 2px solid var(--accent-color);
      outline-offset: 2px;
    }
  `;
  
  document.head.appendChild(desktopStyles);
  
  // Add desktop-specific functionality
  addDesktopFeatures();
});

function addDesktopFeatures() {
  // Enhanced keyboard shortcuts for desktop
  document.addEventListener('keydown', (e) => {
    // Ctrl/Cmd + , for preferences (if implemented)
    if ((e.ctrlKey || e.metaKey) && e.key === ',') {
      e.preventDefault();
      // Could open preferences modal
    }
    
    // F11 for fullscreen toggle
    if (e.key === 'F11') {
      e.preventDefault();
      // Electron handles this automatically
    }
    
    // Alt + Left/Right for navigation (if implemented)
    if (e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      // Could implement forward/back navigation
    }
  });
  
  // Desktop-specific toast notifications
  if (window.showToast) {
    const originalShowToast = window.showToast;
    window.showToast = function(message, type = 'info') {
      // Show original web toast
      originalShowToast(message, type);
      
      // Also show native notification for important messages
      if (type === 'success' || type === 'error') {
        window.desktopAPI?.showNotification('AnimeVerse', message);
      }
    };
  }
  
  // Add version info to footer or about section
  if (window.electronAPI) {
    window.electronAPI.getVersion().then(version => {
      // Could display version in UI
      console.log('AnimeVerse Desktop v' + version);
    });
  }
  
  // Handle external links properly in desktop
  document.addEventListener('click', (e) => {
    const link = e.target.closest('a[href^="http"]');
    if (link) {
      e.preventDefault();
      // External links will be handled by main process
    }
  });
  
  // Desktop-specific startup message
  setTimeout(() => {
    if (window.showToast) {
      window.showToast('Welcome to AnimeVerse Desktop! 🎌', 'success');
    }
  }, 2000);
}
