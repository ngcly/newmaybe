# 一期一文：独立 HTML 交付与发布

每一期是独立的完整 HTML 作品，不进入 React 阅读器，也不套用固定的动画、音乐或排版模板。框架负责入口、目录、分享元信息和公共导航；设计者负责正文及阅读体验。

## 地址与目录

- `/featured`：本期入口。
- `/featured/archive`：已发布作品目录，按发布日期倒序，包含本期。
- `/featured/issue-001`：某一期的永久地址。
- 社区原文保留 `/articles/:id`，评论、点赞统一在原文进行。也可选用仓库中已公开的主站文章，通过 `sourcePost` 链回真实原文。

```text
featured/
  catalog.json                 # 发布清单
  template/index.html          # 交付骨架，不会部署
  issues/
    issue-001/
      index.html               # 完整页面
      assets/
        cover.webp
        scene.css
        scene.js
        music.mp3
```

首次接入时，复制 `template/index.html` 到 `issues/<slug>/index.html`。每期可以只有一个 HTML，也可以附带本地资源；全部内联不是要求。只复制作品运行所需的文件，设计说明和授权记录放在作品目录外。

## 提供给外派设计者的约定

1. 交付包含 `html lang="zh-CN"`、字符集、viewport、head、body 的完整文档。正文直接写在 HTML 中，关闭 JavaScript 后也能读到文章。
2. 在 head 中保留且只保留一个 `<!-- club:head -->`，公共元信息、base、自托管的站点字体（Noto Serif SC 400/500、Cormorant Garamond 400 正斜体）、设计变量和导航样式在此生成；`var(--serif-cn)`、`var(--serif-en)` 可直接使用（Cormorant 默认旧式数字，用它排期号、日期时加 `font-variant-numeric: lining-nums`，否则 001 会读成 OOI），期内另加的字体也须自托管。不要另写 title、description、canonical、Open Graph、Twitter 元信息或 base。自己的样式放在插槽后。
3. 在 body 中保留且只保留一个 `<!-- club:nav -->`。这里生成“返回雅集 / 原文与讨论 / 本期 / 往期”。导航正常占据文档空间，不覆盖正文。可以按本期风格覆写 `.club-edition-nav`，保留入口、可见焦点和足够的点击区域。
4. 本期文件通过 `./assets/scene.css` 等相对路径引用。框架自动设置 `/featured/<slug>/` 为 base；不要写开发机路径。使用页内锚点时写 `/featured/<slug>#section-id`，不要只写 `#section-id`，以免受 base 影响。
5. 资源名称使用英文、数字、连字符、下划线，允许子目录。支持 CSS、JS/MJS、JSON、常用图片、字体、音视频和 VTT；不发布第二份 HTML、符号链接、隐藏文件或源码工程。不要把密钥、个人信息、草稿放入资源目录。
6. 适配 320px 手机至桌面。正文不能依赖悬停；链接和按钮可用键盘操作，内容不能靠低对比或动画才能读清。
7. 音乐由读者主动开启，提供可见的暂停和音量控制，处理加载失败；禁止有声自动播放。动效提供暂停方式并响应 `prefers-reduced-motion`，减少动态模式下仍可读完正文。音频与大视频按需加载。
8. 使用原创或明确授权的素材。交付时附作者定稿、素材来源、授权范围和资源体积。默认自托管资源，不接第三方追踪脚本。
9. 页面在雅集同源运行：不接入账号逻辑，不读写社区 cookie、localStorage 或发布 API。外派 HTML/脚本必须在合并发布前审查；此框架不是任意文件上传执行服务。未经审查的外部脚本应另行隔离托管。

这是交付接口，不是视觉模板。布局、场景、动画技术、音乐与字体均可按每篇文章独立设计。公共设计变量可直接使用；需新增全站颜色时遵循仓库的 design-tokens 规则。

## 清单示例

```json
{
  "currentIssue": "issue-001",
  "issues": [
    {
      "slug": "issue-001",
      "number": "001",
      "title": "经作者确认的文章标题",
      "author": "作者笔名",
      "description": "这一期的编者推荐语。",
      "publishedAt": "2026-10-15",
      "articleId": "club-1",
      "articleRevision": "v3",
      "status": "published",
      "cover": "assets/cover.webp"
    }
  ]
}
```

- `articleId` 与 `sourcePost` 必须且只能填写一个。社区投稿使用 `articleId`；主站文章使用 `sourcePost`（例如 `rainy_alley_remembered`），构建会检查源文件存在、`draft: false` 且标题一致。主站原文不创建社区副本、不读取 D1，也没有虚构的评论入口；更改或撤下主站原文时须同步调整精选清单并重新部署 Club。
- `slug` 发布后保持不变；不能使用保留名称 `archive` 或 `common`。
- `cover` 可选；提供时必须指向期内真实文件，目录卡片和分享信息会使用它。
- `status: "draft"` 的整期 HTML 和资源均不会进入构建产物，不能通过公开链接预览。未列入清单的目录也不会发布。
- `currentIssue` 指向已发布期；设为 `null` 时本期入口显示筹备状态，往期仍可浏览。
- `publishedAt` 是显示与排序日期，**不是定时发布开关**。设置为 published 并部署即公开，即使日期在未来。
- 原文与精选作品分别保存。`articleRevision` 记录作品采用的定稿版本；原文更新后需要明确决定是否修订作品，框架不会自动替换作品正文。

## 本地验收与发布

1. 添加作品文件与清单，核对已审核公开的原文 ID、作者授权和定稿版本。`articleRevision` 建议填写作者中心的已发布版本号，例如 `v3`。
2. 草稿验收时仅在本地临时设为 published，运行 `npm run dev:club`，打开 `http://localhost:4328/featured/<slug>`。不要把临时发布状态提交到发布分支；没有仅凭 URL 保密的在线草稿预览。
3. 检查手机/桌面、深浅色背景下导航、键盘、减少动态效果、音乐关闭/开启/暂停、刷新直达、原文链接、图片与音频路径及控制台错误。
4. 确认发布后，将其设为 published，并更新 `currentIssue`。旧期维持 published 即自动出现在目录中。
5. 运行 `npm run build:club`。缺少 HTML、插槽、封面、重复 slug 或无效本期指向会阻止构建。再运行 `npm run preview -w apps/club` 检查正式页面。
6. 按根目录 `DEPLOY.md` 部署 Worker 与 assets。构建会生成独立 HTML；新增/切换期刊不新增 D1 迁移，但作者管理的 `0003` 迁移必须已应用。Worker 会检查原文是否公开，撤稿后整期 HTML 和资源均返回 404；静态目录卡片需要随下次部署调整。新增/切换期刊都需要重新构建和部署。Vite 预览只验证视觉和资源，公开权限需通过 Wrangler 联调。

首期收录主站公开作品《记忆里的雨巷》，使用独立雨巷插画、可暂停落雨和读者手动开启的程序化雨声与轻柔配乐，作品说明见 [首期制作记录](issue-001.md)。第二期《那年，那人，那条路》为当前本期：诗以竖排题字写进固定的整幅画面，字如落叶飘落成墨，滚动沿路前行，读者拂过画面即起风，另有手动开启的程序化风声与拨弦，作品说明见 [第二期制作记录](issue-002.md)。清单为空时仍显示筹备页，不会发布模板。
