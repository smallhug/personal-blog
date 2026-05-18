import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminAuth } from '@/lib/auth';
import { getSortedPostsData } from '@/lib/posts';

export const revalidate = 0;

export async function GET(request: NextRequest) {
  // 1. 进行网关鉴权校验
  if (!verifyAdminAuth(request)) {
    return NextResponse.json(
      { message: '安全网关拦截：未授权的后台数据读取' },
      { status: 401 }
    );
  }

  try {
    // 2. 统计文章总数（含草稿和发布）
    const posts = getSortedPostsData();
    const totalPosts = posts.length;

    // 3. 统计总阅读量 PV (从 SQLite 的 PostView 进行聚合累加)
    let totalViews = 0;
    try {
      const viewsAggregation = await db.postView.aggregate({
        _sum: {
          views: true,
        },
      });
      totalViews = viewsAggregation._sum.views || 0;
    } catch (e) {
      console.warn('聚合总 PV 出错，可能表暂空或未定义，降级至累加查询:', e);
      const allViews = await db.postView.findMany();
      totalViews = allViews.reduce((sum, item) => sum + (item.views || 0), 0);
    }

    // 4. 加载所有访客 IP 记录，并以自适应内存算法统计总 UV 和近 7 天访问趋势
    // 此举完美避开 SQLite/Prisma 的不同日期格式化函数的兼容性巨坑，且效率极高
    const ipViews = await db.postIpView.findMany({
      select: {
        ip: true,
        createdAt: true,
      },
    });

    const uniqueIps = new Set(ipViews.map((item) => item.ip));
    const totalUv = uniqueIps.size;

    // 5. 计算最近 7 天的每日 PV / UV 趋势线数据
    const days: string[] = [];
    const dailyUvs: number[] = [];
    const dailyPvs: number[] = [];
    const now = new Date();

    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      days.push(`${month}-${date}`);
      dailyUvs.push(0);
      dailyPvs.push(0);
    }

    // 统计每日 PV
    ipViews.forEach((item) => {
      const d = new Date(item.createdAt);
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const date = String(d.getDate()).padStart(2, '0');
      const dayStr = `${month}-${date}`;
      const dayIndex = days.indexOf(dayStr);
      if (dayIndex !== -1) {
        dailyPvs[dayIndex]++;
      }
    });

    // 统计每日去重 UV
    for (let i = 0; i < 7; i++) {
      const dayStr = days[i];
      const ipsOfDay = ipViews
        .filter((item) => {
          const d = new Date(item.createdAt);
          const m = String(d.getMonth() + 1).padStart(2, '0');
          const dt = String(d.getDate()).padStart(2, '0');
          return `${m}-${dt}` === dayStr;
        })
        .map((item) => item.ip);
      dailyUvs[i] = new Set(ipsOfDay).size;
    }

    // 6. 统计待审核评论与拉取最新待审列表
    const pendingCommentsCount = await db.comment.count({
      where: { status: 'PENDING' },
    });

    const recentComments = await db.comment.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // 7. 拉取阅读量最高的 5 篇文章排行
    const topViews = await db.postView.findMany({
      orderBy: { views: 'desc' },
      take: 5,
    });

    const topPosts = topViews.map((view) => {
      const post = posts.find((p) => p.slug === view.slug);
      return {
        slug: view.slug,
        views: view.views,
        title: post ? post.title : '已归档文章',
      };
    });

    // 返回精心聚合成熟的看板大包数据
    return NextResponse.json({
      success: true,
      metrics: {
        totalPosts,
        totalViews,
        totalUv,
        pendingComments: pendingCommentsCount,
      },
      trends: {
        labels: days,
        pvs: dailyPvs,
        uvs: dailyUvs,
      },
      recentComments,
      topPosts,
    });
  } catch (err) {
    console.error('看板聚合数据出错:', err);
    return NextResponse.json(
      { success: false, message: '服务器聚合后台看板异常' },
      { status: 500 }
    );
  }
}
