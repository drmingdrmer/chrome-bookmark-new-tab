# Chrome Bookmark Extension Makefile
# 
# 常用命令:
#   make install     - 安装依赖
#   make dev         - 开发模式（带监听）
#   make build       - 生产构建
#   make test        - 运行测试
#   make clean       - 清理构建文件
#   make package     - 打包扩展
#   make help        - 显示帮助信息

.PHONY: help install dev build test test-watch test-debug clean package lint check reload

# 默认目标
.DEFAULT_GOAL := help

# 项目配置
DIST_DIR := dist
PACKAGE_NAME := bookmark-extension-v$(shell node -p "require('./package.json').version")
PACKAGE_FILE := $(PACKAGE_NAME).zip

# 帮助信息
help: ## 显示此帮助信息
	@echo "Chrome Bookmark Extension - 可用命令:"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | \
		awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-15s\033[0m %s\n", $$1, $$2}'
	@echo ""

# 依赖管理
install: ## 安装项目依赖
	@echo "📦 安装依赖..."
	npm install

# 开发命令
dev: ## 启动开发模式（带文件监听）
	@echo "🚀 启动开发模式..."
	npm run dev

build: ## 构建生产版本
	@echo "🔨 构建生产版本..."
	npm run build
	@echo "✅ 构建完成: $(DIST_DIR)/"

# 测试命令
test: ## 运行所有测试
	@echo "🧪 运行测试..."
	npm test

test-watch: ## 监听模式运行测试
	@echo "👀 监听模式运行测试..."
	npm run test:watch

test-debug: ## 调试模式运行测试
	@echo "🐛 调试模式运行测试..."
	npm run test:debug

# 代码检查
lint: ## 运行ESLint检查代码
	@echo "📋 检查代码..."
	npx eslint src/ --ext .ts,.tsx

lint-fix: ## 运行ESLint并自动修复
	@echo "🔧 检查并修复代码..."
	npx eslint src/ --ext .ts,.tsx --fix

# 清理和维护
clean: ## 清理构建文件和依赖
	@echo "🧹 清理文件..."
	rm -rf $(DIST_DIR)
	rm -rf node_modules
	rm -f $(PACKAGE_NAME).zip
	@echo "✅ 清理完成"

clean-dist: ## 仅清理构建文件
	@echo "🧹 清理构建文件..."
	rm -rf $(DIST_DIR)
	@echo "✅ 构建文件已清理"

# 打包扩展
package: build ## 构建并打包扩展为zip文件
	@echo "📦 打包扩展..."
	@if [ ! -d "$(DIST_DIR)" ]; then \
		echo "❌ 构建目录不存在，请先运行 make build"; \
		exit 1; \
	fi
	@# 创建临时目录
	@mkdir -p temp_package
	@# 复制必要文件
	@cp manifest.json temp_package/
	@cp -r $(DIST_DIR)/* temp_package/
	@cp -r icons temp_package/ 2>/dev/null || true
	@# 创建zip包
	@cd temp_package && zip -r ../$(PACKAGE_FILE) . -x "*.map" "*.LICENSE.txt"
	@# 清理临时目录
	@rm -rf temp_package
	@echo "✅ 扩展已打包: $(PACKAGE_FILE)"

# 快速命令组合
setup: install ## 初始设置（安装依赖）
	@echo "🎯 项目设置完成"

check: lint test ## 运行代码检查和测试
	@echo "✅ 检查完成"

rebuild: clean-dist build ## 清理并重新构建
	@echo "🔄 重新构建完成"

# 开发工具
watch-files: ## 监听文件变化（仅显示变化，不构建）
	@echo "👀 监听文件变化..."
	@echo "按 Ctrl+C 停止监听"
	@while true; do \
		find src -name "*.ts" -o -name "*.tsx" -o -name "*.css" | \
		xargs ls -la --time-style=+%H:%M:%S | \
		awk '{print $$6 " " $$7}' | \
		sort -u; \
		sleep 2; \
		clear; \
	done

size: ## 显示构建文件大小
	@echo "📊 构建文件大小:"
	@if [ -d "$(DIST_DIR)" ]; then \
		ls -lh $(DIST_DIR)/ | grep -v "^d" | awk '{print "  " $$9 ": " $$5}'; \
		echo ""; \
		echo "总大小: $$(du -sh $(DIST_DIR) | cut -f1)"; \
	else \
		echo "❌ 构建目录不存在，请先运行 make build"; \
	fi

# Chrome扩展相关
install-chrome: package ## 构建、打包，并提示如何在Chrome中安装
	@echo ""
	@echo "🌐 Chrome扩展安装步骤:"
	@echo "  1. 打开 Chrome，访问 chrome://extensions/"
	@echo "  2. 启用右上角的 '开发者模式'"
	@echo "  3. 点击 '加载已解压的扩展程序'"
	@echo "  4. 选择项目根目录（包含manifest.json的目录）"
	@echo "  5. 或者拖拽 $(PACKAGE_FILE) 到扩展页面"
	@echo ""

# 项目信息
info: ## 显示项目信息
	@echo "📋 项目信息:"
	@echo "  名称: $$(node -p "require('./package.json').name")"
	@echo "  版本: $$(node -p "require('./package.json').version")"
	@echo "  描述: $$(node -p "require('./package.json').description")"
	@echo "  Node.js: $$(node --version)"
	@echo "  npm: $$(npm --version)"
	@if [ -d "$(DIST_DIR)" ]; then \
		echo "  构建状态: ✅ 已构建"; \
	else \
		echo "  构建状态: ❌ 未构建"; \
	fi 