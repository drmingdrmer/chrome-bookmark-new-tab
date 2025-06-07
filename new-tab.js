// Global bookmarks store
const allBookmarks = {};
let bookmarkTreeNodes = null; // Store the original bookmark tree
let config = {
    maxEntriesPerColumn: 10,
};
// Import drag operations from drag.js
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
// Import helper functions for UI elements from ui.js
import { createElement, div, textDiv, textSpan } from './ui.js';
// Import folder color functions from folder_color.js
import { getFolderColor, resetFolderColors } from './folder_color.js';


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

    // Add drag handle and content to container
    container.appendChild(dragHandle);
    container.appendChild(bookmarkContent);

    // Always create delete button regardless of search mode
    // Create delete button
    const deleteBtn = createElement('button',
        {
            className: 'delete-button',
            'aria-label': 'Delete bookmark',
            textContent: '×',
            tabindex: '-1',
        },
    );

    deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        showDeleteConfirmation(bookmark, e);
    });

    // Add delete button to the container
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

    // Remove search mode class when returning to normal view
    document.body.classList.remove('search-mode');

    // Get folders in correct order from the bookmark tree
    const { folders: topLevelFolders, directBookmarks } = getOrderedTopLevelFolders();

    // If there are direct bookmarks, create a column for them
    if (directBookmarks.length > 0) {
        const chunks = chunkArray(directBookmarks, config.maxEntriesPerColumn);
        chunks.forEach((chunk, index) => {
            const subtitle = chunks.length > 1 ? `Direct bookmarks (${index + 1}/${chunks.length})` : null;
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

            // Add the column to the container
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
            // Add the subfolder count
            count += countItemsInFolder(item);
        } else {
            // Add this bookmark
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
            const subtitle = chunkedBookmarks.length > 1 ? `Direct links (${index + 1}/${chunkedBookmarks.length})` : 'Direct links';
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
            // Get folder id from closest parent with folder-content class
            const folderContent = container.closest('.folder-content');
            if (!folderContent) return;

            const folderColumn = folderContent.closest('.folder-column');
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

    // Add a class to the body or container to indicate search mode
    document.body.classList.add('search-mode');

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
        const noResults = div('', {
            textContent: 'No bookmarks or folders found matching your search.',
            style: {
                padding: '20px',
                textAlign: 'center',
            },
        });
        container.appendChild(noResults);
        return;
    }

    // Add summary at the top
    const summaryColumn = div('folder-column', {
        style: {
            gridColumn: '1 / -1',
            marginBottom: '10px',
        },
    });

    const summaryHeader = div('folder-header');

    let summaryText = 'Search Results:';
    if (matchingFolders.length > 0) {
        summaryText += ` ${matchingFolders.length} folder${matchingFolders.length > 1 ? 's' : ''}`;
    }
    if (matchingFolders.length > 0 && matchingBookmarks.length > 0) {
        summaryText += ' and';
    }
    if (matchingBookmarks.length > 0) {
        summaryText += ` ${matchingBookmarks.length} bookmark${matchingBookmarks.length > 1 ? 's' : ''}`;
    }
    summaryText += ` found matching "${searchTerm}"`;

    summaryHeader.textContent = summaryText;
    summaryColumn.appendChild(summaryHeader);
    container.appendChild(summaryColumn);

    // SECTION 1: Display matching folders with their contents
    if (matchingFolders.length > 0) {
        const folderSectionHeader = div('folder-column', {
            style: {
                gridColumn: '1 / -1',
                marginBottom: '5px',
            },
        });

        const headerDiv = div('folder-header', { textContent: 'Matching Folders' });
        folderSectionHeader.appendChild(headerDiv);

        container.appendChild(folderSectionHeader);

        // Process each matching folder
        matchingFolders.forEach(folder => {
            // Get folder path
            const folderPath = getFolderPath(folder);
            const pathDisplay = folderPath.map(f => f.title).join(' > ');

            // Create a column for this folder
            const { column, content } = createFolderColumn(pathDisplay, null, folder.id);

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
                    const moreLink = document.createElement('a');
                    moreLink.href = '#';
                    moreLink.className = 'bookmark-link';
                    moreLink.textContent = `... and ${folder.children.length - MAX_ITEMS_TO_SHOW} more items`;
                    moreLink.style.fontStyle = 'italic';
                    moreLink.style.textAlign = 'center';
                    moreLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        // Clear search and show this folder's contents
                        document.getElementById('searchBox').value = '';
                        showFolderContents(folder.id);
                    });
                    content.appendChild(moreLink);
                }
            } else {
                const emptyNote = div('', {
                    textContent: 'This folder is empty',
                    style: {
                        fontStyle: 'italic',
                        padding: '5px',
                        opacity: '0.7',
                    },
                });
                content.appendChild(emptyNote);
            }

            container.appendChild(column);
        });
    }

    // SECTION 2: Display bookmarks that match the search term
    if (matchingBookmarks.length > 0) {
        const bookmarkSectionHeader = div('folder-column', {
            style: {
                gridColumn: '1 / -1',
                marginBottom: '5px',
                marginTop: '20px',
            },
        });

        const headerDiv = div('folder-header', { textContent: 'Matching Bookmarks' });
        bookmarkSectionHeader.appendChild(headerDiv);

        container.appendChild(bookmarkSectionHeader);

        // Group matches by parent folder
        const folderMatches = {};
        const folderMatchOrder = []; // Track insertion order

        matchingBookmarks.forEach(bookmark => {
            // Find the folder path for this bookmark
            const folderPath = getBookmarkFolderPath(bookmark);
            const folderKey = folderPath.map(f => f.id).join('-');

            if (!folderMatches[folderKey]) {
                folderMatches[folderKey] = {
                    path: folderPath,
                    bookmarks: [],
                };
                folderMatchOrder.push(folderKey); // Remember the order
            }
            folderMatches[folderKey].bookmarks.push(bookmark);
        });

        // Process folder matches in the original order they were encountered
        folderMatchOrder.forEach(key => {
            const group = folderMatches[key];
            const { path, bookmarks } = group;

            // Get the top-level folder to use for coloring
            const topFolderId = path.length > 0 ? path[0].id : null;

            // Create folder column with color
            const folderColumn = div('folder-column');

            // Apply color based on top folder
            if (topFolderId) {
                const color = getFolderColor(topFolderId, allBookmarks);
                folderColumn.style.backgroundColor = color;
            }

            // Create header with full path
            const folderHeader = div('folder-header');

            // Format the path for display
            const pathDisplay = path.map(f => f.title).join(' > ');
            folderHeader.textContent = pathDisplay;

            // Add match count as subheader
            const matchCount = textSpan('folder-subheader', `${bookmarks.length} match${bookmarks.length > 1 ? 'es' : ''}`);
            folderHeader.appendChild(matchCount);

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
            container.appendChild(folderColumn);
        });
    }
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

    if (!textElement || !textElement.textContent) return;

    const text = textElement.textContent;
    const lcText = text.toLowerCase();
    const lcSearch = searchTerm.toLowerCase();

    if (lcText.includes(lcSearch)) {
        // Find all occurrences
        const parts = [];
        let lastIndex = 0;
        let startIndex = lcText.indexOf(lcSearch);

        while (startIndex !== -1) {
            // Add text before match
            if (startIndex > lastIndex) {
                parts.push({
                    text: text.substring(lastIndex, startIndex),
                    isMatch: false,
                });
            }

            // Add match
            const endIndex = startIndex + lcSearch.length;
            parts.push({
                text: text.substring(startIndex, endIndex),
                isMatch: true,
            });

            lastIndex = endIndex;
            startIndex = lcText.indexOf(lcSearch, lastIndex);
        }

        // Add any remaining text
        if (lastIndex < text.length) {
            parts.push({
                text: text.substring(lastIndex),
                isMatch: false,
            });
        }

        // Clear element and add highlighted content
        textElement.innerHTML = '';
        parts.forEach(part => {
            if (part.isMatch) {
                const highlight = document.createElement('span');
                highlight.style.backgroundColor = 'rgba(255, 255, 100, 0.3)';
                highlight.style.padding = '0 2px';
                highlight.style.borderRadius = '2px';
                highlight.textContent = part.text;
                textElement.appendChild(highlight);
            } else {
                const textNode = document.createTextNode(part.text);
                textElement.appendChild(textNode);
            }
        });
    }

    // Also highlight URL if it exists and contains the search term
    if (urlElement && urlElement.textContent) {
        const urlText = urlElement.textContent;
        const lcUrlText = urlText.toLowerCase();

        if (lcUrlText.includes(lcSearch)) {
            // Find all occurrences in URL
            const urlParts = [];
            let lastIndex = 0;
            let startIndex = lcUrlText.indexOf(lcSearch);

            while (startIndex !== -1) {
                // Add text before match
                if (startIndex > lastIndex) {
                    urlParts.push({
                        text: urlText.substring(lastIndex, startIndex),
                        isMatch: false,
                    });
                }

                // Add match
                const endIndex = startIndex + lcSearch.length;
                urlParts.push({
                    text: urlText.substring(startIndex, endIndex),
                    isMatch: true,
                });

                lastIndex = endIndex;
                startIndex = lcUrlText.indexOf(lcSearch, lastIndex);
            }

            // Add any remaining text
            if (lastIndex < urlText.length) {
                urlParts.push({
                    text: urlText.substring(lastIndex),
                    isMatch: false,
                });
            }

            // Clear element and add highlighted content
            urlElement.innerHTML = '';
            urlParts.forEach(part => {
                if (part.isMatch) {
                    const highlight = document.createElement('span');
                    highlight.style.backgroundColor = 'rgba(255, 255, 100, 0.3)';
                    highlight.style.padding = '0 2px';
                    highlight.style.borderRadius = '2px';
                    highlight.textContent = part.text;
                    urlElement.appendChild(highlight);
                } else {
                    const textNode = document.createTextNode(part.text);
                    urlElement.appendChild(textNode);
                }
            });
        }
    }
}

// Show contents of a specific folder
function showFolderContents(folderId) {
    const folder = allBookmarks[folderId];
    if (!folder || !folder.isFolder) return;

    const container = document.getElementById('bookmarks-container');
    container.innerHTML = '';

    // Get folder path
    const folderPath = getFolderPath(folder);
    const pathDisplay = folderPath.map(f => f.title).join(' > ');

    // Create folder content
    const { column, content } = createFolderColumn(pathDisplay, null, folder.id);

    // Create a custom function to process folder contents with search mode awareness
    function processFolderContentsWithMode(childIds, container) {
        // Process items in order
        childIds.forEach(childId => {
            const item = allBookmarks[childId];
            if (!item) return;

            if (item.isFolder) {
                // This is a subfolder, add a header
                const subfolderHeader = textDiv('subfolder', item.title);
                container.appendChild(subfolderHeader);

                // Process bookmarks in this subfolder
                if (item.children && item.children.length > 0) {
                    processFolderContentsWithMode(item.children, container);
                }
            } else {
                // This is a bookmark, add it to the container (respecting search mode)
                container.appendChild(createBookmarkElement(item));
            }
        });
    }

    // Process folder contents with search mode awareness
    if (folder.children && folder.children.length > 0) {
        processFolderContentsWithMode(folder.children, content);
    } else {
        const emptyNote = div('', {
            textContent: 'This folder is empty',
            style: {
                fontStyle: 'italic',
                padding: '5px',
                opacity: '0.7',
            },
        });
        content.appendChild(emptyNote);
    }

    column.style.gridColumn = '1 / -1';
    container.appendChild(column);
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

// Show confirmation dialog for bookmark deletion
function showDeleteConfirmation(bookmark, event) {

    // Close any existing dialog first
    hideDeleteConfirmation();

    // Get the clicked delete button element and its position
    const deleteButton = event.currentTarget;

    // Get position of the delete button for positioning the dialog
    const buttonRect = deleteButton.getBoundingClientRect();

    // Create confirmation dialog
    const confirmDialog = div('delete-confirm', { id: 'delete-confirm' });

    // Position the dialog to the left of the delete button
    confirmDialog.style.position = 'fixed';
    confirmDialog.style.right = `${window.innerWidth - buttonRect.left + 10}px`;
    confirmDialog.style.top = `${buttonRect.top - 5}px`;

    // Dialog content
    const title = createElement('h3', { textContent: 'Delete Bookmark' });
    const message = createElement('p', { textContent: `Delete "${bookmark.title}"?` });
    const buttonsContainer = div('delete-confirm-buttons');

    const cancelBtn = createElement('button',
        {
            className: 'delete-confirm-cancel',
            textContent: 'Cancel',
        },
    );

    const deleteBtn = createElement('button',
        {
            className: 'delete-confirm-delete',
            textContent: 'Delete',
        },
    );

    cancelBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        hideDeleteConfirmation();
    });

    // Add keyboard controls for easier navigation
    cancelBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && e.shiftKey) {
            e.preventDefault();
            deleteBtn.focus();
        }
    });

    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteBookmark(bookmark.id);
        hideDeleteConfirmation();
    });

    // Add keyboard controls for easier navigation
    deleteBtn.addEventListener('keydown', (e) => {
        if (e.key === 'Tab' && !e.shiftKey) {
            e.preventDefault();
            cancelBtn.focus();
        }
    });

    // Assemble the dialog
    buttonsContainer.appendChild(cancelBtn);
    buttonsContainer.appendChild(deleteBtn);

    confirmDialog.appendChild(title);
    confirmDialog.appendChild(message);
    confirmDialog.appendChild(buttonsContainer);

    // Store original button for reference
    confirmDialog.dataset.sourceButtonId = deleteButton.id || Date.now().toString();
    if (!deleteButton.id) {
        deleteButton.id = confirmDialog.dataset.sourceButtonId;
    }

    // Add to document body instead of the bookmark item
    document.body.appendChild(confirmDialog);

    // Focus on the Cancel button by default (safer option)
    cancelBtn.focus();

    // Add keyboard event listener for Escape key
    document.addEventListener('keydown', handleEscapeKey);

    // Add click outside to close
    setTimeout(() => {
        document.addEventListener('click', handleClickOutside);
    }, 10);
}

function hideDeleteConfirmation() {
    // Remove the dialog
    const dialog = document.getElementById('delete-confirm');
    if (dialog) {
        document.body.removeChild(dialog);
    }

    // Remove event listeners
    document.removeEventListener('keydown', handleEscapeKey);
    document.removeEventListener('click', handleClickOutside);
}

function handleEscapeKey(e) {
    if (e.key === 'Escape') {
        hideDeleteConfirmation();
    }
}

function handleClickOutside(e) {
    const dialog = document.getElementById('delete-confirm');
    if (dialog && !dialog.contains(e.target) && !e.target.classList.contains('delete-button')) {
        hideDeleteConfirmation();
    }
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
            // If search is active, re-filter
            filterBookmarks(searchBox.value);
        } else {
            // Otherwise just render normally
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

    // Save to storage
    chrome.storage.sync.set({ config: config }, function () {
        renderBookmarks(); // Re-render with new settings
    });
}

function loadSettings() {
    chrome.storage.sync.get('config', function (result) {
        if (result.config) {
            config = result.config;
            // Update input values
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
        bookmarkTreeNodes = treeNodes; // Store the original tree
        collectAllBookmarks(treeNodes);
        renderBookmarks();
    });

    searchBox.addEventListener('input', (e) => {
        filterBookmarks(e.target.value);
    });

    // Set up the global drag end handler
    setupGlobalDragEndHandler();
}); 
