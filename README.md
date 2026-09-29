# 🌌 Digital Oasis - smallhug的数字空间个人博客

<p align="center">
  <strong>融合极客视觉动效与舒适阅读体验的纯静态个人博客（基于 Astro + GitHub Pages）</strong>
</p>

---

## ✨ 架构与特性

本博客采用 **Astro 纯静态网站架构**，天然适配 **GitHub Pages** 免费托管与 **GitHub Actions** 自动化部署，实现零服务器费用、零运维负担：

- **极速纯静态构建**：Astro 群岛架构（Islands Architecture），文章页面默认 0 JS 输出，首屏加载极致，SEO 满分。
- **Canvas 流体力学粒子背景**：基于 HTML5 Canvas 2D 物理粒子跟随鼠标移动，灵动优雅。
- **毛玻璃极简美学**：纯原生 CSS 设计令牌（Design Tokens），支持深色/浅色模式平滑切换且无闪烁。
- **Giscus 无服务器评论**：基于 GitHub Discussions 的互动评论，支持 GitHub 账号登录、表情点赞与主题联动。
- **文章排版与体验**：
  - Shiki 编译期语法高亮
  - KaTeX LaTeX 数学公式渲染
  - 动态大纲目录（TOC）与滚动高亮
  - 代码块一键复制按钮
  - 圆环滚动进度指示器与平滑返回顶部
  - 不蒜子（Busuanzi）页面与全站访问量统计
  - 动态 RSS 2.0 订阅源 (`/rss.xml`)

---

## 🚀 写作与本地调试

### 1. 本地开发
```bash
npm install
npm run dev
# 浏览器访问 http://localhost:4321
```

### 2. 撰写新文章
直接在 `src/content/posts/` 目录下新建 `.md` 文件，设置 Frontmatter 即可：

```yaml
---
title: "你的文章标题"
date: "2026-09-30T12:00:00.000Z"
tags: "技术, 生活"
status: "PUBLISHED"
summary: "文章的一句话简短摘要..."
---

你的正文内容...
```

### 3. 本地打包验证
```bash
npm run build
npm run preview
```

---

## 🌐 部署至 GitHub Pages

项目已内置 GitHub Actions 工作流文件 `.github/workflows/deploy.yml`。

### 部署步骤：
1. **推送代码**到 GitHub 仓库的 `main` 分支：
   ```bash
   git add .
   git commit -m "feat: migrate to Astro static site for GitHub Pages"
   git push origin main
   ```
2. **在 GitHub 仓库开启 Pages 部署**：
   - 进入 GitHub 仓库 `Settings` -> `Pages`
   - 将 **Build and deployment > Source** 设置为 **GitHub Actions**
3. **绑定自定义域名（可选）**：
   - 在 `public/` 目录下创建 `CNAME` 文件，填入你的域名（例如 `blog.yourdomain.com`），或者在 GitHub 仓库 Pages 设置页中的 **Custom domain** 输入并保存。
4. **启用 Giscus 评论区**：
   - 在仓库的 `Settings` -> `Features` 中勾选开启 **Discussions**。
   - 访问 [giscus.app](https://giscus.app/zh-CN) 获取你的 `data-repo-id` 和 `data-category-id`，填入 `src/components/GiscusComments.astro` 即可。
