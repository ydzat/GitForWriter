# 示例：使用 GitForWriter 进行小说创作

这是一个演示如何使用 GitForWriter 进行文学创作的示例项目。

## 开始创作

### 1. 初始化项目
打开命令面板（Ctrl+Shift+P 或 Cmd+Shift+P），输入：
```
GitForWriter: Start Writing Project
```

### 2. 创建第一章

创建文件 `chapter1.md`：

```markdown
# 第一章：相遇

秋天的午后，阳光透过窗户洒在书桌上。

李明坐在咖啡馆的角落里，面前摆着一杯已经凉透的拿铁。他盯着笔记本电脑的屏幕，手指在键盘上悬停了很久，却一个字也打不出来。

"写作障碍？"一个声音突然在耳边响起。

他抬起头，看到一位穿着米色风衣的女孩正站在桌边，脸上带着友善的微笑。
```

### 3. 保存并检查自动分析

保存文件后，GitForWriter 会自动：
- 检测 Git diff
- 保存到 `.gitforwriter/diffs/` 目录
- 生成快速语义分析

### 4. 继续修改

在 `chapter1.md` 中添加更多内容：

```markdown
"我……是的。"李明有些尴尬地笑了笑。

"我也是作家。"女孩拉开对面的椅子坐下，"我叫林小雨。有时候，出去走走会有帮助。"

李明点点头。他们开始聊起写作、生活，还有那些永远写不完的故事。

窗外的梧桐叶一片片飘落，在空中划出优美的弧线。
```

### 5. 执行 AI 审校

打开命令面板，运行：
```
GitForWriter: AI Review
```

你会看到：
- 📊 总体评分和评价
- ✨ 文本的优点
- 📋 需要改进的地方
- 💡 具体的修改建议

### 6. 采纳建议

在审校面板中，你可以：
- 查看每条建议的详细说明
- 点击"采纳建议"应用单个修改
- 点击"一键采纳所有建议"应用所有修改

### 7. 导出作品

完成写作后，运行：
```
GitForWriter: Export Draft
```

选择导出格式：
- `markdown` - 用于发布到博客
- `latex` - 用于出版或学术用途
- `pdf` - 用于打印或分享

## 项目结构示例

```
my-novel/
├── .gitforwriter/
│   ├── diffs/
│   │   ├── chapter1.md_2024-01-01T10-00-00.diff
│   │   └── chapter1.md_2024-01-01T10-00-00.json
│   └── reviews/
├── ai/
│   ├── diff/
│   ├── review/
│   └── export/
├── exports/
│   └── chapter1_2024-01-01.md
├── chapter1.md
├── chapter2.md
└── README.md
```

## 写作流程

1. **构思阶段** 💡
   - 创建大纲
   - 设定角色
   - 规划情节

2. **撰写阶段** ✍️
   - 自由创作
   - 自动保存和版本管理
   - 实时 diff 记录

3. **审校阶段** 🔍
   - 运行 AI 审校
   - 查看改进建议
   - 采纳和调整

4. **发布阶段** 🚀
   - 导出为合适的格式
   - 发布到目标平台
   - 保留完整的创作历史

## 技巧

### 查看修改历史
使用 Git 命令查看完整历史：
```bash
git log --oneline chapter1.md
git diff HEAD~1 chapter1.md
```

### 回退到之前的版本
```bash
git checkout HEAD~1 chapter1.md
```

### 创建新的情节分支
```bash
git checkout -b alternative-ending
```

### 对比不同版本
```bash
git diff main alternative-ending -- chapter1.md
```

## 最佳实践

1. **频繁保存**：让 GitForWriter 自动记录每次修改
2. **定期审校**：每完成一个章节或段落就进行审校
3. **保留历史**：不要删除 `.gitforwriter` 目录
4. **使用分支**：尝试不同的情节走向
5. **导出备份**：定期导出作品作为备份

## 享受创作！

GitForWriter 让你专注于创作本身，而不必担心版本管理和质量控制。写作愉快！
