# newmaybe

个人写作站点与数字花园中枢，记录随笔、观察、拾遗与生长的念头。

网址：[newmaybe.com](https://newmaybe.com)

---

## 🌸 核心理念与设计哲学

- **留白与专注**：无算法推荐、无信息流干扰、无评论区，让阅读回归文字本身。
- **隐私优先 (Privacy First)**：无第三方追踪代码（如 Google Analytics 等），无 Cookie，不采集任何读者数据。
- **极简与高性能**：零客户端 JavaScript 框架依赖（主站），所有字体自托管（无第三方字体请求），利用 Astro 静态生成 (SSG) 配合 Cloudflare CDN 实现极致的响应速度。
- **低饱和纸墨美学**：采用契合东方美学的“纸底墨色”视觉调性，冷暖墨色、赭石点缀，自适应暗黑模式。

---

## 🏗️ Monorepo 工作区架构

项目采用 **npm Monorepo 工作区** 架构，所有的子应用与共享数据托管在同一个代码仓库中，并通过 Cloudflare Pages 分发到不同的子域名下。

```
newmaybe/
├── apps/               # 子应用目录
│   ├── main/           # 主站 (newmaybe.com)
│   ├── graph/          # 知识网络图谱 (graph.newmaybe.com)
│   ├── tools/          # 排版与分享卡片工具 (tools.newmaybe.com)
│   ├── ai/             # AI 智能园丁 / 写作伴侣 (ai.newmaybe.com)
│   ├── lab/            # 趣味与放松互动实验 (lab.newmaybe.com)
│   └── studio/         # 创意工坊与海报生成 (studio.newmaybe.com)
├── packages/           # 共享包目录
│   └── content/        # 统一的内容数据库 (文章、念头、摘录等)
└── scripts/            # 自动化脚本工具
```

### 子域名与端口映射

| 子域名 (Subdomain) | 功能描述 | 技术栈 | 本地开发端口 | Cloudflare Pages 项目 |
| :--- | :--- | :--- | :--- | :--- |
| **`newmaybe.com`** | 主站（内容列表、正文阅读、关于/作品等） | Astro 7 + Vanilla CSS | `4321` | `newmaybe-main` |
| **`graph.newmaybe.com`** | 2D 知识网络关联图谱（可视化展现） | Astro 7 + D3.js | `4322` | `newmaybe-graph` |
| **`tools.newmaybe.com`** | 中英文排版美化器 & 念头/拾遗分享卡片导出 | React 19 + Tailwind v4 | `4323` | `newmaybe-tools` |
| **`ai.newmaybe.com`** | 基于 RAG（检索增强生成）的 AI 智能园丁对话 | React 19 + Workers AI | `4324` | `newmaybe-ai` |
| **`lab.newmaybe.com`** | 趣味实验（水墨模拟、漂浮诗行、白噪音、禅禅写作） | Astro 7 + Canvas | `4325` | `newmaybe-lab` |
| **`studio.newmaybe.com`** | 创意工坊（Canvas 海报生成、灵感生成、品牌资产） | React 19 + Tailwind v4 | `4326` | `newmaybe-studio` |

### 📦 共享内容数据库 (`packages/content`)

各子应用通过 Astro 7 的 **Content Layer API (glob loader)** 直接读取父级目录的 `packages/content`，实现数据源的单一事实来源 (Single Source of Truth)。

- **`posts/`**：深度文章、随笔、诗歌与小说。
- **`fragments/`**：轻量级念头碎片（记录情绪、地点、时间）。
- **`excerpts/`**：拾遗集（经典词句、片段摘录与随笔评论）。
- **`notes/`**：落叶集笔记（半结构化、持续生长的思考碎片，支持 🌱/🌿/🌳 三种生命周期阶段）。
- **`memories/`**：记忆档案（长期沉淀的常青树概念）。

---

## 💻 本地开发指南

### 1. 安装依赖
在项目根目录下执行以下命令，将自动安装所有子应用与包的依赖项：
```bash
npm install
```

### 2. 启动本地开发服务
在根目录下可以使用快捷命令一键启动对应的子应用服务，或同时启动多个服务：

```bash
# 启动主站 (http://localhost:4321)
npm run dev:main

# 启动图谱站 (http://localhost:4322)
npm run dev:graph

# 启动工具站 (http://localhost:4323)
npm run dev:tools

# 启动 AI 站 (http://localhost:4324)
npm run dev:ai

# 启动实验站 (http://localhost:4325)
npm run dev:lab

# 启动创意工坊 (http://localhost:4326)
npm run dev:studio
```

*本地开发模式下，系统会自动将各个跨域及子域名的跳转路由映射至本地对应的端口。*

### 3. 静态构建
```bash
# 构建对应的子应用
npm run build:main
npm run build:graph
npm run build:tools
npm run build:ai
npm run build:lab
npm run build:studio
```

---

## 🛠️ 自动化生产力工具

### 📊 文章质量审计工具 (`npm run audit`)

项目中内置了一个用于审计文章客观质量的自动化工具：[audit-posts.ts](file:///Users/chenning/WebstormProjects/newmaybe/scripts/audit-posts.ts)。

通过执行以下命令，可一键扫描 `packages/content/posts` 中的所有 Markdown 文章：
```bash
npm run audit
```

它会提供：
- 整体字数、阅读总时间及年代和类别的统计。
- 自动化检查并标记客观写作质量问题，例如：
  - 是否缺少 `readingTime` 字段，或声明的时间与实际字数估算（按 350 字/分）偏差是否超过 30%。
  - 散文/随笔是否没有划分章节（无二级标题 `##`）。
  - 描述 `description` 字段是否缺失、过短（<10字）或过长（>80字）。
  - 首段是否过长或过短（影响前言节奏）。
  - 尾段是否过短（收尾是否过于仓促）。

---

## 🚀 部署上线

项目采用 **Cloudflare Pages** 进行托管，由于每个域名在物理上共享同一个仓库，在 Cloudflare 上配置了 **5 个独立的 Pages 项目**，每个项目指向不同的 **根目录 (Root Directory)**。

具体的配置指南、环境变量设置以及 Cloudflare Workers AI 权限绑定方法，请参阅：[DEPLOY.md (Cloudflare 部署指南)](file:///Users/chenning/WebstormProjects/newmaybe/DEPLOY.md)。
