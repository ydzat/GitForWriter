# GitForWriter 使用指南

欢迎使用 **GitForWriter**！这是一个将软件开发流程引入写作的 VSCode 插件。

本指南将手把手教你从零开始使用 GitForWriter，即使你完全不懂编程也没关系！

---

## � 第一步：安装必要软件

### 1.1 安装 VSCode

1. 访问 [VSCode 官网](https://code.visualstudio.com/)
2. 点击大大的 "Download" 按钮
3. 下载完成后，双击安装包
4. 一路点击"下一步"，使用默认设置即可
5. 安装完成后，打开 VSCode

### 1.2 安装 Git

1. 访问 [Git 官网](https://git-scm.com/)
2. 点击 "Download for Windows"（Mac 用户点击 "Download for Mac"）
3. 下载完成后，双击安装包
4. **重要**：安装过程中全部使用默认设置，一路点击"下一步"
5. 安装完成

### 1.3 安装 GitForWriter 插件

1. 打开 VSCode
2. 点击左侧边栏的"扩展"图标（四个小方块）
3. 在搜索框输入：`GitForWriter`
4. 找到 GitForWriter 插件，点击"安装"
5. 安装完成后会自动弹出欢迎页面

---

## 🔑 第二步：注册 GitHub 账号

### 2.1 注册 GitHub

1. 访问 [GitHub](https://github.com/)
2. 点击右上角 "Sign up"（注册）
3. 输入你的邮箱地址
4. 设置密码（建议使用密码管理器）
5. 设置用户名（这个用户名会公开显示）
6. 完成邮箱验证
7. 选择免费计划（Free）

### 2.2 配置本地 Git

1. 打开 VSCode
2. 按 `Ctrl + ~`（Mac 用户按 `Cmd + ~`）打开终端
3. 输入以下命令（替换成你自己的信息）：

```bash
git config --global user.name "你的GitHub用户名"
git config --global user.email "你的GitHub邮箱"
```

例如：
```bash
git config --global user.name "zhangsan"
git config --global user.email "zhangsan@example.com"
```

---

## 🤖 第三步：配置 AI（推荐使用 DeepSeek）

### 3.1 注册 DeepSeek

1. 访问 [DeepSeek 平台](https://platform.deepseek.com/sign_in)
2. 点击"注册"或使用微信/GitHub 登录
3. 完成注册后登录

### 3.2 充值和获取 API Key

1. 登录后，点击"充值"
2. 充值 5-10 元即可（DeepSeek 很便宜，10 元能用很久）
3. 充值完成后，点击左侧菜单的 "API Keys"
4. 点击"创建新的 API Key"
5. 给 API Key 起个名字，比如 "GitForWriter"
6. 点击"创建"
7. **重要**：复制生成的 API Key（只会显示一次！），保存到记事本

### 3.3 在 GitForWriter 中配置

1. 在 VSCode 中，按 `Ctrl + Shift + P`（Mac 用户按 `Cmd + Shift + P`）
2. 输入 `GitForWriter: Configure AI Provider`，回车
3. 选择 `OpenAI Compatible`
4. 按照提示输入：
   - **API Key**: 粘贴刚才复制的 DeepSeek API Key
   - **Base URL**: `https://api.deepseek.com/v1`
   - **Model**: `deepseek-chat`
5. 配置完成！

---

## 📝 第四步：创建你的第一个写作项目

### 4.1 创建 GitHub 仓库

1. 访问 [GitHub](https://github.com/)，登录
2. 点击右上角的 "+" → "New repository"
3. 填写信息：
   - **Repository name**: 给你的项目起个名字，比如 `my-novel`
   - **Description**: 简单描述，比如"我的小说"
   - **Public/Private**: 选择 Private（私有，只有你能看到）
   - **勾选** "Add a README file"
4. 点击 "Create repository"
5. 创建完成后，点击绿色的 "Code" 按钮
6. 复制 HTTPS 链接（类似 `https://github.com/你的用户名/my-novel.git`）

### 4.2 克隆仓库到本地

1. 在 VSCode 中，按 `Ctrl + Shift + P`
2. 输入 `Git: Clone`，回车
3. 粘贴刚才复制的仓库链接
4. 选择一个文件夹保存（建议在"文档"文件夹下创建一个"写作项目"文件夹）
5. 克隆完成后，点击"打开"

### 4.3 初始化 GitForWriter

1. 按 `Ctrl + Shift + P`
2. 输入 `GitForWriter: Start Writing Project`，回车
3. 按照提示完成初始化
4. 完成！现在你可以开始写作了

---

## ✍️ 第五步：开始写作

### 5.1 创建文档

1. 在左侧文件浏览器中，右键点击空白处
2. 选择"新建文件"
3. 输入文件名，比如 `第一章.md`（必须以 `.md` 结尾）
4. 开始写作！

### 5.2 保存和提交

写完一段内容后：

1. 按 `Ctrl + S` 保存文件
2. 按 `Ctrl + Shift + P`
3. 输入 `GitForWriter: Commit Changes`
4. 输入提交信息，比如"完成第一章开头"
5. 提交完成！

### 5.3 使用 AI 审校

1. 选中你想审校的文字
2. 按 `Ctrl + Shift + P`
3. 输入 `GitForWriter: AI Review`
4. 等待几秒，AI 会给出修改建议
5. 查看建议，手动修改你的文字

---

## 🎉 完成！

现在你已经学会了 GitForWriter 的基本使用！

### 常用快捷键

- `Ctrl + S`: 保存文件
- `Ctrl + Shift + P`: 打开命令面板
- `Ctrl + ~`: 打开/关闭终端

### 需要帮助？

- 查看 [完整文档](https://github.com/ydzat/GitForWriter/blob/main/README.md)
- 在 [GitHub Issues](https://github.com/ydzat/GitForWriter/issues) 提问

