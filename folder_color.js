// Import colorPalette from ui.js
import { colorPalette } from './ui.js';

// Map to store folder colors
let folderColors = {};

/**
 * Gets color for a folder
 * @param {string} folderId - The folder ID
 * @param {Object} allBookmarks - Reference to the bookmarks store
 * @returns {string} - The color for the folder
 */
function getFolderColor(folderId, allBookmarks) {
    const folder = allBookmarks[folderId];
    if (!folder) return colorPalette[0];

    // Get the color key based on the folder title
    const colorKey = folder.title;

    // Return existing color if already assigned
    if (folderColors[colorKey]) return folderColors[colorKey];

    // Assign a new color from the palette
    const colorIndex = Object.keys(folderColors).length % colorPalette.length;
    folderColors[colorKey] = colorPalette[colorIndex];
    return folderColors[colorKey];
}

/**
 * Resets folder colors
 */
function resetFolderColors() {
    folderColors = {};
}

// Export folder color functions and variables
export { getFolderColor, resetFolderColors }; 