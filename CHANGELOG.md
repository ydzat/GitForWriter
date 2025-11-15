# Changelog

All notable changes to the GitForWriter extension will be documented in this file.

## [1.0.0] - 2024-01-01

### Added
- ✨ 初始版本发布
- 🎯 三大核心命令：
  - "Start Writing Project" - 初始化写作项目
  - "AI Review" - AI 智能审校
  - "Export Draft" - 多格式导出
- 🔍 自动 Git diff 检测和记录
- 🤖 AI 语义 Diff 分析模块
  - 自然语言修改摘要
  - 逻辑一致性报告
- 📊 WebView 审校结果面板
  - 可视化展示审校结果
  - 一键采纳修改建议
- 📈 状态栏写作阶段显示
  - 构思 → 撰写 → 审校 → 发布
- 📁 自动创建项目结构
  - `.gitforwriter` 目录用于存储 diff 和审校记录
  - `ai` 目录用于扩展 AI 模块
- 📤 多格式导出支持
  - Markdown
  - LaTeX
  - PDF（需要外部工具）
- 📚 完整的中文文档和 README
- 🎨 支持 Markdown 和 LaTeX 文件

### Technical
- TypeScript 实现，类型安全
- ESLint 代码质量检查
- 集成 simple-git 进行 Git 操作
- VSCode Extension API 深度集成

## [Unreleased]

### Added
- ⚡ **性能优化系统** (Issue #20)
  - AI 响应缓存：智能缓存 AI 分析结果，减少重复 API 调用
    - LRU 缓存策略，自动管理内存
    - 可配置的缓存大小和过期时间
    - 显著降低 API 成本和响应时间
  - 文档保存防抖：避免频繁保存时的重复分析
    - 可配置的延迟时间（默认 2 秒）
    - 智能合并连续的保存操作
  - Git 操作缓存：缓存 Git 状态和 diff 结果
    - 减少磁盘 I/O 操作
    - 提升大型项目的响应速度
  - 性能监控：实时追踪操作性能
    - 自动识别慢操作（>1 秒）
    - 详细的性能统计（平均值、最小值、最大值）
- 🎨 **新增命令**
  - `GitForWriter: View Performance Statistics` - 查看性能统计
  - `GitForWriter: Clear AI Cache` - 清空 AI 缓存
- 📊 **新增配置选项**
  - `gitforwriter.performance.debounceDelay` - 文档保存防抖延迟
  - `gitforwriter.performance.enableCache` - 启用/禁用 AI 缓存
  - `gitforwriter.performance.cacheTTL` - 缓存过期时间
  - `gitforwriter.performance.cacheMaxSize` - 最大缓存大小
- 📚 **新增文档**
  - `PERFORMANCE.md` - 性能优化指南和最佳实践

### Technical
- 实现 `AICache` 类：LRU 缓存，支持 TTL 和大小限制
- 实现 `debounce` 函数：通用防抖工具
- 实现 `PerformanceMonitor` 类：性能监控和统计
- 优化 `GitManager`：添加 Git 状态和 diff 缓存
- 优化 `UnifiedProvider`：集成 AI 响应缓存
- 优化 `extension.ts`：添加防抖和性能监控
- 新增单元测试：`aiCache.test.ts`、`debounce.test.ts`
- 测试覆盖率：575 个测试通过

### Planned
- 多人协作功能
- 自定义审校规则
- 更多导出格式支持
