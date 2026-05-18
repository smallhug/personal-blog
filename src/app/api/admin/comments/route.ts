import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { verifyAdminAuth } from '@/lib/auth';

export const revalidate = 0;

// 1. GET：加载全局所有评论列表及仪表盘看板统计数据（包含待审批、已批准、逻辑删除）
export async function GET(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ message: '安全网关拦截：未授权的后台数据读取' }, { status: 401 });
  }

  try {
    // A. 按日期倒序（最新发表的在最前）查询所有评论
    const commentsList = await db.comment.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    });

    // B. 分类汇总看板统计指标
    const total = await db.comment.count();
    const pending = await db.comment.count({ where: { status: 'PENDING' } });
    const approved = await db.comment.count({ where: { status: 'APPROVED' } });
    const deleted = await db.comment.count({ where: { status: 'DELETED' } });

    return NextResponse.json({
      list: commentsList,
      stats: {
        total,
        pending,
        approved,
        deleted,
      },
    });
  } catch (err) {
    console.error('加载后台评论数据错误:', err);
    return NextResponse.json({ message: '后台获取评论失败' }, { status: 500 });
  }
}

// 2. PUT：执行评论审核流程（批准上线 / 逻辑软删除清理）
export async function PUT(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ message: '安全网关拦截：未授权的评论审批操作' }, { status: 401 });
  }

  try {
    const { commentId, action } = await request.json();

    if (!commentId || !action) {
      return NextResponse.json({ message: '审批参数缺失' }, { status: 400 });
    }

    if (action === 'APPROVE') {
      // 批准上线：将状态更新为 APPROVED
      const approvedComment = await db.comment.update({
        where: { id: commentId },
        data: { status: 'APPROVED' },
      });
      return NextResponse.json(approvedComment);
    } else if (action === 'DELETE') {
      // 逻辑软删除：为了保障其子回复能够正常显示且嵌套评论树不断裂，
      // 我们将其状态更新为 DELETED，并对其文本内容进行强制内容清理擦除（防止垃圾广告残留数据库）
      const softDeletedComment = await db.comment.update({
        where: { id: commentId },
        data: {
          status: 'DELETED',
          content: '🚫 该评论因内容违规或垃圾灌水已被管理员逻辑删除。',
          nickname: '已注销用户',
        },
      });
      return NextResponse.json(softDeletedComment);
    } else if (action === 'RESTORE') {
      // 恢复已删除评论：状态回退为 PENDING 待审核
      const restoredComment = await db.comment.update({
        where: { id: commentId },
        data: { status: 'PENDING' },
      });
      return NextResponse.json(restoredComment);
    } else {
      return NextResponse.json({ message: '未知的审批操作' }, { status: 400 });
    }
  } catch (err) {
    console.error('审批评论操作故障:', err);
    return NextResponse.json({ message: '评论审核保存失败' }, { status: 500 });
  }
}
