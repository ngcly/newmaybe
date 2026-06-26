# Cloudflare Pages 部署指南

项目为 **npm Monorepo**，6 个子应用共享同一个 Git 仓库，在 Cloudflare 上配置为 **6 个独立的 Pages 项目**，各自指向不同的根目录，互相独立编译和部署。

---

## 部署参数一览

| 子域名 | Pages 项目名 | 根目录 (Root directory) | 构建命令 (Build command) | 部署命令 (Deploy command) | 输出目录 (Build output directory) | 框架预设 |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `newmaybe.com` | `newmaybe-main` | `(留空 / Git 根目录)` | `npm run build:main` | `npx wrangler deploy --config apps/main/wrangler.toml` | `apps/main/dist` | Astro |
| `graph.newmaybe.com` | `newmaybe-graph` | `(留空 / Git 根目录)` | `npm run build:graph` | `npx wrangler deploy --config apps/graph/wrangler.toml` | `apps/graph/dist` | Astro |
| `tools.newmaybe.com` | `newmaybe-tools` | `(留空 / Git 根目录)` | `npm run build:tools` | `npx wrangler deploy --config apps/tools/wrangler.toml` | `apps/tools/dist` | Vite |
| `ai.newmaybe.com` | `newmaybe-ai` | `(留空 / Git 根目录)` | `npm run build:ai` | `npx wrangler deploy --config apps/ai/wrangler.toml` | `apps/ai/dist` | Vite |
| `lab.newmaybe.com` | `newmaybe-lab` | `(留空 / Git 根目录)` | `npm run build:lab` | `npx wrangler deploy --config apps/lab/wrangler.toml` | `apps/lab/dist` | Astro |
| `studio.newmaybe.com` | `newmaybe-studio` | `(留空 / Git 根目录)` | `npm run build:studio` | `npx wrangler deploy --config apps/studio/wrangler.toml` | `apps/studio/dist` | Vite |

> `tools` / `ai` / `studio` 是 React + Vite 应用，框架预设选 **Vite**；其余三个选 **Astro**。

---

## 创建 Pages/Workers 项目（通用步骤）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 进入 **Workers & Pages** → **Create** → **Pages** (或 **Workers**) 标签页。
3. 点击 **Connect to Git**，授权并选择 `newmaybe` 仓库。
4. 填写构建与部署参数（见上表）：
   - **Root directory**（根目录）：**必须留空 (Git 仓库根目录)**。因为这是一个 npm Workspaces Monorepo，必须在整个仓库的根目录下进行依赖安装（`npm install`），以便软链接本地的 `@newmaybe/content` 和 `@newmaybe/shared-styles`。
   - **Build command**（构建命令）：`npm run build:xxx` (例如 `npm run build:main`)
   - **Deploy command**（部署命令）：`npx wrangler deploy --config apps/xxx/wrangler.toml` (例如 `npx wrangler deploy --config apps/graph/wrangler.toml`)
   - **Build output directory**（构建输出目录）：`apps/xxx/dist` (例如 `apps/main/dist`)
   - **Framework preset**：Astro 或 Vite（见上表）
5. 点击 **Save and Deploy**，等待首次构建完成。

---

## 绑定自定义域名

每个 Pages 项目构建成功后：

1. 进入该项目 → **Custom domains** 标签页。
2. 点击 **Set up a custom domain**，输入对应子域名。
3. Cloudflare 自动配置 DNS 解析并签发 SSL 证书（域名需托管在 Cloudflare）。

---

## AI 子域特别配置（`newmaybe-ai`）

免费体验模式通过 **Cloudflare Pages Functions** 调用 Workers AI 大模型，需要手动绑定 AI 权限：

1. 进入 `newmaybe-ai` 项目 → **Settings** → **Functions**。
2. 找到 **AI bindings** 区域 → **Add binding**。
3. **Variable name** 填写 `AI`（必须全大写，对应后端 `context.env.AI`）。
4. 保存后**重新触发一次部署**（绑定变更需重新构建才生效）。

### 模型回退策略

服务端依次尝试以下模型：

1. `@cf/qwen/qwen1.5-14b-chat`（主选，中文理解优秀）
2. `@cf/meta/llama-3-8b-instruct`（备用，主选超出并发时自动切换）

### 自定义 API 接入（读者自选）

用户可在 AI 页面控制面板填入自己的 API Key（支持 OpenAI / Gemini / DeepSeek / Kimi / 通义千问 / 硅基流动等）。配置保存在浏览器 `localStorage`，请求由浏览器直接发向 API 提供商，**不经过任何中转服务器**。

---

## 环境变量

在各 Pages 项目的 **Settings → Environment variables** 中配置：

| 变量名 | 值 | 适用项目 | 说明 |
| :--- | :--- | :--- | :--- |
| `NODE_VERSION` | `22` | 全部 | 与本地 Node 版本一致，避免 Vite 编译异常 |

---

## 优化构建触发：避免全项目更新 (Build Watch Paths)

由于 6 个子应用共享同一个 Git 仓库，默认情况下您的任何一次 Git 提交都会触发这 6 个项目在 Cloudflare 上同时进行构建和部署。为了节省构建额度并加快部署速度，建议配置 **Build watch paths (构建监视路径)**，实现「仅在相关代码发生变更时才触发构建」。

### 配置方法

对于每个 Pages/Workers 项目，在 Cloudflare 控制台中进行如下配置：
1. 进入项目 → **Settings (设置)** → **Builds & deployments (构建与部署)**。
2. 找到 **Build watch paths (构建监视路径)** 区域，点击编辑。
3. 根据项目依赖，在 **Include paths (包含路径)** 中填写该项目自身及所依赖的公共包路径（每行一条）：

| 项目 | 推荐的包含路径 (Include paths) |
| :--- | :--- |
| `newmaybe-main` | `apps/main/*`<br>`packages/content/*`<br>`packages/shared-styles/*` |
| `newmaybe-graph` | `apps/graph/*`<br>`packages/content/*`<br>`packages/shared-styles/*` |
| `newmaybe-tools` | `apps/tools/*`<br>`packages/shared-styles/*` |
| `newmaybe-ai` | `apps/ai/*`<br>`packages/content/*`<br>`packages/shared-styles/*` |
| `newmaybe-lab` | `apps/lab/*`<br>`packages/shared-styles/*` |
| `newmaybe-studio` | `apps/studio/*`<br>`packages/shared-styles/*` |

*注：Exclude paths (排除路径) 保持留空即可。配置完成后，当您提交代码时，Cloudflare 会先检查变动文件是否命中上述包含路径，若没有命中则会自动跳过（Skip）该项目的构建。*

---

## 为什么 Monorepo 能正常编译？

由于项目基于 **npm Workspaces** 构筑，当 Cloudflare Pages 把 **Root directory** 设为 `(留空 / Git 根目录)` 时，构建系统会在整个 Git 仓库根目录执行 `npm clean-install`。这会自动在根目录的 `node_modules/` 下为本地的 `@newmaybe/content` 和 `@newmaybe/shared-styles` 包生成软链接（Symlinks）。

当执行各子应用的构建命令（如 `npm run build:graph`，即 `npm run build -w apps/graph`）时，由于 node 会自动往上回溯父级目录的 `node_modules`，各子应用便能够完美识别并加载这两个本地依赖包，实现零配置跨子域名模块解析。

此外，由于构建工作在根目录下进行，Astro 在编译期执行 `glob({ base: '../../packages/content/posts' })` 回溯加载内容时也能正常向上回溯两级加载所有 Markdown 内容。

---

## 主站构建说明（`newmaybe-main`）

主站构建命令 `npm run build` 实际执行的是：

```
astro build && pagefind --site dist
```

`pagefind` 在 Astro 静态产物上建立全文搜索索引，生成 `/pagefind/` 目录。Cloudflare Pages 会将其与其余静态资产一起发布。若构建日志中出现 `pagefind` 相关错误，检查 `pagefind` 是否在 `apps/main/package.json` 中列为 devDependency。
