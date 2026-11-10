# 本次验证记录

执行日期：2026-11-10。执行目录为本作品集快照，未修改原项目。

| 检查 | 结果 |
|---|---|
| `npm ci` | 成功安装；该次 npm 审计报告 0 个已知漏洞，不构成完整安全审计 |
| `npm test` | 37 项通过，0 项失败 |
| `npm run build` | TypeScript 与 Vite 生产构建成功 |
| `npm run lint` | 退出码 0，仍有下面 4 条警告 |
| 源文件凭据与路径初筛 | 未发现所检模式的 GitHub/OpenAI 凭据、私钥头、本地用户绝对路径或邮箱；模式扫描不能证明完全不存在敏感信息 |
| 原始研究数据 | 未纳入上传清单 |

静态检查警告：

- `tests/engine.test.ts:28`：重复的 `ingredientExperience` 键。
- `src/components/ProductResultCard.tsx:102`：Fast Refresh 建议将非组件导出拆到其他文件。
- `src/qa/session.tsx:116`：同类 Fast Refresh 警告。
- `src/pages/QuizPage.tsx:120`：Effect 依赖缺少 `quiz`。

本次保留源码行为，没有为了上传而修改这些警告。现有截图来自此前项目演示，用于呈现界面，不作为本次浏览器端到端验收的证据。本次未重新部署线上版本，也未完成真实用户测试。
