# 🌌 Digital Oasis - 数字绿洲个人博客系统

<p align="center">
  <strong>融合极致视觉动效与舒适阅读体验的现代化全栈个人博客</strong>
</p>

<p align="center">
  <a href="#-核心特性">特性</a> •
  <a href="#-技术栈">技术栈</a> •
  <a href="#-快速开始">快速开始</a> •
  <a href="#-项目结构">项目结构</a> •
  <a href="#️⃣-数据库设计">数据库</a> •
  <a href="#-后台管理">管理后台</a>
</p>

---

## ✨ 项目简介

**Digital Oasis（数字绿洲）** 是一个基于"内容即代码"设计哲学构建的现代化全栈个人博客系统。该项目将轻量化数据库持久层与 Markdown/MDX 本地文章编译引擎完美结合，并配有极具个性的交互式流体粒子背景与双模玻璃拟物态卡片设计。

### 🎯 设计理念

- **极简主义** - 零 UI 框架依赖，纯 Vanilla CSS 实现极致性能
- **内容优先** - Markdown 原生文件管理，版本可控，易于迁移
- **视觉驱动** - Canvas 流体物理特效 + 玻璃拟态设计语言
- **隐私友好** - 哈希头像生成 + 无需注册即可互动评论

---

## 🎨 核心特性

### 1. 🌊 沉浸式视觉体验

| 特性 | 描述 |
|:-----|:-----|
| **Canvas 流体粒子背景** | 响应鼠标手势的交互式流体物理特效，让页面充满生命感 |
| **磨砂玻璃拟物态 UI** | 全站采用 Glassmorphic 设计，配合平滑渐入动效和微悬浮交互 |
| **双模自适应主题** | 原生支持暗黑/明亮模式切换，低/高对比度环境均表现优异 |
| **智能滚动导航** | Fixed 顶栏随滚动状态动态变化，集成实时搜索功能 |

### 2. 📝 强大的文章引擎

```
✅ Markdown/MDX 双核渲染引擎 (gray-matter + marked)
✅ Frontmatter 元数据自动提取与解析
✅ 智能阅读时间预估算法 (字数 / 200 字/分钟)
✅ 动态标签云生成与加权统计
✅ 自动版本备份机制 (编辑时自动创建时间戳快照)
✅ 文章状态管理 (草稿 DRAFT / 已发布 PUBLISHED)
```

**Frontmatter 支持字段：**

```yaml
---
title: "文章标题"
slug: "url-friendly-slug"
date: "2026-01-01T00:00:00Z"
tags: "标签1, 标签2, 标签3"
status: "PUBLISHED"  # 或 DRAFT
summary: "文章摘要描述..."
---
```

### 3. 💬 树形嵌套互动评论区

- **无限级嵌套回复** - 支持多级评论层级结构与点赞操作
- **像素艺术头像** - 基于 IP 及特征哈希自动生成独特的 SVG Pixel Art 头像
- **IP 地理反查** - 安全记录并解析显示评论者的地理位置信息
- **评论审核机制** - 三态流转：待审核 → 已通过 → 已删除

### 4. 📈 精准流量统计系统

- **物理去重 UV 统计** - SQLite 唯一性联合索引，从物理层面规避刷量
- **双模自适应查询引擎** - Prisma ORM 与原生 SQL 降级双模运行
- **实时访问量追踪** - 精确到每篇文章的唯一访客数统计

---

## 🛠️ 技术栈

| 技术 | 版本 | 用途 |
|:-----|:----:|:-----|
| **Next.js** | ^16.2.6 | 全栈应用框架，App Router 驱动 SSR/SSG |
| **React** | ^18.3.1 | UI 组件库，支持并发特性 |
| **TypeScript** | ^5.4.5 | 类型安全的超集语言 |
| **SQLite** | - | 轻量级本地数据库，零配置部署 |
| **Prisma** | ^5.22.0 | 现代 ORM，类型安全的数据库操作 |
| **gray-matter** | ^4.0.3 | YAML Frontmatter 解析器 |
| **marked** | ^12.0.2 | 高性能 Markdown 转 HTML 编译器 |

### 🎨 设计系统

```css
/* 字体方案 */
--font-primary: 'Plus Jakarta Sans', sans-serif;  /* 界面字体 */
--font-serif: 'Lora', serif;                      /* 正文字体 */

/* 配色体系 */
主色调: Teal 松石青 (#0f766e)
背景色: 珍珠白 (#ffffff) / 深空灰
文字阶: Zinc 灰度系统 (900 → 400)

/* 设计语言 */
Glassmorphism (磨砂玻璃拟态)
CSS Variables (变量化设计令牌)
Cubic-bezier 缓动函数 (流畅动效)
```

---

## 🚀 快速开始

### 📋 环境要求

- **Node.js** >= 18.x (推荐 LTS 版本)
- **npm** >= 9.x 或 **yarn** / **pnpm**
- **Git** (可选，用于版本控制)

### 🔧 安装步骤

#### 1️⃣ 克隆项目

```bash
git clone https://github.com/smallhug/personal-blog.git
cd personal-blog
```

#### 2️⃣ 安装依赖

```bash
npm install
# 或
yarn install
# 或
pnpm install
```

> ⚡ 安装完成后会自动执行 `prisma generate` 生成 Prisma Client

#### 3️⃣ 启动开发服务器

```bash
npm run dev
```

启动过程会自动：
- ✅ 检测并初始化 SQLite 数据库 (`prisma/dev.db`)
- ✅ 应用数据库迁移 (Prisma Schema Push)
- ✅ 检测文章目录，若为空则注入欢迎引导文章
- ✅ 启动 Next.js 开发服务器 (热重载)

#### 4️⃣ 访问应用

打开浏览器访问：

- **前台首页**: [http://localhost:3000](http://localhost:3000)
- **管理后台**: [http://localhost:3000/admin](http://localhost:3000/admin)

---

## 📦 可用脚本

| 命令 | 说明 |
|:-----|:-----|
| `npm run dev` | 启动开发服务器 (含数据库初始化) |
| `npm run build` | 生产环境构建优化 |
| `npm run start` | 启动生产服务器 |
| `npm run db:generate` | 手动重新生成 Prisma Client |

---

## 📂 项目结构

```
personal-blog/
├── content/                          # 博客内容目录
│   └── posts/                        #   Markdown/MDX 文章存储
│       ├── *.md                      #     已发布/草稿文章
│       └── backups/                  #     编辑时自动备份的历史版本
│
├── prisma/                           # 数据库配置
│   ├── schema.prisma                 #   数据模型定义 (Comment, PostView, PostIpView)
│   └── dev.db                        #   SQLite 数据库文件 (运行后生成)
│
├── public/                           # 静态资源
│   └── uploads/                      #   用户上传文件存储
│
├── scripts/                          # 辅助脚本
│   └── db-setup.js                   #   数据库冷启动初始化脚本
│
├── src/                              # 源代码根目录
│   ├── app/                          #   Next.js App Router
│   │   ├── layout.tsx                #     根布局 (全局组件挂载点)
│   │   ├── page.tsx                  #     首页 (SSR 数据获取)
│   │   ├── admin/                    #     后台管理路由
│   │   │   └── [[...slug]]/          #       动态路由 (登录/仪表盘/写作/评论)
│   │   ├── api/                      #     RESTful API 接口
│   │   │   ├── admin/                #       管理端 API
│   │   │   │   ├── comments/route.ts #         评论 CRUD 操作
│   │   │   │   ├── dashboard/route.ts#         仪表盘统计数据
│   │   │   │   ├── login/route.ts    #         管理员认证
│   │   │   │   ├── posts/route.ts    #         文章管理接口
│   │   │   │   └── upload/route.ts   #         文件上传处理
│   │   │   ├── comments/route.ts     #       公开评论提交 API
│   │   │   └── views/route.ts        #       访问量记录 API
│   │   ├── posts/[slug]/             #     文章详情页
│   │   │   ├── page.tsx              #       文章渲染 + TOC + 评论
│   │   │   └── page.module.css       #       文章页样式
│   │   └── rss.xml/route.ts          #     RSS 订阅源生成
│   │
│   ├── components/                   #   React 组件库
│   │   ├── admin/                    #     管理端专属组件
│   │   │   ├── pages/               #       页面级组件
│   │   │   │   ├── DashboardPage.tsx #         数据概览面板
│   │   │   │   ├── WritePage.tsx     #         富文本编辑器
│   │   │   │   ├── CommentsPage.tsx  #         评论审核管理
│   │   │   │   └── LoginPage.tsx     #         登录表单
│   │   │   ├── shared/              #       通用管理组件
│   │   │   │   ├── AdminLayout.tsx  #         管理布局框架
│   │   │   │   ├── Sidebar.tsx      #         侧边导航栏
│   │   │   │   ├── HeaderBar.tsx    #         顶部工具栏
│   │   │   │   ├── AdminCard.tsx    #         卡片容器
│   │   │   │   ├── Button.tsx       #         按钮组件
│   │   │   │   ├── Modal.tsx        #         对话框
│   │   │   │   ├── Toast.tsx        #         消息提示
│   │   │   │   └── ErrorBoundary.tsx#         错误边界
│   │   │   ├── AdminEditor.tsx      #     Markdown 编辑器封装
│   │   │   └── icons.tsx            #     图标集合
│   │   │
│   │   ├── Navbar.tsx               #     全局导航栏 (搜索+Logo+GitHub)
│   │   ├── HomeContainer.tsx        #     首页容器 (文章列表+筛选)
│   │   ├── InteractiveFluid.tsx     #     Canvas 流体粒子背景
│   │   ├── FloatingHub.tsx          #     悬浮控制中心 (进度环)
│   │   ├── ThemeToggle.tsx          #     主题切换按钮
│   │   ├── TOC.tsx                  #     文章目录导航
│   │   ├── CommentForm.tsx          #     评论输入表单
│   │   ├── CommentsSection.tsx      #     评论列表展示
│   │   └── ParticleBackground.tsx   #     粒子背景备选方案
│   │
│   ├── lib/                         #   核心工具库
│   │   ├── auth.ts                  #     认证逻辑 (密码哈希+JWT)
│   │   ├── avatar.ts                #     像素艺术头像生成器
│   │   ├── crypto.ts                #     加密工具函数
│   │   ├── date.ts                  #     日期格式化工具
│   │   ├── db.ts                    #     Prisma 客户端单例
│   │   └── posts.ts                 #     文章读取/解析服务
│   │
│   └── styles/                      #   全局样式系统
│       ├── globals.css              #     基础重置+CSS 变量定义
│       ├── admin-design-tokens.css  #     管理后台设计令牌
│       └── admin-interactions.css   #     管理后台交互动效
│
├── next.config.js                   # Next.js 配置 (图片优化等)
├── package.json                     # 项目依赖与脚本
├── tsconfig.json                    # TypeScript 编译选项
└── README.md                        # 项目文档 (本文件)
```

---

## 🗄️ 数据库设计

### ER 关系图

```
┌─────────────────┐       ┌─────────────────┐
│     Comment     │       │    PostView     │
├─────────────────┤       ├─────────────────┤
│ PK id (UUID)    │       │ PK slug (String)│
│ FK parentId     │──────▶│    views (Int)  │
│    postSlug     │       └─────────────────┘
│    content      │
│    nickname     │       ┌─────────────────┐
│    contact      │       │   PostIpView    │
│    avatar (SVG) │       ├─────────────────┤
│    ip           │       │ PK id (UUID)    │
│    location     │       │    slug         │
│    likes        │       │    ip           │
│    status       │       │    createdAt    │
│    createdAt    │       │    (unique)     │
│                 │       └─────────────────┘
│ self-referencing│
│ (replies)      │
└─────────────────┘
```

### 数据模型详情

#### Comment (评论表)

| 字段 | 类型 | 约束 | 说明 |
|:-----|:-----|:-----|:-----|
| `id` | String | PK, UUID | 主键 |
| `parentId` | String | FK, Nullable | 父评论 ID (自关联实现树形结构) |
| `postSlug` | String | Indexed | 所属文章 Slug |
| `content` | String | - | 评论正文 |
| `nickname` | String | - | 昵称 |
| `contact` | String | - | 联系方式 |
| `avatar` | String | - | SVG 像素头像数据 |
| `ip` | String | - | 评论者 IP 地址 |
| `location` | String | - | IP 地理位置解析结果 |
| `likes` | Int | Default: 0 | 点赞数 |
| `status` | String | Enum | PENDING / APPROVED / DELETED |
| `createdAt` | DateTime | Auto | 创建时间戳 |

#### PostView (文章浏览量表)

| 字段 | 类型 | 约束 | 说明 |
|:-----|:-----|:-----|:-----|
| `slug` | String | PK | 文章标识符 |
| `views` | Int | Default: 0 | 总浏览次数 |

#### PostIpView (唯一 IP 访问记录表)

| 字段 | 类型 | 约束 | 说明 |
|:-----|:-----|:-----|:-----|
| `id` | String | PK, UUID | 主键 |
| `slug` | String | Indexed | 文章标识符 |
| `ip` | String | Unique with slug | 访客 IP 地址 |
| `createdAt` | DateTime | Auto | 首次访问时间 |

> **唯一约束**: `(slug, ip)` 联合索引确保同一 IP 对同一文章只计一次 UV

---

## ⚙️ 后台管理系统

### 🔐 访问方式

1. 点击首页顶部 Logo 区域或访问 `/admin`
2. 输入管理员凭据进行身份验证
3. 进入管理仪表盘

### 📊 功能模块

#### 1. 仪表盘 (Dashboard)
- 📈 文章总数 / 已发布 / 草稿统计
- 💬 待审核评论数量提醒
- 👁️ 全站 UV/PV 流量趋势
- 📝 最近活动时间线

#### 2. 文章管理 (Write)
- ✍️ Markdown/MDX 在线编辑器
- 📂 Frontmatter 元数据可视化编辑
- 💾 实时预览与自动保存
- 🔄 版本历史查看与回滚
- 📤 文章状态切换 (发布/撤回草稿)
- 🖼️ 图片上传与管理

#### 3. 评论管理 (Comments)
- 👁️ 评论列表 (全部/待审核/已通过/已删除)
- ✅ 批量审核操作
- 🗑️ 单条/批量删除
- 📊 评论统计与分析

### 🔒 安全机制

- 密码使用不可逆哈希加密存储 ([auth.ts](src/lib/auth.ts))
- Session-based 认证机制
- API 接口权限校验中间件
- CSRF 防护与 XSS 过滤

---

## 🎯 使用指南

### 📝 发布新文章

1. 在 `content/posts/` 目录下创建 `.md` 或 `.mdx` 文件
2. 编写 Frontmatter 元数据和正文内容
3. 保存后刷新页面即可看到新文章（开发模式下热更新）

**示例文章模板：**

```markdown
---
title: "我的第一篇博文"
slug: "my-first-post"
date: "2026-05-19T12:00:00Z"
tags: "技术, 教程, Next.js"
status: "PUBLISHED"
summary: "这是一篇关于...的文章"
---

## 正文标题

这里是你的 Markdown 内容...

\`\`\`typescript
// 代码块会被语法高亮渲染
const hello = 'world';
\`\`\`
```

### 🏷️ 标签系统

- 支持**中英文逗号**分隔的多标签：`tags: "前端, React, TypeScript"`
- 标签会自动提取并在首页展示为可点击的标签云
- 点击标签可筛选相关文章

### 💬 互动评论

访客无需注册即可发表评论：
1. 输入昵称和联系方式（选填）
2. 撰写评论内容
3. 提交后系统自动生成像素头像
4. 评论进入待审核队列，管理员审核后公开显示

---

## 🌐 API 接口文档

### 公开接口

| 方法 | 路径 | 说明 |
|:----:|:-----|:-----|
| GET | `/api/comments?slug={slug}` | 获取文章评论列表 |
| POST | `/api/comments` | 提交新评论 |
| POST | `/api/views` | 记录页面访问 |

### 管理接口 (需认证)

| 方法 | 路径 | 说明 |
|:----:|:-----|:-----|
| POST | `/api/admin/login` | 管理员登录 |
| GET | `/api/admin/dashboard` | 仪表盘统计数据 |
| GET/POST | `/api/admin/posts` | 文章列表/创建 |
| PUT/DELETE | `/api/admin/posts/{id}` | 更新/删除文章 |
| GET | `/api/admin/comments` | 评论列表 |
| PUT | `/api/admin/comments/{id}` | 审核评论 |
| DELETE | `/api/admin/comments/{id}` | 删除评论 |
| POST | `/api/admin/upload` | 文件上传 |

---

## 🎨 自定义配置

### 修改站点元数据

编辑 [src/app/layout.tsx](src/app/layout.tsx):

```typescript
export const metadata = {
  title: '虫虫OvO - 个人空间',
  description: '这里是关于技术探索...',
  keywords: ['Next.js', 'SQLite', 'TypeScript'],
};
```

### 调整配色方案

编辑 [src/styles/globals.css](src/styles/globals.css) 中的 CSS 变量：

```css
:root {
  --color-accent-1: #0f766e;  /* 主题强调色 */
  --bg-primary: #ffffff;       /* 背景色 */
  --text-primary: #18181b;     /* 主文字颜色 */
}
```

### 管理员账户设置

首次运行时需要在数据库中初始化管理员账户，或通过 `/api/admin/login` 接口的逻辑进行配置。

---

## 📦 生产部署

### 构建优化

```bash
# 1. 生产构建
npm run build

# 2. 启动生产服务
npm start
```

### 部署平台兼容性

本项目为零依赖外部服务的架构，可轻松部署至：

- **Vercel** (推荐 - 原生 Next.js 支持)
- **Netlify** (需配置 Build Command)
- **Docker** (自建 Node.js 环境)
- **任意 VPS** (PM2 + Nginx 反向代理)

> **注意**: SQLite 为文件数据库，部署时确保 `prisma/dev.db` 文件的持久化存储路径正确配置。

---

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 开启 Pull Request

---

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

---

## 🙏 致谢

- [Next.js](https://nextjs.org/) - React 全栈框架
- [Prisma](https://www.prisma.io/) - 现代 Node.js ORM
- [SQLite](https://sqlite.org/) - 轻量级数据库引擎
- [marked](https://marked.js.org/) - Markdown 解析器
- [gray-matter](https://github.com/jonschlinkert/gray-matter) - Frontmatter 解析器

---

<p align="center">
  <strong>🌌 Digital Oasis - 让每一次阅读都成为享受</strong>
</p>

<p align="center">
  Built with ❤️ by <a href="https://github.com/smallhug">虫虫OvO</a>
</p>
