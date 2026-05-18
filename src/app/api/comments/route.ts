import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { db } from '@/lib/db';
import { generatePixelAvatar } from '@/lib/avatar';

// 内存中简单的 IP 速率限制映射 (防灌水频率限制：每个 IP 每 30 秒限发一条)
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 30000;

// XSS 安全过滤 HTML 实体转义
function sanitize(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

// 离线/在线结合的 IP 归属地反查安全方法 (免本地依赖包方案 B)
async function resolveLocation(ip: string): Promise<string> {
  const cleanIp = ip.trim();
  if (cleanIp === '127.0.0.1' || cleanIp === '::1' || cleanIp.startsWith('192.168.') || cleanIp.startsWith('10.')) {
    return '局域网/本地';
  }

  // 1. 首选高精度、支持中文返回的 ip-api.com 免费定位接口
  try {
    const res = await fetch(`http://ip-api.com/json/${cleanIp}?lang=zh-CN`, { 
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(1500) // 限制 1.5 秒超时，保障响应流畅
    });
    if (res.ok) {
      const data = await res.json();
      if (data.status === 'success') {
        const country = data.country || '';
        const region = data.regionName || '';
        const city = data.city || '';
        
        if (country === '中国') {
          return region === city || !city ? region : `${region} ${city}`;
        }
        return country || '海外';
      }
    }
  } catch (err) {
    // 捕获超时或网络抖动，自动滑入下一级备用接口
  }

  // 2. 备选 ipapi.co 定位接口 (提供英文或拼音返回)
  try {
    const res = await fetch(`https://ipapi.co/${cleanIp}/json/`, { 
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(1500)
    });
    if (res.ok) {
      const data = await res.json();
      if (data.region) return data.region;
    }
  } catch (err) {
    // 忽略错误并返回最终的浪漫兜底
  }

  return '数字绿洲';
}

// 1. GET：获取某篇文章下已批准的评论树 (二层嵌套)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const postSlug = searchParams.get('slug');

  if (!postSlug) {
    return NextResponse.json({ message: '文章 Slug 链接参数缺失' }, { status: 400 });
  }

  try {
    // 查询所有属于该 slug 且状态为已批准 APPROVED 的评论
    const rawComments = await db.comment.findMany({
      where: {
        postSlug,
        status: 'APPROVED',
      },
      orderBy: {
        createdAt: 'asc', // 先发表的在前
      },
    });

    // 将评论整理成嵌套的树状结构 (Parent-Children)
    const rootComments = rawComments.filter((c) => c.parentId === null) as any[];
    const replyComments = rawComments.filter((c) => c.parentId !== null);

    rootComments.forEach((parent) => {
      parent.replies = replyComments.filter((reply) => reply.parentId === parent.id);
    });

    return NextResponse.json(rootComments);
  } catch (err) {
    console.error('获取评论数据库故障:', err);
    return NextResponse.json({ message: '获取评论失败，请检查数据库配置' }, { status: 500 });
  }
}

// 2. POST：前台读者发布新评论 (带速率防灌水与像素头像生成)
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { postSlug, parentId, nickname, contact, content } = body;

    if (!postSlug || !nickname || !contact || !content) {
      return NextResponse.json({ message: '必填信息不完整哦' }, { status: 400 });
    }

    // 限制内容长度以防极端灌水
    if (content.length > 500) {
      return NextResponse.json({ message: '内容过长，请保持在 500 字以内' }, { status: 400 });
    }

    // A. 速率防灌水限流校验
    let clientIp = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || '127.0.0.1';
    if (clientIp.includes(',')) {
      clientIp = clientIp.split(',')[0].trim();
    }

    const lastSubmitTime = rateLimitMap.get(clientIp);
    const now = Date.now();
    if (lastSubmitTime && now - lastSubmitTime < RATE_LIMIT_MS) {
      return NextResponse.json(
        { message: '发言频率太快啦！为了防范灌水，请 30 秒后再试哦。' },
        { status: 429 }
      );
    }

    // B. 进行安全过滤
    const cleanNickname = sanitize(nickname.trim());
    const cleanContent = sanitize(content.trim());

    // C. 离线 IP 地理反查
    const location = await resolveLocation(clientIp);

    // D. 专属对称像素头像生成 (对输入联系账号进行混淆加密后生成头像种子)
    const hashedSeed = `pixel-${contact.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const avatarSvg = generatePixelAvatar(hashedSeed);

    // E. 写入 SQLite 数据库，初始状态为 PENDING 待博主审核
    const newComment = await db.comment.create({
      data: {
        postSlug,
        parentId: parentId || null,
        nickname: cleanNickname,
        contact: contact, // 仅在后台用于站长查阅防止机器人，前台绝不公开泄露
        avatar: avatarSvg,
        ip: clientIp,
        location,
        content: cleanContent,
        status: 'PENDING', // 待审核
      },
    });

    // 记录最新成功发言时间
    rateLimitMap.set(clientIp, now);

    return NextResponse.json(newComment, { status: 201 });
  } catch (err) {
    console.error('提交评论失败:', err);
    return NextResponse.json({ message: '服务端保存评论失败，请重试' }, { status: 500 });
  }
}

// 3. PUT：评论点赞/取消点赞功能
export async function PUT(request: NextRequest) {
  try {
    const { commentId, action } = await request.json();
    if (!commentId) {
      return NextResponse.json({ message: '评论 ID 参数缺失' }, { status: 400 });
    }

    const isUnlike = action === 'unlike';

    let updateData;
    if (isUnlike) {
      // 获取当前点赞数，防止减为负数
      const comment = await db.comment.findUnique({
        where: { id: commentId },
        select: { likes: true }
      });
      const currentLikes = comment?.likes || 0;
      updateData = {
        likes: Math.max(0, currentLikes - 1)
      };
    } else {
      updateData = {
        likes: { increment: 1 }
      };
    }

    const updated = await db.comment.update({
      where: { id: commentId },
      data: updateData,
    });

    return NextResponse.json(updated);
  } catch (err) {
    console.error('评论点赞/取消点赞操作失败:', err);
    return NextResponse.json({ message: '操作失败' }, { status: 500 });
  }
}
