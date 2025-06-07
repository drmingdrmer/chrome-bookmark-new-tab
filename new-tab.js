import {
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleEmptyFolderDrop,
    updateBookmarkOrder,
    addEmptyFolderDragoverHandler,
    setupGlobalDragEndHandler,
} from './drag.js';
import { createElement, div, textDiv, textSpan } from './ui.js';
import { getFolderColor, resetFolderColors } from './folder_color.js';

const allBookmarks = {};
let bookmarkTreeNodes = null;
let config = { maxEntriesPerColumn: 10 };

function createBookmarkElement(bookmark) {
    // Create container with bookmark content and prepare for delete button
    const container = div('bookmark-item', {}, []);

    // Add drag handle
    const dragHandle = createElement('div', {
        className: 'drag-handle',
        draggable: true,
        'aria-label': 'Drag to reorder',
        title: 'Drag to reorder',
        tabindex: '-1',
    });

    // Add grip icon to the drag handle (using a simple 3-dots design)
    for (let i = 0; i < 3; i++) {
        dragHandle.appendChild(createElement('span', { className: 'drag-dot' }));
    }

    // Add drag events
    dragHandle.addEventListener('dragstart', (e) => handleDragStart(e, bookmark, allBookmarks));

    // Add bookmark content
    const bookmarkContent = div('bookmark-content', {}, [
        createElement('a', {
            href: bookmark.url,
            className: 'bookmark-link',
            textContent: bookmark.title || bookmark.url,
        }),
        div('bookmark-url', { textContent: bookmark.url }),
    ]);

    // Always create delete button regardless of search mode
    // Create delete button
    const deleteBtn = createElement('button', {
        className: 'delete-button',
        'aria-label': 'Delete bookmark',
        textContent: '×',
        tabindex: '-1',
    });

    deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        // Use native confirm dialog
        if (confirm(`Delete "${bookmark.title}"?`)) {
            deleteBookmark(bookmark.id);
        }
    });

    // Add drag handle and content to container
    container.appendChild(dragHandle);
    container.appendChild(bookmarkContent);
    container.appendChild(deleteBtn);

    // Set data attributes to help with drag operations
    container.dataset.bookmarkId = bookmark.id;
    container.dataset.parentId = bookmark.parentId;

    // Add drop-related events to the container
    container.addEventListener('dragover', handleDragOver);
    container.addEventListener('dragleave', handleDragLeave);
    container.addEventListener('drop', (e) => handleDrop(e, bookmark, allBookmarks, updateBookmarkOrder, filterBookmarks, renderBookmarks));

    return container;
}

function collectAllBookmarks(nodes) {
    nodes.forEach(node => {
        if (node.children) {
            // This is a folder
            allBookmarks[node.id] = {
                id: node.id,
                title: node.title,
                parentId: node.parentId,
                isFolder: true,
                children: node.children.map(child => child.id),
            };
            collectAllBookmarks(node.children);
        } else if (node.url) {
            // This is a bookmark
            allBookmarks[node.id] = {
                id: node.id,
                title: node.title || node.url,
                url: node.url,
                parentId: node.parentId,
                isFolder: false,
            };
        }
    });
}

// Helper function to get folders in the correct order from the bookmark tree
function getOrderedTopLevelFolders() {
    if (!bookmarkTreeNodes) return [];

    const orderedFolders = [];
    const directBookmarks = [];

    // Find Bookmarks Bar and Other Bookmarks in the tree
    bookmarkTreeNodes.forEach(rootNode => {
        if (rootNode.children) {
            rootNode.children.forEach(node => {
                if (node.id === '1' || node.id === '2') { // Bookmarks Bar or Other Bookmarks
                    if (node.children) {
                        node.children.forEach(child => {
                            const item = allBookmarks[child.id];
                            if (item) {
                                if (item.isFolder) {
                                    orderedFolders.push(item);
                                } else {
                                    directBookmarks.push(item);
                                }
                            }
                        });
                    }
                }
            });
        }
    });

    return { folders: orderedFolders, directBookmarks };
}

function renderBookmarks() {
    const container = document.getElementById('bookmarks-container');
    container.innerHTML = '';

    // Reset folder colors on re-render
    resetFolderColors();

    // Get folders in correct order from the bookmark tree
    const { folders: topLevelFolders, directBookmarks } = getOrderedTopLevelFolders();

    // If there are direct bookmarks, create a column for them
    if (directBookmarks.length > 0) {
        const chunks = chunkArray(directBookmarks, config.maxEntriesPerColumn);
        chunks.forEach((chunk, index) => {
            let subtitle = null;
            if (chunks.length > 1) {
                subtitle = `Direct bookmarks (${index + 1}/${chunks.length})`;
            }
            const { column, content } = createFolderColumn('Direct bookmarks', subtitle);

            chunk.forEach(bookmark => {
                content.appendChild(createBookmarkElement(bookmark));
            });

            container.appendChild(column);
        });
    }

    // Process each top-level folder
    topLevelFolders.forEach(folder => {
        if (!folder.children || folder.children.length === 0) return;

        // Count total items in folder (recursive)
        const itemCount = countItemsInFolder(folder);

        if (itemCount <= config.maxEntriesPerColumn) {
            // Create a single column for this folder
            const folderColumn = createFolderColumn(folder.title, null, folder.id);
            // Add all items to the column (don't skip subfolders since we're not splitting)
            processBookmarksInFolder(folder.children, folderColumn.content, false);
            container.appendChild(folderColumn.column);
        } else {
            // We need to split this folder into multiple columns
            splitFolderIntoColumns(folder, container);
        }
    });
}

function countItemsInFolder(folder) {
    if (!folder.children) return 0;

    let count = 0;
    folder.children.forEach(childId => {
        const item = allBookmarks[childId];
        if (!item) return;

        if (item.isFolder) {
            count += countItemsInFolder(item);
        } else {
            count++;
        }
    });

    return count;
}

function createFolderColumn(title, subtitle = null, folderId = null) {
    const folderColumn = div('folder-column');

    // Apply color if folderId is provided
    if (folderId) {
        const color = getFolderColor(folderId, allBookmarks);
        folderColumn.style.backgroundColor = color;
        // Store folder ID as data attribute for drag operations
        folderColumn.dataset.folderId = folderId;
    }

    const folderHeader = textDiv('folder-header', title);
    if (subtitle) {
        folderHeader.appendChild(textSpan('folder-subheader', subtitle));
    }

    folderColumn.appendChild(folderHeader);

    const folderContent = div('folder-content');
    folderColumn.appendChild(folderContent);

    return { column: folderColumn, content: folderContent };
}

function splitFolderIntoColumns(folder, container) {
    if (!folder.children || folder.children.length === 0) return;

    // First, separate direct bookmarks from subfolders
    const directBookmarks = [];
    const subfolders = [];

    folder.children.forEach(childId => {
        const item = allBookmarks[childId];
        if (!item) return;

        if (item.isFolder) {
            subfolders.push(item);
        } else {
            directBookmarks.push(item);
        }
    });

    // Add direct bookmarks to their own column if there are any
    if (directBookmarks.length > 0) {
        const chunkedBookmarks = chunkArray(directBookmarks, config.maxEntriesPerColumn);

        chunkedBookmarks.forEach((chunk, index) => {
            let subtitle;
            if (chunkedBookmarks.length > 1) {
                subtitle = `Direct links (${index + 1}/${chunkedBookmarks.length})`;
            } else {
                subtitle = 'Direct links';
            }
            // For direct links, use folder.id to maintain the same color across direct links sections
            const { column, content } = createFolderColumn(folder.title, subtitle, folder.id);

            chunk.forEach(bookmark => {
                content.appendChild(createBookmarkElement(bookmark));
            });

            container.appendChild(column);
        });
    }

    // Process subfolders
    subfolders.forEach(subfolder => {
        const itemCount = countItemsInFolder(subfolder);

        if (itemCount <= config.maxEntriesPerColumn) {
            // This subfolder fits in one column
            // For subfolders, use the subfolder's ID to get different colors for different subfolders
            const { column, content } = createFolderColumn(folder.title, subfolder.title, subfolder.id);
            // Skip subfolders to avoid duplication since we handle subfolders separately in splitFolderIntoColumns
            processBookmarksInFolder(subfolder.children, content, true);
            container.appendChild(column);
        } else {
            // This subfolder needs to be split
            splitSubfolderIntoColumns(folder.title, subfolder, container);
        }
    });
}

function splitSubfolderIntoColumns(parentTitle, subfolder, container) {
    // Collect all bookmarks in this subfolder (flattened)
    const allSubfolderBookmarks = [];

    function collectBookmarks(childIds) {
        childIds.forEach(childId => {
            const item = allBookmarks[childId];
            if (!item) return;

            if (item.isFolder) {
                if (item.children) {
                    collectBookmarks(item.children);
                }
            } else {
                allSubfolderBookmarks.push(item);
            }
        });
    }

    collectBookmarks(subfolder.children);

    // Split into chunks
    const chunks = chunkArray(allSubfolderBookmarks, config.maxEntriesPerColumn);

    // Create a column for each chunk
    chunks.forEach((chunk, index) => {
        const subtitle = `${subfolder.title} (${index + 1}/${chunks.length})`;
        // Use the subfolder's ID for consistent coloring within this subfolder's chunks
        const { column, content } = createFolderColumn(parentTitle, subtitle, subfolder.id);

        chunk.forEach(bookmark => {
            content.appendChild(createBookmarkElement(bookmark));
        });

        container.appendChild(column);
    });
}

function chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

function processBookmarksInFolder(childIds, container, skipSubfolders = false) {
    // Process items in order
    childIds.forEach(childId => {
        const item = allBookmarks[childId];
        if (!item) return;

        if (item.isFolder) {
            // Skip subfolders if we're processing them separately (to avoid duplication)
            if (skipSubfolders) return;

            // This is a subfolder, add a header
            const subfolderHeader = textDiv('subfolder', item.title);
            container.appendChild(subfolderHeader);

            // Process bookmarks in this subfolder
            if (item.children && item.children.length > 0) {
                processBookmarksInFolder(item.children, container);
            }
        } else {
            // This is a bookmark, add it to the container
            container.appendChild(createBookmarkElement(item));
        }
    });

    // Add folder-level dragover event for empty folders
    if (childIds.length === 0 || container.children.length === 0) {
        addEmptyFolderDragoverHandler(container);

        container.addEventListener('drop', (e) => {
            const folderColumn = container.closest('.folder-column');
            if (!folderColumn || !folderColumn.dataset.folderId) return;

            const folderId = folderColumn.dataset.folderId;
            const folder = allBookmarks[folderId];
            if (!folder || !folder.isFolder) return;

            handleEmptyFolderDrop(e, container, folderId, allBookmarks, updateBookmarkOrder, filterBookmarks, renderBookmarks);
        });
    }
}

function filterBookmarks(searchTerm) {
    const container = document.getElementById('bookmarks-container');

    if (!searchTerm.trim()) {
        // Reset to normal view if search is cleared
        renderBookmarks();
        return;
    }

    // Reset folder colors for search
    resetFolderColors();

    container.innerHTML = '';

    const lowercaseSearch = searchTerm.toLowerCase();

    // FIRST SECTION: Find folders that match the search term
    // Use Array.from to preserve the order in which they were defined
    const matchingFolders = Array.from(Object.values(allBookmarks).filter(item =>
        item.isFolder && item.title.toLowerCase().includes(lowercaseSearch),
    ));

    // SECOND SECTION: Find bookmarks that match the search term
    // Use Array.from to preserve the order in which they were defined
    const matchingBookmarks = Array.from(Object.values(allBookmarks).filter(item =>
        !item.isFolder && (
            item.title.toLowerCase().includes(lowercaseSearch) ||
            (item.url && item.url.toLowerCase().includes(lowercaseSearch))
        ),
    ));

    // If no matches at all
    if (matchingFolders.length === 0 && matchingBookmarks.length === 0) {
        const noResults = div('no-results', { textContent: 'No bookmarks or folders found' });
        container.appendChild(noResults);
        return;
    }

    // Add compact search info
    const searchInfo = div('search-info', {
        textContent: `${matchingFolders.length + matchingBookmarks.length} results for "${searchTerm}"`
    });
    container.appendChild(searchInfo);

    // Display all results in a compact layout
    const allResults = [];

    // Add matching folders first
    matchingFolders.forEach(folder => {
        // Get folder path
        const folderPath = getFolderPath(folder);
        const pathDisplay = folderPath.map(f => f.title).join(' > ');

        // Create a column for this folder
        const { column, content } = createFolderColumn(folder.title, pathDisplay, folder.id);

        // Highlight the folder name in the header
        const folderHeader = column.querySelector('.folder-header');
        highlightText(folderHeader, searchTerm);

        // Show contents of the folder (limited to avoid overwhelming)
        const MAX_ITEMS_TO_SHOW = 10;
        let itemCount = 0;

        if (folder.children && folder.children.length > 0) {
            folder.children.forEach(childId => {
                if (itemCount >= MAX_ITEMS_TO_SHOW) return;

                const item = allBookmarks[childId];
                if (!item) return;

                if (!item.isFolder) {
                    // Add bookmark with search mode enabled
                    const bookmarkElement = createBookmarkElement(item);
                    content.appendChild(bookmarkElement);
                    itemCount++;
                }
            });

            // Add "see more" link if needed
            if (folder.children.length > MAX_ITEMS_TO_SHOW) {
                const remaining = folder.children.length - MAX_ITEMS_TO_SHOW;
                const moreText = div('more-items-text', {
                    textContent: `+${remaining} more item${remaining > 1 ? 's' : ''}`
                });
                content.appendChild(moreText);
            }
        } else {
            const emptyNote = div('empty-folder-note', { textContent: 'Empty folder' });
            content.appendChild(emptyNote);
        }

        allResults.push(column);
    });

    // Add matching bookmarks
    if (matchingBookmarks.length > 0) {
        // Group matches by parent folder
        const folderGroups = [];
        const folderKeys = new Set();

        matchingBookmarks.forEach(bookmark => {
            // Find the folder path for this bookmark
            const folderPath = getBookmarkFolderPath(bookmark);
            const folderKey = folderPath.map(f => f.id).join('-');

            if (!folderKeys.has(folderKey)) {
                folderKeys.add(folderKey);
                folderGroups.push({ path: folderPath, bookmarks: [] });
            }

            const group = folderGroups.find(g => g.path.map(f => f.id).join('-') === folderKey);
            group.bookmarks.push(bookmark);
        });

        // Process folder groups
        folderGroups.forEach(group => {
            const { path, bookmarks } = group;

            // Get the top-level folder to use for coloring
            let topFolderId = null;
            if (path.length > 0) {
                topFolderId = path[0].id;
            }

            // Create folder column with color
            const folderColumn = div('folder-column');

            // Apply color based on top folder
            if (topFolderId) {
                const color = getFolderColor(topFolderId, allBookmarks);
                folderColumn.style.backgroundColor = color;
            }

            // Create header with full path
            const folderHeader = div('folder-header');

            // Format the path for display - use last folder as title
            let folderTitle;
            if (path.length > 0) {
                folderTitle = path[path.length - 1].title;
            } else {
                folderTitle = 'Direct bookmarks';
            }

            let fullPath = null;
            if (path.length > 1) {
                fullPath = path.slice(0, -1).map(f => f.title).join(' > ');
            }

            folderHeader.textContent = folderTitle;

            // Add path and match count as subheader
            const subheaderParts = [];
            if (fullPath) {
                subheaderParts.push(fullPath);
            }
            if (bookmarks.length > 1) {
                subheaderParts.push(`${bookmarks.length} matches`);
            }

            if (subheaderParts.length > 0) {
                const subheaderText = subheaderParts.join(' • ');
                const subheader = textSpan('folder-subheader', subheaderText);
                folderHeader.appendChild(subheader);
            }

            folderColumn.appendChild(folderHeader);

            // Add bookmarks
            const folderContent = div('folder-content');

            bookmarks.forEach(bookmark => {
                // Create bookmark element with search mode enabled
                const link = createBookmarkElement(bookmark);

                // Get the content element that contains the bookmark link
                const content = link.querySelector('.bookmark-content');

                // Highlight the matched text
                highlightText(content, searchTerm);

                folderContent.appendChild(link);
            });

            folderColumn.appendChild(folderContent);
            allResults.push(folderColumn);
        });
    }

    // Display all results
    allResults.forEach(result => container.appendChild(result));
}

// Helper function to get the path of a folder
function getFolderPath(folder) {
    const path = [folder]; // Include the folder itself
    let currentId = folder.parentId;

    // Traverse up the folder hierarchy
    while (currentId) {
        const parentFolder = allBookmarks[currentId];
        if (!parentFolder) break;
        path.unshift(parentFolder); // Add to beginning of array
        currentId = parentFolder.parentId;
    }

    return path;
}

// Helper function to get the full folder path for a bookmark
function getBookmarkFolderPath(bookmark) {
    const path = [];
    let currentId = bookmark.parentId;

    // Traverse up the folder hierarchy
    while (currentId) {
        const folder = allBookmarks[currentId];
        if (!folder) break;
        path.unshift(folder); // Add to beginning of array
        currentId = folder.parentId;
    }

    return path;
}

// Helper function to highlight search term in text
function highlightText(element, searchTerm) {
    if (!searchTerm.trim()) return;

    // Find the bookmark link element if we're highlighting a bookmark-content element
    let textElement = element;
    let urlElement = null;

    if (element.classList.contains('bookmark-content')) {
        textElement = element.querySelector('.bookmark-link');
        urlElement = element.querySelector('.bookmark-url');
    }

    function highlightInElement(el, search) {
        if (!el || !el.textContent) return;

        const text = el.textContent;
        const lcText = text.toLowerCase();
        const lcSearch = search.toLowerCase();

        if (!lcText.includes(lcSearch)) return;

        // Find all occurrences
        const parts = [];
        let lastIndex = 0;
        let startIndex = lcText.indexOf(lcSearch);

        while (startIndex !== -1) {
            // Add text before match
            if (startIndex > lastIndex) {
                parts.push({ text: text.substring(lastIndex, startIndex), isMatch: false });
            }

            // Add match
            const endIndex = startIndex + lcSearch.length;
            parts.push({ text: text.substring(startIndex, endIndex), isMatch: true });

            lastIndex = endIndex;
            startIndex = lcText.indexOf(lcSearch, lastIndex);
        }

        // Add any remaining text
        if (lastIndex < text.length) {
            parts.push({ text: text.substring(lastIndex), isMatch: false });
        }

        // Clear element and add highlighted content
        el.innerHTML = '';
        parts.forEach(part => {
            if (part.isMatch) {
                const highlight = document.createElement('span');
                highlight.style.backgroundColor = 'rgba(255, 255, 100, 0.3)';
                highlight.style.padding = '0 2px';
                highlight.style.borderRadius = '2px';
                highlight.textContent = part.text;
                el.appendChild(highlight);
            } else {
                const textNode = document.createTextNode(part.text);
                el.appendChild(textNode);
            }
        });
    }

    highlightInElement(textElement, searchTerm);
    highlightInElement(urlElement, searchTerm);
}

function deleteBookmark(id) {
    chrome.bookmarks.remove(id, () => {
        // Check for error
        if (chrome.runtime.lastError) {
            console.error(chrome.runtime.lastError.message);
            return;
        }

        // Update our local store
        const bookmark = allBookmarks[id];
        if (bookmark && bookmark.parentId) {
            const parent = allBookmarks[bookmark.parentId];
            if (parent && parent.children) {
                // Remove from parent's children array
                parent.children = parent.children.filter(childId => childId !== id);
            }
        }

        // Remove from our local store
        delete allBookmarks[id];

        // Refresh the view
        const searchBox = document.getElementById('searchBox');
        if (searchBox.value.trim()) {
            filterBookmarks(searchBox.value);
        } else {
            renderBookmarks();
        }
    });
}

// Settings functions
function toggleSettings() {
    const settingsPanel = document.getElementById('settings-panel');
    settingsPanel.classList.toggle('visible');
}

function saveSettings() {
    const maxEntriesInput = document.getElementById('max-entries');
    config.maxEntriesPerColumn = parseInt(maxEntriesInput.value) || 20;

    chrome.storage.sync.set({ config: config }, () => {
        renderBookmarks();
    });
}

function loadSettings() {
    chrome.storage.sync.get('config', (result) => {
        if (result.config) {
            config = result.config;
            document.getElementById('max-entries').value = config.maxEntriesPerColumn;
        }
    });
}

document.addEventListener('DOMContentLoaded', () => {
    const searchBox = document.getElementById('searchBox');
    const settingsToggle = document.getElementById('settings-toggle');
    const maxEntriesInput = document.getElementById('max-entries');

    // Load settings
    loadSettings();

    // Event listeners
    settingsToggle.addEventListener('click', toggleSettings);
    maxEntriesInput.addEventListener('change', saveSettings);

    // Click outside to close settings
    document.addEventListener('click', (e) => {
        const settingsPanel = document.getElementById('settings-panel');
        if (e.target !== settingsToggle && !settingsPanel.contains(e.target) && settingsPanel.classList.contains('visible')) {
            settingsPanel.classList.remove('visible');
        }
    });

    chrome.bookmarks.getTree((treeNodes) => {
        bookmarkTreeNodes = treeNodes;
        collectAllBookmarks(treeNodes);
        renderBookmarks();
    });

    searchBox.addEventListener('input', (e) => {
        filterBookmarks(e.target.value);
    });

    // Set up the global drag end handler
    setupGlobalDragEndHandler();
}); 
