# Cloudflare Pages 部署指南

项目为 **npm Monorepo**，6 个子应用共享同一个 Git 仓库，在 Cloudflare 上配置为 **6 个独立的 Pages 项目**，各自指向不同的根目录，互相独立编译和部署。

---

## 部署参数一览

| 子域名 | Pages 项目名 | 根目录 | 构建命令 | 输出目录 | 框架预设 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `newmaybe.com` | `newmaybe-main` | `apps/main` | `npm run build` | `dist` | Astro |
| `graph.newmaybe.com` | `newmaybe-graph` | `apps/graph` | `npm run build` | `dist` | Astro |
| `tools.newmaybe.com` | `newmaybe-tools` | `apps/tools` | `npm run build` | `dist` | Vite |
| `ai.newmaybe.com` | `newmaybe-ai` | `apps/ai` | `npm run build` | `dist` | Vite |
| `lab.newmaybe.com` | `newmaybe-lab` | `apps/lab` | `npm run build` | `dist` | Astro |
| `studio.newmaybe.com` | `newmaybe-studio` | `apps/studio` | `npm run build` | `dist` | Vite |

> `tools` / `ai` / `studio` 是 React + Vite 应用，框架预设选 **Vite**；其余三个选 **Astro**。

---

## 创建 Pages 项目（通用步骤）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 进入 **Workers & Pages** → **Create** → **Pages** 标签页。
3. 点击 **Connect to Git**，授权并选择 `newmaybe` 仓库。
4. 填写构建参数（见上表）：
   - **Root directory**（根目录）：**最关键的一项**，填写对应的 `apps/xxx`。
   - **Build command**：`npm run build`
   - **Build output directory**：`dist`
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

## 为什么 Monorepo 能正常编译？

Cloudflare Pages 构建时会克隆**整个 Git 仓库**到容器，即使根目录设为 `apps/main`，父级的 `packages/content` 目录依然存在。

因此 Astro 在编译期执行 `glob({ base: '../../packages/content/posts' })` 时，能够向上回溯两级加载所有 Markdown 内容——这是多子域共享单一内容数据库的关键。

同理，`@newmaybe/shared-styles` 和 `@newmaybe/content` 两个 workspace 包在构建容器内通过 npm workspaces symlink 正常解析，无需额外配置。

---

## 主站构建说明（`newmaybe-main`）

主站构建命令 `npm run build` 实际执行的是：

```
astro build && pagefind --site dist
```

`pagefind` 在 Astro 静态产物上建立全文搜索索引，生成 `/pagefind/` 目录。Cloudflare Pages 会将其与其余静态资产一起发布。若构建日志中出现 `pagefind` 相关错误，检查 `pagefind` 是否在 `apps/main/package.json` 中列为 devDependency。
