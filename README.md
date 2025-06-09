# Chrome Bookmark New Tab Extension

一个Chrome书签扩展，用界面替换新标签页，展示您的书签。使用 **React**、**TypeScript** 和 **Tailwind CSS** 构建。

## ✨ 特性

- 🎨 **UI界面** - 渐变背景与毛玻璃效果
- 🔍 **搜索功能** - 实时书签搜索与高亮显示
- 📁 **文件夹整理** - 自动文件夹整理与颜色编码
- 🤖 **AI分析** - 使用AI分析书签内容，提供分类和推荐
- ⚙️ **可定制** - 可调节列大小和显示选项
- 🗑️ **书签管理** - 带确认的书签删除功能
- 📱 **响应式** - 适配所有屏幕尺寸
- ⚡ **性能** - 使用React构建

## 🤖 AI功能

- **分类**: 将书签按工作、学习、娱乐、工具、其他进行分类
- **内容分析**: 分析书签的相关性、实用性和重要性评分
- **推荐**: 基于分析结果提供相关书签推荐
- **批量处理**: 支持批量分析多个书签
- **多维度评估**: 从多个维度评估书签价值

## 🛠️ 技术栈

- **React 18** - React与hooks及函数组件
- **TypeScript** - 类型安全开发
- **Tailwind CSS** - CSS框架
- **Webpack** - 模块打包和构建工具
- **Lucide React** - 图标库
- **Chrome Extension APIs** - 书签和存储集成
- **@dnd-kit** - 拖拽功能支持

## 🚀 开发

### 前置要求

- Node.js 16+ 
- npm 或 yarn
- Chrome 浏览器

### 设置

1. **克隆仓库**
   ```bash
   git clone <repository-url>
   cd chrome-bookmark-new-tab
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **开发模式** (带热重载)
   ```bash
   npm run dev
   ```

4. **生产构建**
   ```bash
   npm run build
   ```

### 加载扩展

1. 构建扩展: `npm run build`
2. 打开Chrome，访问 `chrome://extensions/`
3. 在右上角启用"开发者模式"
4. 点击"加载已解压的扩展程序"，选择此项目文件夹
5. 打开新标签页查看扩展效果


## 🧪 测试

项目包含基于Jest和Puppeteer的测试套件:

```bash
# 运行所有测试
npm test

# 监听模式运行测试
npm run test:watch

# 调试模式运行测试
npm run test:debug
```

## ⚙️ 配置

### 设置面板

通过点击右上角的齿轮图标访问设置:

- **每列最大条目数**: 控制每列显示的书签数量 (5-100)
- **AI配置**: 配置AI分析服务的参数
- **显示选项**: 自定义书签显示样式

### AI配置

在设置面板中配置AI功能:
- API端点URL
- API密钥
- 模型选择
- 分析参数

### 存储

设置自动保存到Chrome本地存储，在浏览器会话间持久化。

## 🎨 自定义

### Tailwind CSS

扩展使用Tailwind CSS进行样式设置，您可以自定义:

- `tailwind.config.js` 中的颜色
- 动画和过渡效果
- 各个组件的样式

### 文件夹颜色

文件夹颜色从 `src/utils/bookmark-helpers.ts` 中的预定义调色板自动分配。

## 📦 构建过程

构建过程使用Webpack:

1. 将TypeScript编译为JavaScript
2. 处理Tailwind CSS
3. 打包React组件
4. 在 `dist/` 目录生成生产文件

## 🔧 使用的Chrome扩展API

- **chrome.bookmarks** - 读取和管理书签
- **chrome.storage** - 保存用户设置
- **chrome.tabs** - 新标签页覆盖

## 🚀 性能

- **包大小**: ~182KB (压缩后)
- **加载时间**: < 100ms
- **内存使用**: React应用足迹
- **搜索**: 实时搜索带防抖处理
- **AI分析**: 异步处理，不阻塞UI

## 🤝 贡献

1. Fork仓库
2. 创建功能分支: `git checkout -b feature/amazing-feature`
3. 提交更改: `git commit -m 'Add amazing feature'`
4. 推送到分支: `git push origin feature/amazing-feature`
5. 开启Pull Request

## 📄 许可证

MIT许可证 - 详见LICENSE文件

## 🧠 开发原则

- **简洁性**: 保持UI简单，避免冗余功能
- **可读性**: 源代码以可读性为首要考虑
- **性能**: 用户体验响应速度
- **可维护性**: 清晰的代码结构和类型安全
