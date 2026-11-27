# 版本维护与发布

Status: current

适用于本仓库源码、GitHub Release 与 GHCR 镜像。发布行为以
[`docker-publish.yml`](../../.github/workflows/docker-publish.yml) 为准。

## 维护版本

1. 检查 `git status --short` 和差异，确定本次版本包含的改动。
2. 修改根目录 [`VERSION`](../../VERSION)。局部修复或兼容的体验改进通常递增补丁号，例如 `3.3.6` → `3.3.7`。
3. 将 [`CHANGELOG.md`](../../CHANGELOG.md) 的相关 Unreleased 条目移入 `## 版本号 - YYYY-MM-DD`，保留空的 Unreleased 供后续开发使用。同一版本按 `[新增]`、`[优化]`、`[修复]` 排序。
4. 私有 Python、Vue 包的元数据版本保持 `0.0.0`，无需修改包版本或锁文件。后端和控制台均读取根目录 `VERSION`；控制台需重新构建才能更新内嵌版本。

## 验证与发布

前置条件：Python 3.13+、uv、Node.js 22、npm，以及仓库写权限；GitHub Actions 需能写入 Releases 和 Packages。发布前确认相关功能验证结果，并检查暂存内容不包含真实数据、密钥、缓存或构建产物。

1. 在仓库根目录运行与 CI 一致的基础检查，预期全部退出成功：

   ```bash
   uv sync --frozen
   uv run python -m compileall -q api contracts services utils main.py
   npm --prefix web-vue ci
   npm --prefix web-vue run build
   git diff --check
   ```

   这些检查不代替相关功能回归。若本地测试入口引用了未随仓库分发的 `tests/` 或 `web-vue/tests/` 文件，应如实记录测试缺口，不能将缺失当作通过。

2. 审查并提交本次全部必要改动，确保版本号、更新说明与功能代码位于同一提交。正式发布前必须获得提交、打标签、推送与发布的相应授权；仅修改版本文件不会自动上线。
3. 在已验证、已提交且工作区干净的版本上创建并推送标签。以下为 **Bash** 示例，需在确认发布后执行：

   ```bash
   version="$(tr -d '\r\n' < VERSION)"
   git tag -a "v${version}" -m "发布 v${version}"
   git push origin HEAD
   git push origin "v${version}"
   ```

   标签必须精确等于 `v` 加 `VERSION` 内容。推送 `main` 本身不会触发该发布工作流；推送 `v*` 标签会触发校验、Release 和镜像任务。PR 与在分支上手动运行仅执行验证；手动运行若选择标签引用，也会满足标签发布条件。

4. 在 GitHub Actions 确认 `verify`、`release-bundle`、`docker` 均成功。后两项独立执行，不能用其中一项成功推断另一项已发布。核对：
   - GitHub Release 有对应版本说明、`chatgpt2api-app.tar.gz` 和 `checksums.txt`。
   - GHCR 有对应版本镜像；当前仓库位置为 `ghcr.io/why-qw1ko/chatgpt2api`，构建平台为 `linux/amd64` 与 `linux/arm64`。

## 更新已部署服务

升级前备份数据库、启动配置和需要保留的文件。PostgreSQL 与 WebDAV 需单独备份。数据库选择与存储边界见 [ADR 0004](../adr/0004-use-one-application-database-with-domain-repositories.md)。

- **从本仓库源码构建**：按 [README 部署章节](../../README.md#部署本仓库) 更新源码并重新构建；使用 PostgreSQL overlay 时保留相同的 Compose 参数。
- **发布镜像部署**：确认目标镜像存在后，设置 `CHATGPT2API_IMAGE=ghcr.io/why-qw1ko/chatgpt2api:<tag>`，再对实际使用的 Compose 配置执行 `pull` 和 `up -d`。默认基础 Compose 仍指向上游镜像，必须显式选择本仓库镜像并核对代理配置。
- **受管容器在线更新**：点击控制台右上角版本按钮，检查并安装更新。需要独立挂载的 `/app` 运行目录；`docker-compose.local.yml` 未提供该卷，应通过重新构建更新。更新来源为本仓库的 GitHub Releases。

更新后核对控制台版本及 `GET /version` 的 `version` 字段，并检查登录、主要页面和业务请求。版本检查有缓存，必要时手动刷新。

## 失败处理与回滚

- 标签与 `VERSION` 不一致时，CI 会在构建前失败；修正发布内容后使用新的正确版本标签，不重写已经发布的标签。
- Release 或镜像任务失败时，检查对应日志与已有产物，修复后按需重跑失败任务；产物未齐全前不能宣布整个版本发布成功。
- 部署回滚由部署者选择此前验证的源码或镜像版本，并按同一种部署方式重新构建或创建容器。不要用 `down -v` 做普通升级或回滚。
- 代码回滚不会回滚数据库或外部文件；涉及不兼容数据变更时，须按该版本迁移说明和备份恢复，不能仅降低版本号。
