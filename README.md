# newmaybe

个人写作站点与数字花园中枢，记录随笔、观察、拾遗与正在生长的念头。

网址：[newmaybe.com](https://newmaybe.com)

---

## 核心理念

- **留白与专注**：无算法推荐、无信息流、无评论区，让阅读回归文字本身。
- **隐私优先**：无第三方追踪（无 Google Analytics），无 Cookie 追踪，不采集读者数据。
- **极简高性能**：主站零客户端 JS 框架，所有字体自托管（无外部字体请求），Astro SSG + Cloudflare CDN。
- **纸墨美学**：东方「纸底墨色」视觉调性，赭石点缀，自适应暗黑模式，无主题切换闪烁。

---

## Monorepo 架构

项目采用 **npm Workspaces** 架构，6 个子应用共享同一个内容数据库，分别部署到不同子域。

```
newmaybe/
├── apps/
│   ├── main/        # newmaybe.com        — 主站（写作、花园、念头、拾遗）
│   ├── graph/       # graph.newmaybe.com  — 知识关系网络可视化
│   ├── tools/       # tools.newmaybe.com  — 排版工具与分享卡片导出
│   ├── ai/          # ai.newmaybe.com     — RAG 智能园丁对话
│   ├── lab/         # lab.newmaybe.com    — 感官艺术与交互实验
│   └── studio/      # studio.newmaybe.com — 海报生成与创意工坊
├── packages/
│   ├── content/        # 统一内容数据库（Markdown + Zod schemas）
│   └── shared-styles/  # 全局 CSS 设计 Token（6 个子应用共用）
└── scripts/
    ├── new.ts          # 内容创建 CLI
    └── audit-posts.ts  # 文章质量审计
```

### 子域名一览

| 子域名                | 功能                                 | 技术栈                 | 本地端口 |
| :-------------------- | :----------------------------------- | :--------------------- | :------- |
| `newmaybe.com`        | 主站（文字、花园、念头、拾遗、作品） | Astro 7 + Vanilla CSS  | `4321`   |
| `graph.newmaybe.com`  | 知识网络力导向图谱（D3.js）          | Astro 7 + D3.js        | `4322`   |
| `tools.newmaybe.com`  | 中英文排版工具 + 念头卡片导出        | React 19 + Tailwind v4 | `4323`   |
| `ai.newmaybe.com`     | 基于 RAG 的 AI 智能园丁对话          | React 19 + Workers AI  | `4324`   |
| `lab.newmaybe.com`    | 感官艺术与 Canvas 物理交互实验       | Astro 7 + Canvas       | `4325`   |
| `studio.newmaybe.com` | Canvas 海报生成与品牌资产工坊        | React 19 + Tailwind v4 | `4326`   |

### 共享内容库 (`packages/content`)

各子应用通过 Astro Content Layer API 直接读取 `packages/content`，实现单一数据源：

| 集合         | 内容类型                                      |
| :----------- | :-------------------------------------------- |
| `posts/`     | 文字：随笔、诗歌、散文、小说                  |
| `fragments/` | 念头：轻量日常碎片（情绪、地点、时间）        |
| `excerpts/`  | 拾遗：摘录与批注                              |
| `notes/`     | 笔记：支持 🌱 萌芽 / 🌿 成长 / 🌳 常青 三阶段 |
| `memories/`  | 记忆：长期沉淀的概念与认知                    |

所有集合支持 `connections` 字段（格式：`["notes/slug", "posts/slug"]`），在文章页生成"延伸阅读"关联。

---

## 本地开发

```bash
npm install          # 安装所有子应用依赖

# 启动各子应用开发服务器
npm run dev:main     # http://localhost:4321
npm run dev:graph    # http://localhost:4322
npm run dev:tools    # http://localhost:4323
npm run dev:ai       # http://localhost:4324
npm run dev:lab      # http://localhost:4325
npm run dev:studio   # http://localhost:4326
```

本地开发模式下，各子应用的跨域链接会自动映射至对应的本地端口（由 `resolveSubdomain()` 处理）。

---

## 内容生产工作流

### 快速创建内容（推荐）

```bash
npm run new fragment              # 今日念头（零交互，自动日期文件名）
npm run new fragment morning      # 指定文件名关键词
npm run new note                  # 笔记（交互：标题 / slug / 成长阶段）
npm run new post                  # 文章（交互：标题 / slug / 简介 / 分类，默认 draft）
npm run new excerpt               # 拾遗（零交互）
```

创建后文件自动在 `$EDITOR` 中打开。

### 文章质量审计

```bash
npm run audit
```

扫描 `packages/content/posts/` 下所有文章，输出：

- 总字数、总阅读时间、年代与类别分布
- 逐篇检查：`readingTime` 是否偏差超 30%、`description` 长度、章节结构、首尾段节奏

---

## 构建

```bash
npm run build:main     # Astro 构建 + Pagefind 全文索引
npm run build:graph
npm run build:tools
npm run build:ai
npm run build:lab
npm run build:studio
```

---

## 部署

项目部署在 **Cloudflare Pages**，6 个子应用各自对应一个独立的 Pages 项目，连接同一个 Git 仓库，通过不同的**根目录**配置区分。

详见 [DEPLOY.md](./DEPLOY.md)。
