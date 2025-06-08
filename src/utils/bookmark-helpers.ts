import { Bookmark, BookmarkTreeNode, FolderColumn } from '@/types/bookmark';

// Color palette for folders
const COLOR_PALETTE = [
    'rgba(255, 179, 186, 0.15)', // Pink
    'rgba(255, 223, 186, 0.15)', // Peach
    'rgba(255, 255, 186, 0.15)', // Light Yellow
    'rgba(186, 255, 201, 0.15)', // Light Green
    'rgba(186, 225, 255, 0.15)', // Light Blue
    'rgba(186, 200, 255, 0.15)', // Lavender
    'rgba(228, 186, 255, 0.15)', // Light Purple
    'rgba(255, 186, 255, 0.15)', // Light Magenta
    'rgba(200, 255, 248, 0.15)', // Mint
    'rgba(255, 213, 145, 0.15)', // Light Orange
    'rgba(173, 216, 230, 0.15)', // Light Sky Blue
    'rgba(144, 238, 144, 0.15)',  // Light Green
];

let folderColorMap: Record<string, string> = {};
let colorIndex = 0;

/**
 * Get a color for a folder ID
 */
export function getFolderColor(folderId: string): string {
    if (!folderColorMap[folderId]) {
        folderColorMap[folderId] = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
        colorIndex++;
    }
    return folderColorMap[folderId];
}

/**
 * Reset folder colors
 */
export function resetFolderColors(): void {
    folderColorMap = {};
    colorIndex = 0;
}

/**
 * Convert bookmark tree nodes to flat bookmark objects
 */
export function collectAllBookmarks(nodes: BookmarkTreeNode[]): Record<string, Bookmark> {
    const allBookmarks: Record<string, Bookmark> = {};

    function traverse(nodes: BookmarkTreeNode[]) {
        nodes.forEach(node => {
            if (node.children) {
                // This is a folder
                allBookmarks[node.id] = {
                    id: node.id,
                    title: node.title,
                    parentId: node.parentId || '',
                    isFolder: true,
                    children: node.children.map(child => child.id),
                    dateAdded: node.dateAdded,
                    index: node.index,
                };
                traverse(node.children);
            } else if (node.url) {
                // This is a bookmark
                allBookmarks[node.id] = {
                    id: node.id,
                    title: node.title || node.url,
                    url: node.url,
                    parentId: node.parentId || '',
                    isFolder: false,
                    dateAdded: node.dateAdded,
                    index: node.index,
                };
            }
        });
    }

    traverse(nodes);
    return allBookmarks;
}

/**
 * Get all folders and direct bookmarks (including nested folders) in correct order
 */
export function getOrderedTopLevelFolders(
    bookmarkTreeNodes: BookmarkTreeNode[],
    allBookmarks: Record<string, Bookmark>
): { folders: Bookmark[]; directBookmarks: Bookmark[] } {
    const allFolders: Bookmark[] = [];
    const directBookmarks: Bookmark[] = [];

    // Recursively collect all folders and direct bookmarks in order
    function collectFoldersAndBookmarks(parentFolder: Bookmark, isTopLevel: boolean = false) {
        if (!parentFolder.children) return;

        // Use the children array to maintain order, then sort by index as fallback
        const orderedChildren = parentFolder.children
            .map(childId => allBookmarks[childId])
            .filter(Boolean)
            .sort((a, b) => (a.index || 0) - (b.index || 0));

        orderedChildren.forEach(item => {
            if (item.isFolder) {
                allFolders.push(item);
                // Recursively collect folders from this folder
                collectFoldersAndBookmarks(item);
            } else if (isTopLevel) {
                directBookmarks.push(item);
            }
        });
    }

    // Find Bookmarks Bar and Other Bookmarks in the tree
    bookmarkTreeNodes.forEach(rootNode => {
        if (rootNode.children) {
            rootNode.children.forEach(node => {
                if (node.id === '1' || node.id === '2') { // Bookmarks Bar or Other Bookmarks
                    const rootFolder = allBookmarks[node.id];
                    if (rootFolder) {
                        // Collect direct bookmarks and folders from top level
                        collectFoldersAndBookmarks(rootFolder, true);
                    }
                }
            });
        }
    });

    return { folders: allFolders, directBookmarks };
}

/**
 * Count total items in a folder (recursive)
 */
export function countItemsInFolder(folder: Bookmark, allBookmarks: Record<string, Bookmark>): number {
    if (!folder.children) return 0;

    let count = 0;
    folder.children.forEach(childId => {
        const item = allBookmarks[childId];
        if (!item) return;

        if (item.isFolder) {
            count += countItemsInFolder(item, allBookmarks);
        } else {
            count++;
        }
    });

    return count;
}

/**
 * Split array into chunks
 */
export function chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
        chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
}

/**
 * Get folder path for a bookmark
 */
export function getBookmarkFolderPath(
    bookmark: Bookmark,
    allBookmarks: Record<string, Bookmark>
): string {
    const path: string[] = [];
    let current = allBookmarks[bookmark.parentId];

    while (current && current.id !== '0') {
        if (current.id !== '1' && current.id !== '2') { // Skip root folders
            path.unshift(current.title);
        }
        current = allBookmarks[current.parentId];
    }

    return path.join(' > ');
}

/**
 * Get folder path for a folder itself
 */
export function getFolderPath(
    folder: Bookmark,
    allBookmarks: Record<string, Bookmark>
): string {
    const path: string[] = [];
    let current = allBookmarks[folder.parentId];

    while (current && current.id !== '0') {
        if (current.id !== '1' && current.id !== '2') { // Skip root folders
            path.unshift(current.title);
        }
        current = allBookmarks[current.parentId];
    }

    return path.length > 0 ? path.join(' > ') : '';
}

/**
 * Highlight search term in text
 */
export function highlightSearchTerm(text: string, searchTerm: string): string {
    if (!searchTerm) return text;

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return text.replace(regex, '<mark class="bg-yellow-200 text-gray-900">$1</mark>');
} 