import React from 'react';
import { notFound } from 'next/navigation';
import { marked } from 'marked';
import { getPostData } from '@/lib/posts';
import TOC from '@/components/TOC';
import CommentsSection from '@/components/CommentsSection';
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
      try {
        await (db as any).postIpView.create({
          data: { slug: meta.slug, ip },
        });
        console.log(`📝 [Prisma 物理记录唯一 IP] Slug: ${meta.slug}, IP: ${ip}`);
      } catch (e: any) {
        // 捕获唯一性索引冲突，不做处理，代表该 IP 之前已读过
      }

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
        console.log(`📝 [RawSQL 物理记录唯一 IP] Slug: ${meta.slug}, IP: ${ip}`);
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
            📅 {new Date(meta.date).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </span>
          <span className={styles.metaItem}>⏰ 预计阅读 {meta.readingTime} 分钟</span>
          <span className={styles.metaItem}>👁️ {currentViews} 次阅读</span>
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

          {/* 互动双层嵌套评论区 */}
          <CommentsSection postSlug={meta.slug} />
        </article>
      </div>
    </div>
  );
}
