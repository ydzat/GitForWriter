# Contributing to GitForWriter

感谢你对 GitForWriter 项目的关注！我们欢迎各种形式的贡献。

## 贡献方式

### 报告 Bug

如果你发现了 bug，请[创建一个 Issue](https://github.com/ydzat/GitForWriter/issues/new)，并包含：

- 清晰的标题和描述
- 重现步骤
- 预期行为和实际行为
- VSCode 版本、操作系统等环境信息
- 如果可能，附上截图或错误日志

### 提出新功能

我们欢迎功能建议！请创建一个 Issue，描述：

- 功能的用途和场景
- 期望的行为
- 如果有的话，提供设计草图或示例

### 提交代码

#### 开发环境设置

```bash
# Fork 并克隆仓库
git clone https://github.com/YOUR_USERNAME/GitForWriter.git
cd GitForWriter

# 安装依赖
npm install

# 编译 TypeScript
npm run compile

# 运行 linter
npm run lint

# 开始开发
code .
```

在 VSCode 中按 `F5` 启动扩展开发主机进行调试。

#### 代码规范

- 使用 TypeScript
- 遵循项目的 ESLint 规则
- 使用有意义的变量和函数名
- 添加必要的注释，特别是复杂逻辑
- 保持代码整洁和模块化

#### 提交流程

1. **创建分支**
   ```bash
   git checkout -b feature/your-feature-name
   # 或
   git checkout -b fix/your-bug-fix
   ```

2. **编写代码**
   - 遵循代码规范
   - 确保代码可以编译：`npm run compile`
   - 运行 linter：`npm run lint`
   - 测试你的更改

3. **提交更改**
   ```bash
   git add .
   git commit -m "描述你的更改"
   ```

   提交信息格式：
   - `feat: 添加新功能`
   - `fix: 修复 bug`
   - `docs: 更新文档`
   - `style: 代码格式调整`
   - `refactor: 重构代码`
   - `test: 添加测试`
   - `chore: 构建/工具相关`

4. **推送并创建 Pull Request**
   ```bash
   git push origin feature/your-feature-name
   ```
   
   然后在 GitHub 上创建 Pull Request。

#### Pull Request 指南

你的 PR 应该：

- 清晰描述更改的内容和原因
- 引用相关的 Issue（如果有）
- 通过所有 CI 检查（编译、linter）
- 保持较小的更改范围（一个 PR 专注于一个功能/修复）
- 更新相关文档

### 改进文档

文档改进同样重要！你可以：

- 修正拼写或语法错误
- 改进说明的清晰度
- 添加示例或用例
- 翻译文档到其他语言

文档文件：
- `README.md` - 主要文档
- `EXAMPLE.md` - 使用示例
- `INSTALL.md` - 安装指南
- `ai/*/README.md` - AI 模块文档

## 项目结构

```
GitForWriter/
├── src/
│   ├── extension.ts          # 扩展入口点
│   ├── ai/
│   │   ├── diff/             # Diff 分析模块
│   │   ├── review/           # 审校引擎
│   │   └── export/           # 导出管理
│   ├── utils/                # 工具类
│   └── webview/              # WebView UI
├── ai/                       # 用户扩展目录（模板）
├── package.json              # 扩展配置
├── tsconfig.json             # TypeScript 配置
└── .eslintrc.json           # ESLint 配置
```

## 开发建议

### 添加新的 AI 功能

如果你想添加新的 AI 分析功能：

1. 在 `src/ai/` 下创建新的目录
2. 实现你的分析逻辑
3. 在 `extension.ts` 中集成
4. 在 `ai/` 目录下添加相应的 README
5. 更新主 README

### 改进 UI

WebView 相关代码在 `src/webview/aiReviewPanel.ts`：

- 使用 VSCode 的主题变量（`var(--vscode-*)`）
- 保持响应式设计
- 支持中英文界面

### 测试

目前项目还没有自动化测试。如果你想贡献测试：

1. 创建 `test/` 目录
2. 使用 VSCode 的测试框架
3. 更新 `package.json` 添加测试脚本

## 代码审查

所有 PR 都会经过审查。审查者会关注：

- 代码质量和可维护性
- 是否符合项目目标
- 性能影响
- 用户体验
- 文档完整性

## 社区准则

- 尊重他人
- 接受建设性批评
- 专注于对项目最有利的方面
- 对新贡献者友好

## 许可证

通过贡献代码，你同意你的贡献将使用与项目相同的 MIT 许可证。

## 问题？

如有疑问，请：
- 在 Issue 中提问
- 查看现有的 Issues 和 PRs
- 阅读项目文档

感谢你的贡献！🙏
