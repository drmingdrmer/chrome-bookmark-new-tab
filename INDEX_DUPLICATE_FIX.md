# 修复重复Index问题

## 问题发现

用户在启用调试信息后发现拖拽后出现了两个书签都显示`Index: 11`的情况，这说明我们的乐观更新逻辑有bug。

## 问题根因

### 之前的错误逻辑

乐观更新时我们只是：
1. 更新被移动书签的index
2. 更新文件夹的children数组
3. **但没有重新计算同一文件夹中其他书签的index**

```typescript
// ❌ 错误的逻辑
filteredChildren.splice(expectedIndex, 0, bookmarkId);

updated[newParentId] = {
    ...updated[newParentId],
    children: filteredChildren
};
// 缺少：重新计算其他书签的index!
```

### 问题场景举例

假设文件夹中有书签：
```
[A(index:0), B(index:1), C(index:2), D(index:3)]
```

当我们将书签E移动到index:2位置时：
1. 插入E到位置2：`[A, B, E, C, D]`
2. E的index设为2 ✅
3. **但C和D的index还是2和3** ❌
4. 结果：E(index:2) 和 C(index:2) 重复！

## 修复方案

### 完整的index重新计算

```typescript
// ✅ 正确的逻辑
filteredChildren.splice(expectedIndex, 0, bookmarkId);

updated[newParentId] = {
    ...updated[newParentId],
    children: filteredChildren
};

// 重新计算该文件夹中所有书签的index
filteredChildren.forEach((childId, index) => {
    if (updated[childId] && !updated[childId].isFolder) {
        updated[childId] = {
            ...updated[childId],
            index: index  // 使用数组位置作为新的index
        };
    }
});
```

### 跨文件夹移动的处理

同时也要更新旧文件夹中剩余书签的index：

```typescript
// 旧文件夹：重新计算剩余书签的index
remainingChildren.forEach((childId, index) => {
    if (updated[childId] && !updated[childId].isFolder) {
        updated[childId] = {
            ...updated[childId],
            index: index
        };
    }
});
```

## 修复效果

现在拖拽后：
1. **被移动的书签**：index正确更新
2. **目标文件夹中的其他书签**：index按顺序重新计算
3. **源文件夹中的剩余书签**：index按顺序重新计算
4. **不再有重复index**：每个书签都有唯一的正确index

## 测试方法

使用调试模式可以验证：
1. 拖拽前记录所有书签的index
2. 拖拽后检查是否有重复index
3. 确认index值是连续的（0, 1, 2, 3...）

现在刷新浏览器测试，应该不会再看到重复的index值了！🎯 