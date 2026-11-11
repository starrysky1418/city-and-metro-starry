# 部署说明 · Starry 社区版

本仓库（`starrysky1418/city-and-metro-starry`）存放的是**已构建好的静态站点成品**，不是源码。
`index.html` 在仓库根目录，游戏资源在 `js/ css/ img/ licenses/`，没有打包步骤、没有 `package.json`，
浏览器直接打开 `index.html` 即可游玩，存档保存在浏览器 `localStorage`。

## 访问地址

| 用途 | 地址 | 当前状态（2026-11-11） |
|---|---|---|
| 游戏主页（GitHub Pages） | https://starrysky1418.github.io/city-and-metro-starry/ | 已上线，返回 200，可直接游玩 |
| 游戏主页（Cloudflare Pages） | https://city-and-metro-starry.pages.dev/ | **尚未创建项目**：该域名 DNS 不存在，需在 Cloudflare 建立同名项目后生效 |
| 介绍与更新日志 | 上述任一域名 + `/site/` | 随仓库一起发布 |
| 更新日志（纯文本） | 上述任一域名 + `/CHANGELOG.md` | 随仓库一起发布 |
| 源码仓库 | https://github.com/starrysky1418/city-and-metro-starry | 分支 `main` |

## 让 `.pages.dev` 域名生效（二选一）

### A. 连接 GitHub 仓库（推荐，最适合「连到我的仓库」）

1. 打开 Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**。
2. 授权 GitHub 并选择仓库 `starrysky1418/city-and-metro-starry`，分支选 `main`。
3. **项目名必须填 `city-and-metro-starry`** —— Pages 会据此分配 `city-and-metro-starry.pages.dev`。
4. 构建设置：
   - Framework preset：`None`
   - Build command：**留空**（仓库里已经是成品，无需构建）
   - Build output directory：**留空或填 `/`**（`index.html` 就在仓库根）
5. Save and Deploy。之后每次 `git push` 到 `main` 都会自动重新发布。

> 若项目名已被占用，只能换名，域名也会随之改变；此时需同步更新 `wrangler.jsonc` 的 `name`
> 与 `site/` 里介绍站的试玩链接。

### B. 命令行直传 / GitHub Actions 直传

- **本机直传**（需 `wrangler login` 或 API Token）：在源码根目录执行
  `npx wrangler pages deploy --project-name city-and-metro-starry`，
  `wrangler.jsonc` 已把 `pages_build_output_dir` 指向 `./dist`。
- **自动直传**：仓库内已有 `.github/workflows/deploy-pages.yml`。默认**关闭**，启用方式：
  1. Cloudflare → My Profile → API Tokens → 创建自定义 Token，权限为
     `Account → Cloudflare Pages → Edit`（以及读取账户信息的必要权限）。
  2. 在 GitHub 仓库 Settings → Secrets and variables → Actions 添加
     `CLOUDFLARE_API_TOKEN`、`CLOUDFLARE_ACCOUNT_ID`。
  3. 添加 Repository Variable `CF_DIRECT_UPLOAD = true`。
  
  未设置该变量时工作流会整体跳过，不会报错，也不会和 A 方案重复部署。
  采用 A 方案后请保持此变量关闭。

`.assetsignore` 保证直传时不会把 `.git/`、`.github/` 等仓库管理文件当成静态资源上传。

## 发布前校验

在源码目录执行：

```bash
node scripts/verify-game.mjs            # 源码：版本 2.5.1 / 15 张地图 / 107 个文件
node scripts/verify-game.mjs --dist     # 发布目录与源码一致
node scripts/build.mjs                  # 可选：重建 dist（保留 .git / site / .github）
```

`scripts/build.mjs` 只会重写游戏资产和 `404.html`、`_headers`、`CHANGELOG.md`、`README.md`、
`.nojekyll`、`game-manifest.json`；`.git`、`site/`、`.github/` 与部署说明不会被删除。

## 变更同步约定

- 版本内容以根目录 `CHANGELOG.md` 为准，构建时自动同步为发布仓库的 `README.md`。
- 介绍站的 `site/changelog.html` 须与 `CHANGELOG.md` 逐条对应；版本号、发布日期、
  「已发布 / 待上线」状态三处必须一致。
- 上线后把 `CHANGELOG.md` 中的部署状态更新为实际访问地址。

## 许可与署名

原作由 VinsonFung 开发（<https://city-and-metro.pages.dev>，
<https://github.com/VinsonFung/city-and-metro>）。Starry 为**非商业社区修改版**，
严禁商业使用；发布时须保留原作者署名、原版链接、`LICENSE.txt` 与
`THIRD_PARTY_NOTICES.txt`（含 OpenStreetMap ODbL 署名）。
