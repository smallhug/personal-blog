import React from 'react';
import HomeContainer from '@/components/HomeContainer';
import { getSortedPostsData, getTagCloud } from '@/lib/posts';
import { db } from '@/lib/db';

// 强制采用服务器渲染模式以获得最新博文与数据
export const revalidate = 0;

export default async function HomePage() {
  // 1. 获取本地编译的文章与标签数据
  const posts = getSortedPostsData();
  const tags = getTagCloud();

  // 2. 从本地 SQLite 中分组统计已审核评论数 (status: "APPROVED")
  const commentsGroup = await db.comment.groupBy({
    by: ['postSlug'],
    _count: {
      id: true,
    },
    where: {
      status: 'APPROVED',
    },
  });

  const commentCounts: Record<string, number> = {};
  commentsGroup.forEach((c) => {
    commentCounts[c.postSlug] = c._count.id;
  });

  // 3. 从 SQLite 数据库中聚合统计每篇文章的唯一 IP 阅读数 (UV) (双模自适应查询引擎)
  const viewsMap: Record<string, number> = {};
  try {
    const hasModel = 'postIpView' in db;
    if (hasModel) {
      const viewsGroup = await (db as any).postIpView.groupBy({
        by: ['slug'],
        _count: {
          ip: true,
        },
      });
      viewsGroup.forEach((v: any) => {
        viewsMap[v.slug] = v._count.ip;
      });
    } else {
      // 🚀 Raw SQL 降级分组查询，天然绕过模块缓存限制，秒级就绪
      const groupResult: any = await db.$queryRawUnsafe(
        'SELECT "slug", COUNT("ip") as count FROM "PostIpView" GROUP BY "slug"'
      );
      if (Array.isArray(groupResult)) {
        groupResult.forEach((row: any) => {
          viewsMap[row.slug] = Number(row.count || 0);
        });
      }
    }
  } catch (err) {
    console.error('首页唯一 IP 分组统计失败:', err);
  }

  // 4. 将数据管道输出到前台交互容器组件中，使用 Suspense 包裹以支持 URL 搜索参数解析
  return (
    <React.Suspense fallback={<div className="loading">正在加载数字绿洲...</div>}>
      <HomeContainer 
        initialPosts={posts} 
        tags={tags} 
        commentCounts={commentCounts} 
        viewsMap={viewsMap}
      />
    </React.Suspense>
  );
}
