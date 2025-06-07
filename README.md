# Chrome Bookmark New Tab Extension

A modern Chrome extension that replaces the new tab page with a beautiful, organized view of your bookmarks. Built with **React**, **TypeScript**, and **Tailwind CSS**.

## ✨ Features

- 🎨 **Modern UI** - Beautiful gradient background with glassmorphism effects
- 🔍 **Smart Search** - Real-time bookmark search with highlighting
- 📁 **Organized Folders** - Automatic folder organization with color coding
- ⚙️ **Customizable** - Adjustable column sizes and display options
- 🗑️ **Easy Management** - Delete bookmarks with confirmation
- 📱 **Responsive** - Works on all screen sizes
- ⚡ **Fast** - Built with modern React and optimized for performance

## 🛠️ Technology Stack

- **React 18** - Modern React with hooks and functional components
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **Webpack** - Module bundler and build tool
- **Lucide React** - Beautiful icons
- **Chrome Extension APIs** - Native bookmark and storage integration

## 🚀 Development

### Prerequisites

- Node.js 16+ 
- npm or yarn
- Chrome browser

### Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd chrome-bookmark-new-tab
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Development mode** (with hot reload)
   ```bash
   npm run dev
   ```

4. **Build for production**
   ```bash
   npm run build
   ```

### Loading the Extension

1. Build the extension: `npm run build`
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select this project folder
5. Open a new tab to see the extension in action

## 📁 Project Structure

```
src/
├── components/          # React components
│   ├── App.tsx         # Main application component
│   ├── SearchBox.tsx   # Search functionality
│   ├── BookmarkItem.tsx # Individual bookmark display
│   ├── FolderColumn.tsx # Folder organization
│   └── SettingsPanel.tsx # Settings UI
├── hooks/              # Custom React hooks
│   ├── useBookmarks.ts # Bookmark management
│   └── useSettings.ts  # Settings management
├── types/              # TypeScript type definitions
│   └── bookmark.ts     # Bookmark-related types
├── utils/              # Utility functions
│   ├── chrome-api.ts   # Chrome API wrappers
│   └── bookmark-helpers.ts # Bookmark processing
├── styles/             # Global styles
│   └── globals.css     # Tailwind CSS and custom styles
├── index.tsx           # React app entry point
└── new-tab.html        # HTML template
```

## 🧪 Testing

The extension includes comprehensive tests using Puppeteer:

```bash
# Run all tests
npm test

# Run specific test files
npm run test:basic      # Basic functionality
npm run test:real       # Real extension functionality
npm run test:interaction # Interaction testing
```

## ⚙️ Configuration

### Settings Panel

Access the settings by clicking the gear icon in the top-right corner:

- **Maximum entries per column**: Control how many bookmarks appear in each column (5-100)
- More settings coming soon!

### Storage

Settings are automatically saved to Chrome's local storage and persist across browser sessions.

## 🎨 Customization

### Tailwind CSS

The extension uses Tailwind CSS for styling. You can customize:

- Colors in `tailwind.config.js`
- Animations and transitions
- Component styles in individual components

### Folder Colors

Folder colors are automatically assigned from a predefined palette in `src/utils/bookmark-helpers.ts`.

## 📦 Build Process

The build process uses Webpack to:

1. Compile TypeScript to JavaScript
2. Process Tailwind CSS
3. Bundle React components
4. Generate optimized production files in `dist/`

## 🔧 Chrome Extension APIs Used

- **chrome.bookmarks** - Read and manage bookmarks
- **chrome.storage** - Save user settings
- **chrome.tabs** - New tab page override

## 🚀 Performance

- **Bundle size**: ~182KB (minified)
- **Load time**: < 100ms on modern hardware
- **Memory usage**: Minimal React footprint
- **Search**: Real-time with debouncing

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

MIT License - see LICENSE file for details

## 🔄 Migration from v1

This is a complete rewrite from vanilla JavaScript to React + TypeScript:

- ✅ **Improved maintainability** with component-based architecture
- ✅ **Type safety** with TypeScript
- ✅ **Modern styling** with Tailwind CSS
- ✅ **Better performance** with React optimizations
- ✅ **Enhanced testing** with comprehensive test suite

All original functionality has been preserved and enhanced!
