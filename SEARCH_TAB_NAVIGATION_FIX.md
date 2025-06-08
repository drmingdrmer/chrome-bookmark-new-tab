# 修复搜索模式下的Tab导航问题

## 问题描述

用户报告在搜索框输入文字后，需要按**两次Tab键**才能聚焦到第一个搜索结果项目，中间似乎有个隐藏的可聚焦元素。

## 问题根因

### 之前的问题
BookmarkItem组件中包含两个可聚焦元素：
1. **拖拽手柄** - 使用了`{...attributes} {...listeners}`，在搜索模式下不可见但仍可聚焦
2. **书签链接** - 实际的书签链接元素

### Tab导航序列
```
搜索框 → Tab → [隐藏的拖拽手柄] → Tab → 书签链接
         ↑                            ↑
      第一次Tab                    第二次Tab
```

用户期望的导航序列应该是：
```
搜索框 → Tab → 书签链接
```

## 解决方案

### 1. 检测搜索模式
```typescript
// 搜索模式下禁用拖拽功能
const isSearchMode = !!searchTerm;
```

### 2. 禁用搜索模式下的拖拽
```typescript
const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
} = useSortable({ 
    id: bookmark.id,
    disabled: isSearchMode  // 🔧 关键修复：搜索模式下禁用拖拽
});
```

### 3. 隐藏搜索模式下的拖拽手柄
```typescript
{/* Drag Handle - 只在非搜索模式下显示 */}
{!isSearchMode && (
    <div
        {...attributes}
        {...listeners}
        className="drag-handle opacity-0 group-hover:opacity-50 hover:opacity-100 transition-opacity duration-200 mt-0.5 cursor-grab active:cursor-grabbing"
    >
        <GripVertical className="w-3 h-3 text-gray-400" />
    </div>
)}
```

### 4. 调整搜索模式下的布局
```typescript
className={`group relative flex items-start ${isSearchMode ? 'space-x-0' : 'space-x-1'} p-1 rounded-lg...`}
```

## 修复效果

### 之前的Tab导航
```
搜索框 → Tab(1) → [隐藏手柄] → Tab(2) → 书签链接
```

### 修复后的Tab导航  
```
搜索框 → Tab(1) → 书签链接 ✅
```

## 设计逻辑

1. **功能分离**：搜索结果不需要拖拽功能
2. **清理焦点**：移除不必要的可聚焦元素
3. **改善UX**：一次Tab键直达目标
4. **保持一致**：正常模式下拖拽功能不受影响

## 额外优化

- **视觉干净**：搜索模式下没有多余的拖拽手柄空间
- **键盘友好**：符合用户的键盘导航预期
- **功能专注**：搜索模式专注于查找和访问，不支持拖拽

现在用户在搜索模式下只需要一次Tab键就能直接聚焦到搜索结果！🎯 