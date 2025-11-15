# GitForWriter 性能优化指南

本文档介绍 GitForWriter 的性能优化功能和最佳实践。

## 🚀 性能优化功能

### 1. AI 响应缓存

GitForWriter 使用智能缓存系统来减少重复的 AI API 调用，显著降低成本和响应时间。

**工作原理：**
- 基于内容和操作类型生成缓存键（SHA-256 哈希）
- 使用 LRU（最近最少使用）策略管理缓存
- 自动清理过期条目
- 独立缓存不同类型的操作（diff 分析、文本审校、建议生成）

**配置选项：**
```json
{
  "gitforwriter.performance.enableCache": true,        // 启用/禁用缓存
  "gitforwriter.performance.cacheTTL": 3600000,        // 缓存过期时间（毫秒）
  "gitforwriter.performance.cacheMaxSize": 104857600   // 最大缓存大小（字节）
}
```

**默认值：**
- 启用状态：`true`
- TTL：1 小时（3600000 毫秒）
- 最大大小：100MB（104857600 字节）

**何时使用：**
- ✅ 频繁编辑相同内容时
- ✅ 需要降低 API 成本时
- ✅ 网络连接不稳定时
- ❌ 需要每次都获取最新 AI 分析时（可设置较短的 TTL）

### 2. 文档保存防抖

防止频繁保存时触发过多的分析操作。

**工作原理：**
- 延迟执行分析，直到停止保存一段时间后
- 自动合并连续的保存操作
- 可配置延迟时间

**配置选项：**
```json
{
  "gitforwriter.performance.debounceDelay": 2000  // 延迟时间（毫秒，0-10000）
}
```

**默认值：**
- 延迟：2 秒（2000 毫秒）

**推荐设置：**
- 快速反馈：500-1000ms
- 平衡模式：2000ms（默认）
- 节省资源：5000-10000ms
- 禁用防抖：0ms（立即分析）

### 3. Git 操作缓存

缓存 Git 状态和 diff 结果，减少磁盘 I/O 操作。

**工作原理：**
- 缓存 Git 状态（5 秒 TTL）
- 缓存文件 diff 结果（3 秒 TTL）
- 提交后自动清空缓存

**优势：**
- 减少磁盘读取
- 提升大型项目响应速度
- 降低 Git 命令执行频率

### 4. 性能监控

实时追踪操作性能，识别瓶颈。

**功能：**
- 记录每个操作的执行时间
- 自动标记慢操作（>1 秒）
- 提供详细的统计信息（平均值、最小值、最大值）

**查看统计：**
1. 打开命令面板（`Ctrl+Shift+P` 或 `Cmd+Shift+P`）
2. 运行 `GitForWriter: View Performance Statistics`

**统计指标：**
- 操作名称
- 执行次数
- 平均耗时
- 最小/最大耗时
- 总耗时

## 📊 性能最佳实践

### 1. 根据使用场景调整配置

**频繁编辑场景：**
```json
{
  "gitforwriter.performance.debounceDelay": 3000,
  "gitforwriter.performance.enableCache": true,
  "gitforwriter.performance.cacheTTL": 7200000  // 2 小时
}
```

**快速反馈场景：**
```json
{
  "gitforwriter.performance.debounceDelay": 500,
  "gitforwriter.performance.enableCache": true,
  "gitforwriter.performance.cacheTTL": 1800000  // 30 分钟
}
```

**成本优先场景：**
```json
{
  "gitforwriter.performance.debounceDelay": 5000,
  "gitforwriter.performance.enableCache": true,
  "gitforwriter.performance.cacheTTL": 86400000,  // 24 小时
  "gitforwriter.performance.cacheMaxSize": 524288000  // 500MB
}
```

### 2. 定期清理缓存

虽然缓存会自动管理，但在以下情况建议手动清理：
- 切换 AI 模型后
- 更新 AI 提示词后
- 发现缓存结果不准确时

**清理方法：**
1. 打开命令面板
2. 运行 `GitForWriter: Clear AI Cache`

### 3. 监控性能

定期查看性能统计，识别慢操作：
- 如果 `document-save` 操作过慢，考虑增加防抖延迟
- 如果 `ai-review` 操作过慢，检查网络连接或 AI 模型选择
- 如果 `git-diff` 操作过慢，考虑优化 Git 仓库（如运行 `git gc`）

## 🔧 故障排除

### 缓存未生效

**症状：**每次都调用 AI API，即使内容相同

**解决方案：**
1. 检查缓存是否启用：`gitforwriter.performance.enableCache`
2. 检查缓存是否过期：调整 `cacheTTL`
3. 查看缓存统计：运行 `View Performance Statistics`

### 响应延迟过高

**症状：**保存后很久才看到分析结果

**解决方案：**
1. 减少防抖延迟：降低 `debounceDelay`
2. 检查网络连接
3. 考虑使用更快的 AI 模型（如 GPT-3.5 或 Claude Haiku）

### 内存占用过高

**症状：**VSCode 内存使用持续增长

**解决方案：**
1. 减少缓存大小：降低 `cacheMaxSize`
2. 减少缓存时间：降低 `cacheTTL`
3. 手动清理缓存：运行 `Clear AI Cache`

## 📈 性能指标参考

**典型操作耗时：**
- 文档保存处理：< 100ms（不含 AI 调用）
- Git diff 获取：< 50ms（缓存命中）
- AI diff 分析：1-3 秒（首次）/ < 10ms（缓存命中）
- AI 文本审校：2-5 秒（首次）/ < 10ms（缓存命中）

**缓存命中率：**
- 理想情况：> 50%
- 频繁编辑相同内容：> 80%
- 持续创作新内容：20-40%

## 🎯 总结

GitForWriter 的性能优化功能旨在：
1. **降低成本**：通过缓存减少 AI API 调用
2. **提升响应速度**：通过防抖和缓存减少等待时间
3. **优化资源使用**：智能管理内存和磁盘 I/O
4. **提供可见性**：通过性能监控了解系统状态

根据您的使用场景调整配置，可以获得最佳的性能和用户体验。

