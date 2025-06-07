// Drag and Drop functionality for Chrome bookmarks
const dragOperation = {
    dragging: false,
    draggedElement: null,
    sourceFolderId: null,
    originalIndex: -1,
};

/**
 * Handles the start of a drag operation
 * @param {DragEvent} e - The drag event
 * @param {Object} bookmark - The bookmark being dragged
 * @param {Object} allBookmarks - Reference to the bookmarks store
 */
function handleDragStart(e, bookmark, allBookmarks) {
    // Start dragging and store the bookmark information
    dragOperation.dragging = true;
    dragOperation.draggedElement = e.target.closest('.bookmark-item');
    dragOperation.sourceFolderId = bookmark.parentId;

    // Find the index of this bookmark in its parent folder
    const parentFolder = allBookmarks[bookmark.parentId];
    if (parentFolder && parentFolder.children) {
        dragOperation.originalIndex = parentFolder.children.indexOf(bookmark.id);
    }

    // Set drag effects and data
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', bookmark.id);

    // Add dragging class for styling
    dragOperation.draggedElement.classList.add('dragging');

    // Create a custom drag image if desired
    // const dragImage = dragOperation.draggedElement.cloneNode(true);
    // document.body.appendChild(dragImage);
    // e.dataTransfer.setDragImage(dragImage, 0, 0);
    // setTimeout(() => document.body.removeChild(dragImage), 0);
}

/**
 * Handles the dragover event
 * @param {DragEvent} e - The drag event
 */
function handleDragOver(e) {
    // Allow the drop
    e.preventDefault();

    if (!dragOperation.dragging) return;

    // Add a visual indicator for the drop target
    e.currentTarget.classList.add('drag-over');

    // Determine drop position (before or after)
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;

    // Remove any existing position indicators
    e.currentTarget.classList.remove('drop-before', 'drop-after');

    // Add appropriate position indicator
    if (e.clientY < midY) {
        e.currentTarget.classList.add('drop-before');
    } else {
        e.currentTarget.classList.add('drop-after');
    }
}

/**
 * Handles the dragleave event
 * @param {DragEvent} e - The drag event
 */
function handleDragLeave(e) {
    // Remove visual indicators when leaving a potential drop target
    e.currentTarget.classList.remove('drag-over', 'drop-before', 'drop-after');
}

/**
 * Handles the drop event
 * @param {DragEvent} e - The drag event
 * @param {Object} targetBookmark - The bookmark being dropped on
 * @param {Object} allBookmarks - Reference to the bookmarks store
 * @param {Function} updateBookmarkOrder - Function to update bookmark order
 * @param {Function} filterBookmarks - Function to filter bookmarks in search mode
 * @param {Function} renderBookmarks - Function to render all bookmarks
 */
function handleDrop(e, targetBookmark, allBookmarks, updateBookmarkOrder, filterBookmarks, renderBookmarks) {
    // Prevent default behavior
    e.preventDefault();
    e.stopPropagation();

    // Remove visual indicators
    e.currentTarget.classList.remove('drag-over', 'drop-before', 'drop-after');

    if (!dragOperation.dragging) return;

    // Get dragged bookmark ID
    const draggedId = e.dataTransfer.getData('text/plain');
    const draggedBookmark = allBookmarks[draggedId];

    if (!draggedBookmark) return;

    // Determine if dropping before or after the target
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const dropBefore = e.clientY < midY;

    // Get parent folder
    const parentId = targetBookmark.parentId;
    const parentFolder = allBookmarks[parentId];

    if (!parentFolder || !parentFolder.children) return;

    // Find indexes
    const targetIndex = parentFolder.children.indexOf(targetBookmark.id);
    let newIndex = targetIndex;

    if (!dropBefore) {
        newIndex++;
    }

    // If it's the same folder and dropping at the same position or just after the dragged item,
    // no changes needed
    if (parentId === dragOperation.sourceFolderId) {
        const oldIndex = dragOperation.originalIndex;

        if (oldIndex === newIndex || oldIndex + 1 === newIndex) {
            resetDragState();
            return;
        }

        // Adjust index if moving within the same folder
        if (oldIndex < newIndex) {
            newIndex--;
        }
    }

    // Move the bookmark
    chrome.bookmarks.move(draggedId, {
        parentId: parentId,
        index: newIndex,
    }, () => {
        if (chrome.runtime.lastError) {
            console.error('Error moving bookmark:', chrome.runtime.lastError);
            resetDragState();
            return;
        }

        // Update our local data structure
        updateBookmarkOrder(draggedId, parentId, newIndex, allBookmarks);

        // Re-render bookmarks
        const searchBox = document.getElementById('searchBox');
        if (searchBox.value.trim()) {
            filterBookmarks(searchBox.value);
        } else {
            renderBookmarks();
        }
    });

    resetDragState();
}

/**
 * Handles dropping into an empty folder container
 * @param {DragEvent} e - The drag event
 * @param {HTMLElement} container - The container element
 * @param {string} folderId - The folder ID
 * @param {Object} allBookmarks - Reference to the bookmarks store
 * @param {Function} updateBookmarkOrder - Function to update bookmark order
 * @param {Function} filterBookmarks - Function to filter bookmarks in search mode
 * @param {Function} renderBookmarks - Function to render all bookmarks
 */
function handleEmptyFolderDrop(e, container, folderId, allBookmarks, updateBookmarkOrder, filterBookmarks, renderBookmarks) {
    e.preventDefault();
    e.stopPropagation();
    container.classList.remove('folder-drag-over');

    if (!dragOperation.dragging) return;

    // Get dragged bookmark ID
    const draggedId = e.dataTransfer.getData('text/plain');
    const draggedBookmark = allBookmarks[draggedId];

    if (!draggedBookmark) return;

    // Move the bookmark to this folder
    chrome.bookmarks.move(draggedId, {
        parentId: folderId,
        index: 0,  // Add to beginning of folder
    }, () => {
        if (chrome.runtime.lastError) {
            console.error('Error moving bookmark:', chrome.runtime.lastError);
            resetDragState();
            return;
        }

        // Update our local data structure
        updateBookmarkOrder(draggedId, folderId, 0, allBookmarks);

        // Re-render bookmarks
        const searchBox = document.getElementById('searchBox');
        if (searchBox.value.trim()) {
            filterBookmarks(searchBox.value);
        } else {
            renderBookmarks();
        }
    });

    resetDragState();
}

/**
 * Updates bookmark order after a move operation
 * @param {string} bookmarkId - ID of the bookmark being moved
 * @param {string} newParentId - ID of the new parent folder
 * @param {number} newIndex - New index position
 * @param {Object} allBookmarks - Reference to the bookmarks store
 */
function updateBookmarkOrder(bookmarkId, newParentId, newIndex, allBookmarks) {
    // Get the bookmark
    const bookmark = allBookmarks[bookmarkId];
    if (!bookmark) return;

    // Remove from old parent's children array
    const oldParentId = bookmark.parentId;
    const oldParent = allBookmarks[oldParentId];

    if (oldParent && oldParent.children) {
        oldParent.children = oldParent.children.filter(id => id !== bookmarkId);
    }

    // Add to new parent's children array at the new index
    const newParent = allBookmarks[newParentId];
    if (newParent && newParent.children) {
        // Remove first if it's already there (shouldn't happen but just in case)
        newParent.children = newParent.children.filter(id => id !== bookmarkId);

        // Insert at new position
        newParent.children.splice(newIndex, 0, bookmarkId);
    }

    // Update bookmark's parent
    bookmark.parentId = newParentId;
}

/**
 * Resets the drag state
 */
function resetDragState() {
    // Reset drag operation state
    if (dragOperation.draggedElement) {
        dragOperation.draggedElement.classList.remove('dragging');
    }

    dragOperation.dragging = false;
    dragOperation.draggedElement = null;
    dragOperation.sourceFolderId = null;
    dragOperation.originalIndex = -1;
}

/**
 * Adds a dragover event handler to an empty folder
 * @param {HTMLElement} container - The container element
 */
function addEmptyFolderDragoverHandler(container) {
    container.addEventListener('dragover', (e) => {
        e.preventDefault();
        container.classList.add('folder-drag-over');
    });

    container.addEventListener('dragleave', () => {
        container.classList.remove('folder-drag-over');
    });
}

/**
 * Sets up the global drag end handler
 */
function setupGlobalDragEndHandler() {
    document.addEventListener('dragend', () => {
        // Reset drag state
        resetDragState();

        // Remove any lingering drag-related classes from all bookmark items
        document.querySelectorAll('.bookmark-item').forEach(item => {
            item.classList.remove('drag-over', 'drop-before', 'drop-after', 'dragging');
        });
    });
}

// Export all drag-related functions
export {
    dragOperation,
    handleDragStart,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleEmptyFolderDrop,
    updateBookmarkOrder,
    resetDragState,
    addEmptyFolderDragoverHandler,
    setupGlobalDragEndHandler,
}; 