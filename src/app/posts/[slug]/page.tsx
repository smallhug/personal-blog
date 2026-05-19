import React from 'react';
import { notFound } from 'next/navigation';
import { marked } from 'marked';
import { getPostData } from '@/lib/posts';
import TOC from '@/components/TOC';
import { formatToChineseDateTime } from '@/lib/date';
import CommentsSection from '@/components/CommentsSection';
import CodeCopyButton from '@/components/CodeCopyButton';
import { db } from '@/lib/db';
import { headers } from 'next/headers';
import styles from './page.module.css';

interface PostPageProps {
  params: Promise<{
    slug: string;
  }>;
}

export const revalidate = 0;

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;

  // 1. 根据 Slug 从本地文件加载并编译数据
  const post = getPostData(slug);

  // 2. 如果文章不存在，或者文章是草稿状态且非后台访问，返回 404
  if (!post || post.meta.status !== 'PUBLISHED') {
    notFound();
  }

  const { meta, content } = post;

  // 3. 在服务器端提取客户端真实 IP 并物理记录唯一访问 (采用双模自适应：Prisma 引擎与原生 SQL 极速降级引擎)
  let currentViews = 0;
  try {
    const headersList = await headers();
    const forwardedFor = headersList.get('x-forwarded-for');
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : (headersList.get('x-real-ip') || '127.0.0.1');

    const hasModel = 'postIpView' in db;
    if (hasModel) {
      // 使用 upsert 避免唯一约束冲突错误日志
      await (db as any).postIpView.upsert({
        where: { slug_ip: { slug: meta.slug, ip } },
        update: {},
        create: { slug: meta.slug, ip },
      });

      currentViews = await (db as any).postIpView.count({
        where: { slug: meta.slug },
      });
    } else {
      // 🚀 核心自适应降级：通过 Prisma 原生始终可用的 $queryRaw / $executeRaw 物理去重写入
      try {
        await db.$executeRawUnsafe(
          'INSERT OR IGNORE INTO "PostIpView" ("id", "slug", "ip", "createdAt") VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
          Math.random().toString(36).substring(2),
          meta.slug,
          ip
        );
      } catch (rawErr) {
        console.error('Raw SQL insert error:', rawErr);
      }
      
      const countRes: any = await db.$queryRawUnsafe(
        'SELECT COUNT(*) as count FROM "PostIpView" WHERE "slug" = ?',
        meta.slug
      );
      currentViews = Number(countRes?.[0]?.count || 0);
    }
  } catch (err) {
    console.error('更新唯一 IP 阅读量出错:', err);
  }

  // 配置 marked 使用 highlight.js 语法高亮（通过自定义 renderer）
const renderer = new marked.Renderer();
const originalCodeRenderer = renderer.code.bind(renderer);

renderer.code = function(code: string, lang: string | undefined, _escaped: boolean): string {
  if (typeof window === 'undefined' && lang) {
    try {
      const hljs = require('highlight.js');
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      const highlighted = hljs.highlight(code, { language }).value;
      return `<pre><code class="hljs language-${lang}">${highlighted}</code></pre>\n`;
    } catch {
      // 高亮失败时回退到原始渲染
    }
  }
  return originalCodeRenderer(code, lang, _escaped);
};

marked.setOptions({
  renderer,
  breaks: true,
  gfm: true,
});

  // 使用 marked 解析 Markdown 文本为 HTML，确保渲染极致流畅舒适
  const renderedHtml = marked.parse(content);

  return (
    <div className={styles.container}>
      {/* 顶部面包屑与文章元数据头 */}
      <header className={`${styles.header} fade-in-element`}>
        <a href="/" className={styles.backBtn}>
          ← 返回首页
        </a>
        <h1 className={styles.title}>{meta.title}</h1>
        
        <div className={styles.meta}>
          <span className={styles.metaItem}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
              <line x1="16" y1="2" x2="16" y2="6"></line>
              <line x1="8" y1="2" x2="8" y2="6"></line>
              <line x1="3" y1="10" x2="21" y2="10"></line>
            </svg>
            {formatToChineseDateTime(meta.date)}
          </span>
          <span className={styles.metaItem}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
            预计阅读 {meta.readingTime} 分钟
          </span>
          <span className={styles.metaItem}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
              <circle cx="12" cy="12" r="3"></circle>
            </svg>
            {currentViews} 次阅读
          </span>
        </div>

        <div className={styles.tags}>
          {meta.tags.map((tag) => (
            <span key={tag} className="badge">
              #{tag}
            </span>
          ))}
        </div>
      </header>

      {/* 主双栏阅读排版区域 */}
      <div className={styles.layout}>
        {/* 左辅栏：浮动智能文章目录 (TOC) */}
        <aside className={styles.aside}>
          <TOC />
        </aside>

        {/* 右主栏：正文内容 */}
        <article className={styles.article}>
          <div
            id="article-content"
            className={`${styles.content} glass-card`}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
          <CodeCopyButton />

          {/* 互动双层嵌套评论区 */}
          <CommentsSection postSlug={meta.slug} />
        </article>
      </div>
    </div>
  );
}
