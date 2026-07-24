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
 * Convert bookmark tree nodes to flat bookmark objects (optimized iterative version)
 */
export function collectAllBookmarks(nodes: BookmarkTreeNode[]): Record<string, Bookmark> {
    const allBookmarks: Record<string, Bookmark> = {};
    const stack = [...nodes];

    while (stack.length > 0) {
        const node = stack.pop()!;
        
        if (node.children) {
            // This is a folder
            const childIds = new Array(node.children.length);
            for (let i = 0; i < node.children.length; i++) {
                childIds[i] = node.children[i].id;
            }
            
            allBookmarks[node.id] = {
                id: node.id,
                title: node.title,
                parentId: node.parentId || '',
                isFolder: true,
                children: childIds,
                dateAdded: node.dateAdded,
                index: node.index,
            };
            
            // Add children to stack for processing
            for (let i = node.children.length - 1; i >= 0; i--) {
                stack.push(node.children[i]);
            }
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
    }

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

export interface TextSegment {
    text: string;
    isMatch: boolean;
}

/**
 * Split text into plain and search-term-matching segments
 */
export function splitBySearchTerm(text: string, searchTerm: string): TextSegment[] {
    if (!searchTerm) return [{ text, isMatch: false }];

    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');

    // A single capture group makes split() interleave separators, so every
    // odd index is a match.
    return text
        .split(regex)
        .map((part, index) => ({ text: part, isMatch: index % 2 === 1 }))
        .filter(segment => segment.text !== '');
} 