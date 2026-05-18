import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';

export const revalidate = 0;

// 获取客户端真实 IP
function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) return realIp;
  return '127.0.0.1';
}

// 1. GET：获取指定文章的“唯一 IP 阅读量”
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ message: '文章 Slug 链接参数缺失' }, { status: 400 });
  }

  try {
    const hasModel = 'postIpView' in db;
    if (hasModel) {
      const uniqueViews = await (db as any).postIpView.count({
        where: { slug },
      });
      return NextResponse.json({ views: uniqueViews });
    } else {
      const countRes: any = await db.$queryRawUnsafe(
        'SELECT COUNT(*) as count FROM "PostIpView" WHERE "slug" = ?',
        slug
      );
      const uniqueViews = Number(countRes?.[0]?.count || 0);
      return NextResponse.json({ views: uniqueViews });
    }
  } catch (err) {
    console.error('获取阅读数发生异常:', err);
    return NextResponse.json({ message: '获取阅读量失败' }, { status: 500 });
  }
}

// 2. POST：记录 IP 访问（唯一录入），并返回当前“唯一 IP 阅读量”
export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ message: '文章 Slug 链接参数缺失' }, { status: 400 });
  }

  const ip = getClientIp(request);

  try {
    const hasModel = 'postIpView' in db;
    if (hasModel) {
      // 尝试创建 (slug, ip) 的唯一记录，如果已记录则静默忽略唯一性约束冲突
      try {
        await (db as any).postIpView.create({
          data: { slug, ip },
        });
        console.log(`📝 [Prisma 物理记录唯一 IP] Slug: ${slug}, IP: ${ip}`);
      } catch (e: any) {
        // 捕获 Prisma P2002 唯一索引冲突异常，不做任何处理表示该 IP 已访问过
      }

      const uniqueViews = await (db as any).postIpView.count({
        where: { slug },
      });

      return NextResponse.json({ views: uniqueViews });
    } else {
      // 🚀 降级引擎：使用 Raw SQL
      try {
        await db.$executeRawUnsafe(
          'INSERT OR IGNORE INTO "PostIpView" ("id", "slug", "ip", "createdAt") VALUES (?, ?, ?, CURRENT_TIMESTAMP)',
          Math.random().toString(36).substring(2),
          slug,
          ip
        );
        console.log(`📝 [RawSQL 物理记录唯一 IP] Slug: ${slug}, IP: ${ip}`);
      } catch (rawErr) {}

      const countRes: any = await db.$queryRawUnsafe(
        'SELECT COUNT(*) as count FROM "PostIpView" WHERE "slug" = ?',
        slug
      );
      const uniqueViews = Number(countRes?.[0]?.count || 0);

      return NextResponse.json({ views: uniqueViews });
    }
  } catch (err) {
    console.error('原子递增唯一阅读数异常:', err);
    return NextResponse.json({ message: '更新唯一阅读量失败' }, { status: 500 });
  }
}
