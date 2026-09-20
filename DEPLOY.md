# Cloudflare Workers / Pages 部署指南

项目为 **npm Monorepo**，7 个子应用共享同一个 Git 仓库，在 Cloudflare 上配置为 **7 个独立项目**，使用各自的构建命令与 Wrangler 配置，互相独立编译和部署。

---

## 部署参数一览

| 子域名                | Pages 项目名      | 根目录 (Root directory) | 构建命令 (Build command) | 部署命令 (Deploy command)                                | 输出目录 (Build output directory) | 框架预设 |
| :-------------------- | :---------------- | :---------------------- | :----------------------- | :------------------------------------------------------- | :-------------------------------- | :------- |
| `newmaybe.com`        | `newmaybe-main`   | `(留空 / Git 根目录)`   | `npm run build:main`     | `npx wrangler deploy --config apps/main/wrangler.toml`   | `apps/main/dist`                  | Astro    |
| `graph.newmaybe.com`  | `newmaybe-graph`  | `(留空 / Git 根目录)`   | `npm run build:graph`    | `npx wrangler deploy --config apps/graph/wrangler.toml`  | `apps/graph/dist`                 | Astro    |
| `ai.newmaybe.com`     | `newmaybe-ai`     | `(留空 / Git 根目录)`   | `npm run build:ai`       | `npx wrangler deploy --config apps/ai/wrangler.toml`     | `apps/ai/dist`                    | Vite     |
| `lab.newmaybe.com`    | `newmaybe-lab`    | `(留空 / Git 根目录)`   | `npm run build:lab`      | `npx wrangler deploy --config apps/lab/wrangler.toml`    | `apps/lab/dist`                   | Astro    |
| `studio.newmaybe.com` | `newmaybe-studio` | `(留空 / Git 根目录)`   | `npm run build:studio`   | `npx wrangler deploy --config apps/studio/wrangler.toml` | `apps/studio/dist`                | Vite     |
| `study.newmaybe.com`  | `newmaybe-study`  | `(留空 / Git 根目录)`   | `npm run build:study`    | `npx wrangler deploy --config apps/study/wrangler.toml`  | `apps/study/dist`                 | Vite     |
| `club.newmaybe.com`   | `newmaybe-club`   | `(留空 / Git 根目录)`   | `npm run build:club`     | `npx wrangler deploy --config apps/club/wrangler.toml`   | `apps/club/dist`                  | Vite     |

> `ai` / `studio` / `study` / `club` 是 React + Vite 应用，框架预设选 **Vite**；`main` / `graph` / `lab` 选 **Astro**。

---

## 创建 Workers 项目

本表的 `wrangler deploy` 命令及 `[assets]` 配置使用 Workers Static Assets。选择 Workers Git 构建时使用构建命令和部署命令；选择 Pages 时仅指定输出目录，不能把 Worker 入口及绑定视为 Pages Function。AI 应用必须使用 Worker 配置部署。

## 创建项目（通用步骤）

1. 登录 [Cloudflare Dashboard](https://dash.cloudflare.com/)。
2. 进入 **Workers & Pages** → **Create** → **Pages** (或 **Workers**) 标签页。
3. 点击 **Connect to Git**，授权并选择 `newmaybe` 仓库。
4. 填写构建与部署参数（见上表）：
   - **Root directory**（根目录）：**必须留空 (Git 仓库根目录)**。因为这是一个 npm Workspaces Monorepo，必须在整个仓库的根目录下进行依赖安装（`npm install`），以便软链接本地的 `@newmaybe/content`、`@newmaybe/shared-styles` 和 `@newmaybe/ai-client`。
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

免费体验模式通过 `apps/ai/src/worker.ts` 调用 Workers AI。以下绑定已经声明在
`apps/ai/wrangler.toml` 中：

- `AI`：Workers AI binding
- `RATE_LIMITER`：每个客户端每分钟最多 6 次请求
- `BURST_LIMITER`：每个 Cloudflare 边缘位置每分钟最多 30 次免费请求

使用表格中的 Wrangler 部署命令时会按配置创建绑定。部署完成后可在
**Workers & Pages → newmaybe-ai → Bindings** 中确认；若在控制台手动修改绑定，需要重新部署。

### 模型回退策略

服务端依次尝试以下模型：

1. `@cf/meta/llama-3.1-8b-instruct`
2. `@cf/meta/llama-3.1-8b-instruct-fast`（主模型调用失败时自动回退）

### 自定义 API 接入（读者自选）

用户可在 AI 页面控制面板填入自己的 API Key（支持 OpenAI / Gemini / DeepSeek / Kimi / 通义千问 / 硅基流动等）。配置保存在浏览器 `localStorage`，请求由浏览器直接发向 API 提供商，**不经过任何中转服务器**。

---

## 环境变量

在各 Pages 项目的 **Settings → Environment variables** 中配置：

| 变量名         | 值   | 适用项目 | 说明                                     |
| :------------- | :--- | :------- | :--------------------------------------- |
| `NODE_VERSION` | `22` | 全部     | 与本地 Node 版本一致，避免 Vite 编译异常 |

---

## 优化构建触发：避免全项目更新 (Build Watch Paths)

由于 7 个子应用共享同一个 Git 仓库，默认情况下您的任何一次 Git 提交都会触发这 7 个项目在 Cloudflare 上同时进行构建和部署。为了节省构建额度并加快部署速度，建议配置 **Build watch paths (构建监视路径)**，实现「仅在相关代码发生变更时才触发构建」。

### 配置方法

对于每个 Pages/Workers 项目，在 Cloudflare 控制台中进行如下配置：

1. 进入项目 → **Settings (设置)** → **Builds & deployments (构建与部署)**。
2. 找到 **Build watch paths (构建监视路径)** 区域，点击编辑。
3. 根据项目依赖，在 **Include paths (包含路径)** 中填写该项目自身及所依赖的公共包路径（每行一条）：

| 项目              | 推荐的包含路径 (Include paths)                                                              |
| :---------------- | :------------------------------------------------------------------------------------------ |
| `newmaybe-main`   | `apps/main/*`<br>`packages/content/*`<br>`packages/shared-styles/*`                         |
| `newmaybe-graph`  | `apps/graph/*`<br>`packages/content/*`<br>`packages/shared-styles/*`                        |
| `newmaybe-ai`     | `apps/ai/*`<br>`packages/ai-client/*`<br>`packages/content/*`<br>`packages/shared-styles/*` |
| `newmaybe-lab`    | `apps/lab/*`<br>`packages/shared-styles/*`                                                  |
| `newmaybe-studio` | `apps/studio/*`<br>`packages/ai-client/*`<br>`packages/shared-styles/*`                     |
| `newmaybe-study`  | `apps/study/*`<br>`packages/ai-client/*`<br>`packages/shared-styles/*`                      |
| `newmaybe-club`   | `apps/club/*`<br>`packages/content/*`<br>`packages/shared-styles/*`                         |

所有项目还应包含根目录 `package.json`、`package-lock.json`、`scripts/*` 和 `packages/design-tokens/*` 的变更，避免依赖或共享设计 Token 更新未触发部署。

_注：Exclude paths (排除路径) 保持留空即可。配置完成后，当您提交代码时，Cloudflare 会先检查变动文件是否命中上述包含路径，若没有命中则会自动跳过（Skip）该项目的构建。_

---

## 为什么 Monorepo 能正常编译？

由于项目基于 **npm Workspaces** 构筑，当 Cloudflare Pages 把 **Root directory** 设为 `(留空 / Git 根目录)` 时，构建系统会在整个 Git 仓库根目录执行 `npm clean-install`。这会自动在根目录的 `node_modules/` 下为本地的 `@newmaybe/content`、`@newmaybe/shared-styles` 和 `@newmaybe/ai-client` 包生成软链接（Symlinks）。

当执行各子应用的构建命令（如 `npm run build:graph`，即 `npm run build -w apps/graph`）时，由于 Node.js 会自动往上回溯父级目录的 `node_modules`，各子应用便能够识别并加载所需的本地工作区包，实现零配置跨子域模块解析。

此外，由于构建工作在根目录下进行，Astro 在编译期执行 `glob({ base: '../../packages/content/posts' })` 回溯加载内容时也能正常向上回溯两级加载所有 Markdown 内容。

---

## 主站构建说明（`newmaybe-main`）

主站构建命令 `npm run build` 实际执行的是：

```
astro build && pagefind --site dist
```

`pagefind` 在 Astro 静态产物上建立全文搜索索引，生成 `/pagefind/` 目录。Cloudflare Pages 会将其与其余静态资产一起发布。若构建日志中出现 `pagefind` 相关错误，检查 `pagefind` 是否在 `apps/main/package.json` 中列为 devDependency。

## tools 退役

`apps/tools` 已删除，所有站内入口改为 Studio。发布 Studio 后，在 Cloudflare 为旧主机 `tools.newmaybe.com` 配置永久重定向至 `https://studio.newmaybe.com/`，保留查询参数（`content` 会打开卡片，`tab=formatter` 会打开排版）。确认旧链接可跳转后停止/删除 `newmaybe-tools` 构建项目。此步骤需在 Cloudflare 控制台执行，仓库变更不会自动移除线上项目。

## 免费 AI 防滥用配置（发布前必须完成）

1. 在 Cloudflare Turnstile 创建 widget，允许 `ai.newmaybe.com`、`studio.newmaybe.com`、`study.newmaybe.com`；本地联调时另加 localhost。
2. 在 AI Worker 的变量中设置公开的 `TURNSTILE_SITE_KEY`。
3. 用 `npx wrangler secret put TURNSTILE_SECRET_KEY --config apps/ai/wrangler.toml` 输入对应密钥。不要把密钥提交到仓库。
4. 同时发布 AI、Studio、Study：三个前端从 `/api/security` 获取公开配置，验证通过后发送一次性令牌。服务端校验令牌、来源主机和 `free_ai` action。配置缺失时免费端点返回 503；自带密钥直连不受影响。

`ALLOW_LOCAL_TESTS=true` 只对运行在 localhost/127.0.0.1 的 Worker 生效，线上主机不能以此关闭验证。CORS 不是身份验证，IP/突发限流也不是严格全球额度：[Cloudflare 限流语义](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)。令牌由服务端校验且单次使用：[Turnstile 验证](https://developers.cloudflare.com/turnstile/get-started/server-side-validation/)。

## 构建与部署后检查

CI 根据工作区声明的依赖计算传递影响范围；根脚本、锁文件、测试或 CI 变更触发全部应用。每个受影响应用执行类型检查、构建、JS 预算、浏览器回归，并复用 npm/Vite/Astro 缓存。设计 Token 的生成结果也受 CI 校验。

`npm run smoke -- main https://newmaybe.com` 可验证页面和静态资产。`.github/workflows/deployment-smoke.yml` 在 GitHub 收到成功的 deployment_status 事件时运行；部署 environment 需为应用名（main/graph/ai/lab/studio/study/club），environment_url 需为实际 URL。若 Cloudflare 项目不回传此事件，可在 Actions 中手动运行 Deployment smoke，或在外部部署流水线成功后调用同一脚本。检查不会调用模型或写入用户数据。
