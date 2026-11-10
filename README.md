# AI Skincare Advisor · 护肤选购与使用顾问原型

[English](#english) · [中文](#中文介绍)

![原型首页 / Prototype homepage](docs/images/home.png)

## English

A research-informed skincare advisor prototype that turns product-selection questions, usage concerns and follow-up needs into an interactive experience. Using Paula’s Choice product materials as a case study, it connects research evidence with product design, explicit rules and implementation validation.

> This portfolio snapshot comes from a team project and is not affiliated with Paula’s Choice. The current demo uses rules and local product data; it does not connect to a large language model service. “AI advisor” describes the project concept. The prototype does not provide skin diagnoses or medical advice.

### Demo and documentation

- [Live demo](https://baola-advisor.pages.dev/) — deployed separately and may differ from this repository snapshot.
- [Research and product decisions](docs/research-and-decisions.md)
- [Implementation and validation](docs/implementation.md)
- [Project scope and contributions](docs/scope-and-contributions.md)
- [Data and assets](docs/data-and-assets.md)
- [Validation results](docs/validation.md)

The supporting documents linked above are currently in Chinese.

### The problem

Skincare questions arise both before purchase and during use: identifying the exact product, understanding its instructions, recognising when information is insufficient and deciding what to do when discomfort occurs. The prototype separates product selection from questions about products already owned, with traceable rules constraining the results.

### Implemented features

- Product-selection and usage questionnaires covering current discomfort, skin type, goals, ingredient experience, existing products and budget.
- A separate face-map entry point leading to related products, without uploading facial photographs.
- Product browsing, details and comparison, with a return path that preserves selection state.
- Saved plans, simulated membership and follow-up interactions, with relevant state stored locally in the browser.
- Branches for insufficient information, discomfort and ambiguous candidates, avoiding forced product selections.

See the face-map and product-comparison screenshots in the Chinese section below. The homepage screenshot at the top shows the prototype interface; the app interface is in Chinese.

### Research basis and limitations

Project materials include a questionnaire, interviews and analysis of social-platform discussions. This repository shares summary methods and their translation into design decisions, without publishing raw questionnaire responses, interviews or individual comments.

A local structural check of the Douyin comment file found 1,300 records from 8 videos and 5 collection keywords. There were 1,120 distinct texts and 1,121 text units after merging identical text within the same video. These are not counts of unique users. Targeted sampling, concentrated sources and repeated text limit generalisation. Keyword search matches are not manually verified frequencies of user needs.

### Run locally

Requires npm and Node.js 22.6+ with support for `--experimental-strip-types`.

```bash
npm ci
npm run dev
```

Run checks and create a production build:

```bash
npm test
npm run lint
npm run build
npm run preview
```

Both `build` and `test` first generate `data/products.public.json` from `data/products.json`. Hosting must support an SPA fallback for BrowserRouter routes. The production output is `dist/`.

### Stack and structure

React, TypeScript, React Router and Vite, with the built-in Node.js test runner.

| Directory | Contents |
|---|---|
| `src/` | Pages, questionnaire state, filtering rules, saved plans and membership simulation |
| `data/` | Product materials, frontend catalogue and image provenance |
| `scripts/` | Product catalogue export |
| `tests/` | Rules, storage, display, membership and follow-up tests |
| `public/` | Demo assets |
| `docs/` | Research methods, implementation boundaries and project documentation |

### Current limitations and asset rights

This is an interactive prototype. It has not demonstrated improvements in conversion, revenue or skincare outcomes. Prices are reference prices from project materials, not current selling prices. Extracting product information and matching fields does not establish official factual verification. There are no real membership accounts, payments, backend messaging or live user experiments.

Brand names, packaging and other third-party assets belong to their respective rights holders. This repository does not grant permission to reuse those assets, and no open-source licence has been applied to the project as a whole. See the [contribution statement](docs/scope-and-contributions.md) for the boundary between individual and team work.

---

## 中文介绍

基于用户研究，将选品、使用疑问和后续跟进需求转化为可交互原型。以宝拉珍选产品资料为案例，展示从研究证据到产品设计、规则实现和验证的过程。

> 本项目是团队项目背景下整理的作品集快照，与宝拉珍选官方无关联。当前演示使用规则与本地资料匹配，未接入大模型服务；“AI 顾问”是项目概念定位。原型不提供皮肤诊断或医疗建议。

### 项目体验与文档

- [在线演示](https://baola-advisor.pages.dev/)（独立部署，可能与本仓库快照存在版本差异）
- [研究与产品决策](docs/research-and-decisions.md)
- [实现与验证](docs/implementation.md)
- [项目范围与贡献说明](docs/scope-and-contributions.md)
- [数据与素材说明](docs/data-and-assets.md)
- [验证记录](docs/validation.md)

### 要解决的问题

用户的问题不仅发生在购买之前，也发生在开始使用之后：如何识别具体产品、理解使用说明、判断资料是否足够，以及出现不适时下一步该做什么。原型将“帮我选”和“已有产品，了解用法”分开，并通过可追溯规则限制推荐范围。

### 已实现的体验

- 选品与使用问答：结合当前不适、肤质、目标、成分经验、已有产品和预算筛选。
- 面部区域入口：点击示意图进入相关产品结果，不要求上传面部照片。
- 产品浏览、详情与对比，以及保留选品状态的返回流程。
- 保存与模拟会员、跟进体验；相关状态存储在浏览器本地。
- 信息不足、不适和候选不明确等分支，避免强行给出产品。

| 面部区域入口 / Face map | 产品对比 / Product comparison |
|---|---|
| ![面部示意图 / Face map](docs/images/face-map-woman.png) | ![产品对比 / Product comparison](docs/images/product-compare.png) |

### 研究基础与边界

项目材料包含问卷、访谈及社交平台讨论分析。此版本公开汇总方法与设计转化，不发布原始答卷、访谈或评论明细。

抖音评论文件的本地结构复核结果：1,300 条记录、8 个视频、5 个采集关键词；共有 1,120 种不同文本，按“同视频＋完全相同文本”合并得到 1,121 个文本单元。这些不是独立用户数。定向采样、来源集中和重复文本限制了外推；关键词检索结果不能视为人工确认后的需求频数。

### 本地运行

需要支持 `--experimental-strip-types` 的 Node.js 22.6+ 与 npm。安装与启动：

```bash
npm ci
npm run dev
```

验证与构建：

```bash
npm test
npm run lint
npm run build
npm run preview
```

`build` 与 `test` 会先从 `data/products.json` 生成前端目录 `data/products.public.json`。部署时需要支持 BrowserRouter 的 SPA 回退；构建输出为 `dist/`。

### 技术与目录

React、TypeScript、React Router、Vite；Node.js 内置测试工具。

| 目录 | 内容 |
|---|---|
| `src/` | 页面、问答状态、筛选规则、保存与会员模拟 |
| `data/` | 产品资料、前端目录与图片来源记录 |
| `scripts/` | 产品目录导出 |
| `tests/` | 推荐规则、存储、展示、会员与跟进测试 |
| `public/` | 演示素材 |
| `docs/` | 研究方法、实现边界与项目说明 |

### 当前限制与素材权利

这是可交互原型，未证明实际转化率、收入提升或护肤效果。产品价格为资料参考价，并非当前售价；产品资料提取与字段匹配不等于完成官方事实核验。没有真实会员账户、支付、后台消息发送或线上用户实验。

品牌名称、包装与其他第三方素材的权利归各自权利人。仓库未授予这些素材的再使用许可，也未为整个项目添加开源许可证。个人与团队贡献边界见[贡献说明](docs/scope-and-contributions.md)。
