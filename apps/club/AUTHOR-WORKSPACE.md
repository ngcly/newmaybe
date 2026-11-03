# 作者管理与 Gmail 登录配置

## 产品与数据边界

- `/me`：邮箱登录、公开笔名、多篇云端文稿、编辑、预览、投稿、版本记录、撤稿。
- `/admin`：管理员阅读全文、通过审核或附意见退回。
- 阅读不需要登录；文章必须由登录作者创建。文章归属由服务端会话确定，不接受客户端提交的作者 ID 或署名作为权限依据。
- 作者笔名与邮箱分开：邮箱只出现在本人资料，公开文章采用审核发布时的笔名快照。更新笔名后，旧文章不会无声改署名；重新提交并审核后更新。
- 待审核稿不可直接改写，需要先撤回审核。已发布文章的修订审核期间，旧版继续公开；通过后更新原地址，保留评论和点赞。
- 撤回公开文章立即关闭原文、列表、互动入口及关联精选作品与资源的访问。重新公开要重新投稿审核。精选静态目录中的封面卡片需在下次发布时调整；公开作品正文不会因目录尚未更新继续可读。浏览器已下载或读者自行保存的内容无法远程收回。
- 私人文稿列表分页加载，预览/编辑才读取全文。最近 30 次投稿快照可在界面查看，数据库保留全部投稿记录；草稿每次击键不会生成永久历史版本。
- 自动保存采用版本号与串行写入；冲突时停止覆盖，允许导出文字或保留本地备份后重新比较。备份按账号和文稿分开，不能充当登录凭据。

## D1 迁移

`0003_author_workspace.sql` 新增作者、验证码挑战、登录会话、文稿、投稿快照和公开文章视图。`articles` 保存审核后的公开版本，私有稿件在 `manuscripts`；公共查询仅读取 `published_articles`。

没有旧匿名文章认领或兼容流程；旧表中的数据不删除，但不关联新作者文稿的记录不会公开。正式站不再自动填充样例文章或评注，浏览器也不会用示例正文或缓存正文替代已撤回文章。示例内容仅供测试使用。

```bash
# 新库先建立基础表；已有基础表执行此命令同样不会清空数据。
npx wrangler d1 execute newmaybe-club-db --remote --config apps/club/wrangler.toml --file=apps/club/schema.sql
npx wrangler d1 migrations apply newmaybe-club-db --remote --config apps/club/wrangler.toml
```

本地测试将 `--remote` 改为 `--local`，并可用 `--persist-to /tmp/your-club-test-db` 隔离数据。迁移已在隔离本地数据库验证；修改代码不会自动执行远程迁移。

## Gmail 发信

当前 `wrangler.toml` 配置：

```toml
[vars]
CLUB_ADMIN_EMAILS = "ningcly00@gmail.com"
GMAIL_SENDER = "ningcly00@gmail.com"
```

管理员角色按已验证邮箱与服务端白名单判断，不存在“第一个注册者自动成为管理员”。多个管理员可使用逗号分隔。这个邮箱同时作为验证码发信邮箱。

采用 [Gmail API 的邮件发送接口](https://developers.google.com/workspace/gmail/api/guides/sending)，发信账号通过 [OAuth 离线授权](https://developers.google.com/identity/protocols/oauth2/web-server#offline) 提供 refresh token。只申请 `https://www.googleapis.com/auth/gmail.send` 范围。读者使用自己的任意邮箱接收验证码，不需要 Google 账号；Google 授权仅由站主对发信邮箱完成。

配置步骤：

1. 在 Google Cloud 项目启用 Gmail API，配置 OAuth 同意屏幕并创建 OAuth 客户端。
2. 按 Google 离线授权流程，用 `ningcly00@gmail.com` 授权 `gmail.send`，获取 client ID、client secret 和 refresh token。使用 OAuth Playground 调试时须启用自己的 OAuth 客户端，按其要求配置回调地址，不使用 Playground 的共享凭据作为长期部署凭据。
3. 正式发信前检查 OAuth 应用的发布状态。Google 对 External + Testing 应用签发的 Gmail 范围 refresh token 通常只有 7 天有效期，不能把测试授权当作长期配置；密码变更、撤销授权等也可能使 token 失效，详见 [Google refresh token 生命周期](https://developers.google.com/identity/protocols/oauth2#expiration)。
4. 用 Wrangler 的交互输入写入以下 secrets，不写入 Git、不放进前端环境变量、不粘贴到聊天：

```bash
npx wrangler secret put AUTH_SECRET --config apps/club/wrangler.toml
npx wrangler secret put GMAIL_CLIENT_ID --config apps/club/wrangler.toml
npx wrangler secret put GMAIL_CLIENT_SECRET --config apps/club/wrangler.toml
npx wrangler secret put GMAIL_REFRESH_TOKEN --config apps/club/wrangler.toml
```

`AUTH_SECRET` 使用至少 32 字符的随机值，可在本机用 `openssl rand -hex 32` 生成。它用于验证码摘要，不是 Gmail 密码。本地开发复制 `.dev.vars.example` 为 `.dev.vars` 后填写同样四项；该文件已被 Git 忽略。

未配置凭据时，发送验证码明确返回服务未配置，不会伪造发送成功、回显验证码或启用免验证登录。真实投递需要凭据配置完毕后验收；自动测试仅模拟 Gmail 响应，不发送真实邮件。

## 登录与发布规则

- 六位随机验证码，10 分钟有效、单次使用，每个挑战最多 5 次验证尝试。
- 同邮箱发信至少间隔 60 秒，每小时最多 5 次；同来源每小时最多 15 次发信和 60 次验证请求；全站每天最多 200 次发信请求。限额按固定时间窗口计算，失败请求也会占用额度。
- 会话为随机 token，数据库仅保存 token 摘要，30 天有效；退出即撤销。生产 cookie 使用 `__Host-` 前缀、HttpOnly、Secure、SameSite=Lax，浏览器不把登录 token 放在 localStorage。
- 所有写请求检查同源及 `X-Club-Request`，跨域来源不开放 CORS。
- 审核与稿件状态变更使用 D1 原子 batch 和版本校验，避免审核旧稿或只写入半份公开文章。

## 部署与验收

1. 应用数据库迁移、配置 Gmail 与认证 secrets。
2. `npm run build:club`，再使用现有 Worker 配置部署。
3. 保持 `ASSETS` 绑定及 `run_worker_first` 中的 `/api/*`、文章路径、精选路径、`/me`、`/admin`。
4. `/me` 与 `/admin` 必须通过 Worker 联调。Vite preview 仅有前端和静态精选，不能验证登录、云端保存或审核。
5. 用普通作者账号走通“新建 → 保存 → 重新打开 → 投稿”，用管理员账号“审阅 → 通过/退回”，再验证修订不提前公开、撤稿后原文和精选返回 404。

代码构建、测试与本地 D1 验证不会修改线上数据或自动部署。
