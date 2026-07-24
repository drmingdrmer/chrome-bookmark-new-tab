import {
    BOOKMARKS_BAR_ID,
    MOBILE_BOOKMARKS_ID,
    OTHER_BOOKMARKS_ID,
    chunkArray,
    collectAllBookmarks,
    getBookmarkFolderPath,
    getFolderPath,
    getOrderedTopLevelFolders,
    splitBySearchTerm,
} from '@/utils/bookmark-helpers';
import { Bookmark, BookmarkTreeNode } from '@/types/bookmark';

function folder(id: string, title: string, parentId: string, index: number, children: BookmarkTreeNode[]): BookmarkTreeNode {
    return { id, title, parentId, index, children };
}

function link(id: string, title: string, parentId: string, index: number, url: string): BookmarkTreeNode {
    return { id, title, parentId, index, url };
}

// 模拟 Chrome 的书签树：根节点 '0' 下挂书签栏/其他书签/移动设备书签
function buildTree(): BookmarkTreeNode[] {
    return [
        folder('0', '', '', 0, [
            folder(BOOKMARKS_BAR_ID, 'Bookmarks Bar', '0', 0, [
                link('10', 'Direct One', BOOKMARKS_BAR_ID, 0, 'https://one.example'),
                folder('11', 'Work', BOOKMARKS_BAR_ID, 1, [
                    link('110', 'Docs', '11', 0, 'https://docs.example'),
                    folder('111', 'Deep', '11', 1, [
                        link('1110', 'Nested', '111', 0, 'https://nested.example'),
                    ]),
                ]),
            ]),
            folder(OTHER_BOOKMARKS_ID, 'Other Bookmarks', '0', 1, [
                link('20', 'Direct Two', OTHER_BOOKMARKS_ID, 0, 'https://two.example'),
            ]),
            folder(MOBILE_BOOKMARKS_ID, 'Mobile Bookmarks', '0', 2, [
                folder('30', 'Phone', MOBILE_BOOKMARKS_ID, 0, [
                    link('300', 'From Phone', '30', 0, 'https://phone.example'),
                ]),
            ]),
        ]),
    ];
}

describe('collectAllBookmarks', () => {
    it('flattens folders and links into one map keyed by id', () => {
        const result = collectAllBookmarks([
            folder(BOOKMARKS_BAR_ID, 'Bookmarks Bar', '0', 0, [
                link('10', 'One', BOOKMARKS_BAR_ID, 0, 'https://one.example'),
            ]),
        ]);

        expect(result).toEqual({
            [BOOKMARKS_BAR_ID]: {
                id: BOOKMARKS_BAR_ID,
                title: 'Bookmarks Bar',
                parentId: '0',
                isFolder: true,
                children: ['10'],
                dateAdded: undefined,
                index: 0,
            },
            '10': {
                id: '10',
                title: 'One',
                parentId: BOOKMARKS_BAR_ID,
                url: 'https://one.example',
                isFolder: false,
                dateAdded: undefined,
                index: 0,
            },
        });
    });

    it('falls back to the URL when a bookmark has no title', () => {
        const result = collectAllBookmarks([link('10', '', '1', 0, 'https://one.example')]);

        expect(result['10'].title).toBe('https://one.example');
    });
});

describe('getOrderedTopLevelFolders', () => {
    const tree = buildTree();
    const allBookmarks = collectAllBookmarks(tree);

    it('collects folders from all three roots, including nested ones', () => {
        const { folders } = getOrderedTopLevelFolders(tree, allBookmarks);

        expect(folders.map(f => f.id)).toEqual(['11', '111', '30']);
    });

    it('collects only loose bookmarks sitting directly under a root', () => {
        const { directBookmarks } = getOrderedTopLevelFolders(tree, allBookmarks);

        expect(directBookmarks.map(b => b.id)).toEqual(['10', '20']);
    });
});

describe('folder paths', () => {
    const allBookmarks = collectAllBookmarks(buildTree());

    it('omits root folders from a bookmark path', () => {
        expect(getBookmarkFolderPath(allBookmarks['1110'], allBookmarks)).toBe('Work > Deep');
    });

    it('is empty for a bookmark sitting directly under a root', () => {
        expect(getBookmarkFolderPath(allBookmarks['10'], allBookmarks)).toBe('');
    });

    it('omits the mobile root as well', () => {
        expect(getBookmarkFolderPath(allBookmarks['300'], allBookmarks)).toBe('Phone');
    });

    it('reports a folder own ancestry without the folder itself', () => {
        expect(getFolderPath(allBookmarks['111'], allBookmarks)).toBe('Work');
        expect(getFolderPath(allBookmarks['11'], allBookmarks)).toBe('');
    });
});

describe('chunkArray', () => {
    it('splits into chunks of the requested size, keeping the remainder', () => {
        expect(chunkArray([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    });

    it('returns no chunks for an empty array', () => {
        expect(chunkArray([], 3)).toEqual([]);
    });
});

describe('splitBySearchTerm', () => {
    it('returns the whole text as one non-matching segment without a term', () => {
        expect(splitBySearchTerm('Hello world', '')).toEqual([
            { text: 'Hello world', isMatch: false },
        ]);
    });

    it('marks each case-insensitive occurrence', () => {
        expect(splitBySearchTerm('Read the readme', 'read')).toEqual([
            { text: 'Read', isMatch: true },
            { text: ' the ', isMatch: false },
            { text: 'read', isMatch: true },
            { text: 'me', isMatch: false },
        ]);
    });

    it('drops the empty segment when the text starts with a match', () => {
        expect(splitBySearchTerm('abc', 'a')).toEqual([
            { text: 'a', isMatch: true },
            { text: 'bc', isMatch: false },
        ]);
    });

    it('treats regex metacharacters in the term literally', () => {
        expect(splitBySearchTerm('a.c and abc', '.')).toEqual([
            { text: 'a', isMatch: false },
            { text: '.', isMatch: true },
            { text: 'c and abc', isMatch: false },
        ]);
    });

    // 标题会作为文本渲染，分段结果不得包含任何被解释为标签的内容
    it('leaves markup in the text as literal characters', () => {
        expect(splitBySearchTerm('<img src=x onerror=alert(1)>', 'img')).toEqual([
            { text: '<', isMatch: false },
            { text: 'img', isMatch: true },
            { text: ' src=x onerror=alert(1)>', isMatch: false },
        ]);
    });
});
