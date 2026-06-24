# newmaybe 多子域 Cloudflare Pages 部署指南

由于项目已成功重构为 **npm Monorepo 工作区**，各域名在物理上共享同一个 Git 仓库，但在 Cloudflare 上应当作为 **5 个独立的 Pages 项目** 进行部署。

这是 Cloudflare 官方推荐的 Monorepo 部署方案，各域名完全独立编译、部署、共享数据且完全免费。

---

## 部署概览

在 Cloudflare Dashboard 中，针对每个子域名分别创建一个 Pages 项目，并连接到您的同一个 Git 仓库。参数配置如下表所示：

| 子域名 (Subdomain) | Pages 项目名称 | 根目录 (Root Directory) | 构建命令 (Build Command) | 输出目录 (Output Directory) |
| :--- | :--- | :--- | :--- | :--- |
| **`newmaybe.com`** | `newmaybe-main` | `apps/main` | `npm run build` | `dist` |
| **`graph.newmaybe.com`** | `newmaybe-graph` | `apps/graph` | `npm run build` | `dist` |
| **`tools.newmaybe.com`** | `newmaybe-tools` | `apps/tools` | `npm run build` | `dist` |
| **`ai.newmaybe.com`** | `newmaybe-ai` | `apps/ai` | `npm run build` | `dist` |
| **`lab.newmaybe.com`** | `newmaybe-lab` | `apps/lab` | `npm run build` | `dist` |

---

## 详细步骤

以下以部署 **主站 `newmaybe.com`** 和 **图谱子域 `graph.newmaybe.com`** 为例：

### 第一步：创建 Pages 项目
1. 登录 [Cloudflare 控制台](https://dash.cloudflare.com/)。
2. 进入 **Workers 与 Pages (Workers & Pages)** ──> 点击 **创建 (Create)** ──> 选择 **Pages** 选项卡。
3. 点击 **连接到 Git (Connect to Git)**，授权并选择您的 `newmaybe` 仓库。

### 第二步：配置构建参数

针对不同的域名，在配置页面点击 **构建和部署设置 (Build & deployment settings)**，按照下方参数输入：

#### 1. 部署主站 (`newmaybe.com`)
*   **项目名称 (Project name)**: `newmaybe-main` (或者您喜欢的名字)
*   **框架预设 (Framework preset)**: `Astro`
*   **根目录 (Root directory)**: `apps/main`  *(⚠️ 极其关键：告诉 CF 从子项目目录开始)*
*   **构建命令 (Build command)**: `npm run build`  *(⚠️ 会自动触发 astro build && pagefind)*
*   **输出目录 (Build output directory)**: `dist`

#### 2. 部署图谱站 (`graph.newmaybe.com`)
*   **项目名称 (Project name)**: `newmaybe-graph`
*   **框架预设 (Framework preset)**: `Astro`
*   **根目录 (Root directory)**: `apps/graph`
*   **构建命令 (Build command)**: `npm run build`
*   **输出目录 (Build output directory)**: `dist`

#### 3. 部署工具站/AI站/实验站 (`tools.` / `ai.` / `lab.`)
*   按照上表对应的 **根目录** 填写即可。其中 `tools` 和 `ai` 框架预设选择 `Vite` 即可。

### 第三步：绑定自定义域名 (Custom Domains)
Pages 部署成功后，Cloudflare 会分配一个默认的 `*.pages.dev` 域名。
1. 进入对应的 Pages 项目控制台。
2. 切换到 **自定义域 (Custom domains)** 选项卡。
3. 点击 **设置自定义域 (Set up a custom domain)**，输入您对应的域名（如 `graph.newmaybe.com`），点击继续。
4. Cloudflare 会自动为您配置 DNS 解析并签发 SSL 证书。

---

## 💡 为什么这种模式能正常编译？

由于 Cloudflare Pages 在编译时会克隆整个 Git 仓库，因此即使您在配置中指定了 **根目录** 为 `apps/main`，它的父级文件夹 `packages/content` 依然存在于编译容器中。

所以，Astro 在编译期运行 `glob({ base: '../../packages/content/posts' })` 时，能够顺利地向上回溯两级并加载所有的 Markdown 内容，保证了主站、图谱站、实验站等能完美共享同一套内容。

## ⚠️ 常见环境变量配置

如果您在本地和线上编译的 Node.js 版本不一致，建议在 Cloudflare Pages 项目的 **设置 (Settings)** ──> **环境变量 (Environment variables)** 中添加：
*   `NODE_VERSION` = `22` (或者您本地的 Node 版本，确保 Vite 正常编译)
