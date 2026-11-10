# 实现与验证

## 当前架构

这是客户端应用。问答收集结构化输入，规则引擎读取本地产品目录并产生结果，页面展示理由、产品资料及后续操作。当前源码没有接入大模型 API，也没有服务端推理或会员后台。

`data/products.json` 是产品资料提取文件；`scripts/export-public-catalog.mjs` 生成前端使用的 `products.public.json`。后者的命名描述前端展示字段，不代表第三方素材获得了公开再分发许可。

保存及会员跟进使用浏览器本地存储。用户清理浏览器数据后可能丢失这些记录，不支持跨设备同步。会员功能属于模拟体验。

## 验证入口

- `npm test`：执行现有规则、存储、展示、消息、会员和跟进测试。
- `npm run lint`：运行现有静态检查。
- `npm run build`：导出前端产品目录、检查 TypeScript 并构建页面。

最新执行结果见 [validation.md](validation.md)。自动化测试验证有限的代码行为，不等于医学验证、真实用户验证或生产环境合规认证。

## 部署

`npm run build` 的静态输出位于 `dist/`。使用 BrowserRouter，托管平台须为应用路由回退到 `index.html`。现有 Cloudflare Pages 演示与此快照独立管理，本次仓库整理不会触发部署。
