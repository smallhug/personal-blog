import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const postsDirectory = path.join(process.cwd(), 'content/posts');

// 确保目录存在并在首次启动时自动写入欢迎文章，以防空数据报错
export function ensureDirectoryExists() {
  if (!fs.existsSync(postsDirectory)) {
    fs.mkdirSync(postsDirectory, { recursive: true });
    
    // 写入第一篇极具质感的欢迎文章
    const seedPost = `---
title: "虫虫OvO的数字空间：科技与艺术的重构边界"
slug: "technology-and-art-oasis"
date: "${new Date().toISOString()}"
tags: "生活, 科技, 艺术"
status: "PUBLISHED"
summary: "欢迎来到我的个人博客！这是一篇测试引导文章，详细介绍了当前博客的核心技术选型以及我对极客美学的思考。"
---

## 🌌 欢迎来到数字绿洲

当您读到这一行文字时，意味着博客系统的本地 SQLite 数据库与文件加载服务已经彻底跑通了！

在这个博客中，我致力于融合 **极致的视觉动效** 与 **舒适的阅读体验**。所有的内容采用 **Markdown/MDX** 双核排版，直接以文件形式存储在代码仓库中，真正实现“内容即代码”。

### 🛠️ 技术选型与极客美学
- **前端核心**：Next.js App Router 驱动，极致加载。
- **视觉设计**：Vanilla CSS 原生手绘磨砂玻璃质感配合 Canvas 流体粒子。
- **数据引擎**：SQLite + Prisma ORM，轻量、安全、优雅。
- **互动评论**：哈希加密自动生成的**像素抽象头像**，带有离线 IP 地理反查。

### 💻 行内与代码块排版演示
下面是标准的 TypeScript 代码高亮与表格渲染测试：

\`\`\`typescript
interface Post {
  title: string;
  slug: string;
  readingTime: number;
}

const welcome = (user: string): string => {
  return \`Welcome to my digital oasis, \${user}!\`;
};
\`\`\`

| 功能模块 | 运行状态 | 技术方案 |
| :--- | :--- | :--- |
| **视觉层** | 🟢 卓越运行 | Canvas 粒子 + 玻璃感 |
| **存储层** | 🟢 完美连接 | Prisma + SQLite 本地 |
| **文章层** | 🟢 编译就绪 | Markdown/MDX 文件读取 |

您可以点击右上角的**“写作后台”**按钮，撰写您的第一篇文章，或者对本文进行回复评论！
`;
    fs.writeFileSync(path.join(postsDirectory, 'technology-and-art-oasis.md'), seedPost, 'utf-8');
  }
}

export interface PostMeta {
  title: string;
  slug: string;
  date: string;
  tags: string[];
  status: 'DRAFT' | 'PUBLISHED';
  summary: string;
  readingTime: number;
}

function parseReadingTime(content: string): number {
  const plainText = content.replace(/[#*`~\[\]\(\)\-\r\n\s|]+/g, '');
  return Math.max(1, Math.ceil(plainText.length / 200));
}

function parseTags(tags: unknown): string[] {
  if (!tags) return [];
  return typeof tags === 'string'
    ? tags.split(/[,，]/).map((t) => t.trim()).filter(Boolean)
    : Array.isArray(tags) ? tags : [];
}

function buildPostMeta(data: Record<string, unknown>, slug: string, content: string): Pick<PostMeta, 'title' | 'slug' | 'date' | 'tags' | 'status' | 'summary' | 'readingTime'> {
  return {
    title: (data.title as string) || '无标题文章',
    slug: (data.slug as string) || slug,
    date: (data.date as string) || new Date().toISOString(),
    tags: parseTags(data.tags),
    status: ((data.status as string) || 'DRAFT') as 'DRAFT' | 'PUBLISHED',
    summary: (data.summary as string) || content.slice(0, 120).replace(/[#*`~]/g, '') + '...',
    readingTime: parseReadingTime(content),
  };
}

// 1. 获取所有博客文章列表
export function getSortedPostsData(): PostMeta[] {
  ensureDirectoryExists();
  
  const fileNames = fs.readdirSync(postsDirectory);
  const allPostsData = fileNames
    .filter((fileName) => fileName.endsWith('.md') || fileName.endsWith('.mdx'))
    .map((fileName) => {
      const slug = fileName.replace(/\.mdx?$/, '');
      const fullPath = path.join(postsDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');

      // 使用 gray-matter 解析 Frontmatter
      const { data, content } = matter(fileContents);

      return buildPostMeta(data, slug, content);
    });

  // 按日期降序排列
  return allPostsData.sort((a, b) => (a.date < b.date ? 1 : -1));
}

// 2. 根据 Slug 获取单篇文章的正文与元数据
export function getPostData(slug: string) {
  ensureDirectoryExists();
  
  let fullPath = path.join(postsDirectory, `${slug}.md`);
  if (!fs.existsSync(fullPath)) {
    fullPath = path.join(postsDirectory, `${slug}.mdx`);
  }

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    meta: buildPostMeta(data, slug, content),
    content,
  };
}

// 3. 统计全站所有的主题分类标签云 (Tag Cloud)
export function getTagCloud() {
  const posts = getSortedPostsData().filter(p => p.status === 'PUBLISHED');
  const tagCounts: Record<string, number> = {};

  posts.forEach((post) => {
    post.tags.forEach((tag) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  return Object.entries(tagCounts).map(([name, count]) => ({
    name,
    count,
  }));
}
