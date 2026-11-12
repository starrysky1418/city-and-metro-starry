# 部署说明 · Starry 社区版

本仓库（`starrysky1418/city-and-metro-starry`）存放的是**已构建好的静态站点成品**，不是源码。
`index.html` 在仓库根目录，游戏资源在 `js/ css/ img/ licenses/`，没有打包步骤、没有 `package.json`，
浏览器直接打开 `index.html` 即可游玩，存档保存在浏览器 `localStorage`。

## 访问地址（2026-11-11 已验证）

| 用途 | 地址 | 状态 |
|---|---|---|
| 游戏主页（正式） | https://city-and-metro-starry.pages.dev/ | 已上线，HTTP 200，打开即玩 |
| 游戏主页（镜像） | https://starrysky1418.github.io/city-and-metro-starry/ | 已上线，GitHub Pages 随 `main` 自动构建 |
| 介绍站首页 | 上述任一域名 + `/site/` | 已上线 |
| 更新日志（网页） | 上述任一域名 + `/site/changelog.html` | 已上线（Pages 会 308 到 `/site/changelog`，自动跟随） |
| 更新日志（纯文本） | 上述任一域名 + `/CHANGELOG.md` | 已上线 |
| 源码 / 发布仓库 | https://github.com/starrysky1418/city-and-metro-starry | 分支 `main` |

Cloudflare Pages 项目 `city-and-metro-starry` 于 2026-11-11 创建，生产分支为 `main`，
采用 **Direct Upload**（命令行直传）方式部署；`_headers` 的缓存与安全响应头已生效，
未知路径返回 404。

## 保持站点更新

### 方式 A：启用仓库内 Actions 自动部署（推荐，等价于「连到仓库」）

项目已创建，不能原地改成 Git 集成；用仓库自带的 `.github/workflows/deploy-pages.yml`
即可做到「push 到 main → 自动重新部署」。工作流默认关闭，启用三步：

1. Cloudflare Dashboard → **My Profile → API Tokens → Create Token**，用
   **Edit Cloudflare Pages** 模板创建自定义 Token（权限 `Account → Cloudflare Pages → Edit`，
   范围选你的账户）。
2. GitHub 仓库 → **Settings → Secrets and variables → Actions** 添加两个 Secrets：
   - `CLOUDFLARE_API_TOKEN` = 上一步的 Token
   - `CLOUDFLARE_ACCOUNT_ID` = `19f3a2049787450e17422394d670ca17`
     （也可在 Cloudflare Dashboard 任意页面 URL 的 `/dash.cloudflare.com/<这一串>/` 找到）
3. 同一页面的 **Variables** 页签添加 Repository Variable `CF_DIRECT_UPLOAD = true`。

设置完成后，每次 `git push` 到 `main` 都会执行
`wrangler pages deploy . --project-name city-and-metro-starry --branch main`，站点自动更新。
未设置该变量时工作流整体跳过，不会报错，也不会产生重复部署。

### 方式 B：本机手动重新部署

本机已通过 `wrangler login` 完成 OAuth 授权，在源码根目录执行：

```bash
npx wrangler pages deploy dist --project-name city-and-metro-starry --branch main
```

`wrangler.jsonc` 已把项目名设为 `city-and-metro-starry`、`pages_build_output_dir` 设为 `./dist`。
`.assetsignore` 保证直传时不会把 `.git/`、`.github/` 等仓库管理文件当成静态资源上传。

> 若日后想改成 Cloudflare 的 **Connect to Git** 集成，需要先在 Dashboard 删除当前项目，
> 再用同名重新创建并绑定 GitHub 仓库；同名项目不能并存，重建期间域名会短暂不可用。
> 对当前用途而言，方式 A 已经足够，不建议重建。

## 发布前校验

在源码目录执行：

```bash
node scripts/verify-game.mjs            # 源码：版本 2.7.0 / 19 张地图 / 119 个文件
node scripts/verify-game.mjs --dist     # 发布目录与源码一致
node scripts/map-pipeline.mjs tj       # 推荐：轻量检查 → 许可 → 指纹 → 清单 → 零删除同步 dist → 双端校验
node scripts/build.mjs                  # 可选：重建 dist（保留 .git / site / .github）
```

`scripts/build.mjs` 只会重写游戏资产和 `404.html`、`_headers`、`CHANGELOG.md`、`README.md`、
`.nojekyll`、`game-manifest.json`；`.git`、`site/`、`.github/` 与部署说明不会被删除。

部署后建议抽查：首页、`/site/changelog.html`、`js/data_ny.js`、`js/geo_ny.js`、
`js/data_tj.js`、`js/geo_tj.js`、`site/assets/promo.mp4`，以及一个不存在的路径应返回 404。

## 2026-11-12 · Starry 版 1.2 更新状态

游戏内引擎版本已对齐原版 **2.7.0**（社区发行版版本独立为 1.2，存档结构未变），
当前发布成品为 **19 张地图 / 119 个文件**：新增天津（2004）、成都、重庆与伦敦，
整合新版线路图回放、城市总评与城市特色机制库，并完成全图史实／票价／热点复核与绘制性能优化。
详细内容见 `CHANGELOG.md` 与 `/site/changelog.html`。访问地址与部署方式不变。

## 变更同步约定

- 版本内容以根目录 `CHANGELOG.md` 为准，构建时自动同步为发布仓库的 `README.md`。
- 介绍站的 `site/changelog.html` 须与 `CHANGELOG.md` 逐条对应；版本号、发布日期、
  「已上线 / 待上线」状态以及访问地址必须四处一致（CHANGELOG、README、网页日志、首页摘要）。
- 站点内容变更后需同时 `git push`（更新 GitHub Pages 镜像）与重新部署 Cloudflare Pages
  （方式 A 自动完成，方式 B 需手动执行）。

## 许可与署名

原作由 VinsonFung 开发（<https://city-and-metro.pages.dev>，
<https://github.com/VinsonFung/city-and-metro>）。Starry 为**非商业社区修改版**，
严禁商业使用；发布时须保留原作者署名、原版链接、`LICENSE.txt` 与
`THIRD_PARTY_NOTICES.txt`（含 OpenStreetMap ODbL 署名）。
