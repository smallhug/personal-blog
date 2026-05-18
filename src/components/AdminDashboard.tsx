'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import AdminEditor from './AdminEditor';
import styles from './AdminDashboard.module.css';

interface PostListMeta {
  title: string;
  slug: string;
  date: string;
  status: 'DRAFT' | 'PUBLISHED';
}

interface CommentMeta {
  id: string;
  nickname: string;
  contact: string;
  content: string;
  ip: string;
  location: string;
  postSlug: string;
  createdAt: string;
  status: 'PENDING' | 'APPROVED' | 'DELETED';
}

interface StatsMeta {
  total: number;
  pending: number;
  approved: number;
}

export default function AdminDashboard() {
  const searchParams = useSearchParams();
  const editSlug = searchParams.get('edit') || undefined;

  const [activeTab, setActiveTab] = useState<'write' | 'comments'>('write');
  const [posts, setPosts] = useState<PostListMeta[]>([]);
  const [comments, setComments] = useState<CommentMeta[]>([]);
  const [stats, setStats] = useState<StatsMeta>({ total: 0, pending: 0, approved: 0 });
  const [loading, setLoading] = useState(true);

  // 安全认证机制状态
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // 1. 获取文章列表与评论管理数据（如果接口报 401 触发登录页）
  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // 获取文章列表
      const postsRes = await fetch('/api/admin/posts');
      if (postsRes.status === 401) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      if (postsRes.ok) {
        const postsData = await postsRes.json();
        setPosts(postsData);
      }

      // 获取全站所有评论及看板数据
      const commentsRes = await fetch('/api/admin/comments');
      if (commentsRes.status === 401) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      if (commentsRes.ok) {
        const { list, stats: commentStats } = await commentsRes.json();
        setComments(list);
        setStats(commentStats);
      }

      // 成功加载数据即代表当前会话已授权
      setIsAuthenticated(true);
    } catch (err) {
      console.error('获取后台数据错误', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('钥匙密码不能为空噢。');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');

      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIsAuthenticated(true);
        // 成功登录后触发数据拉取
        fetchDashboardData();
      } else {
        setErrorMsg(data.message || '钥匙密码校验失败，请重试。');
      }
    } catch (err) {
      console.error('登录网络异常:', err);
      setErrorMsg('安全网关连接超时，请重试。');
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  // 2. 评论审批操作（通过/逻辑删除）
  const handleModerateComment = async (commentId: string, action: 'APPROVE' | 'DELETE') => {
    try {
      const res = await fetch('/api/admin/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, action }),
      });

      if (res.ok) {
        // 重新获取评论列表与数据看板
        const commentsRes = await fetch('/api/admin/comments');
        if (commentsRes.ok) {
          const { list, stats: commentStats } = await commentsRes.json();
          setComments(list);
          setStats(commentStats);
        }
      } else {
        alert('审批操作失败，请重试');
      }
    } catch (err) {
      console.error('审批故障', err);
    }
  };

  // 3. 一键逻辑删除文章
  const handleDeletePost = async (slug: string) => {
    if (!window.confirm(`⚠️ 警告！确定要彻底删除文章 "${slug}" 吗？该操作无法撤销！`)) return;

    try {
      const res = await fetch(`/api/admin/posts?slug=${slug}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('博文已成功物理删除！');
        fetchDashboardData();
      } else {
        alert('删除博文失败');
      }
    } catch (err) {
      console.error('删除博文出错', err);
    }
  };

  // A. 首屏数据检测（防闪烁）
  if (isAuthenticated === null && loading) {
    return (
      <div className={styles.loading} style={{ padding: '8rem 0' }}>
        正在加载管理后台...
      </div>
    );
  }

  // B. 安全钥匙门禁系统
  if (isAuthenticated === false) {
    return (
      <div className={styles.loginOverlay}>
        <form onSubmit={handleLogin} className={styles.loginCard}>
          <div>
            <h2 className={styles.loginTitle}>🔑 管理员登录</h2>
            <p className={styles.loginSubtitle}>
              这是属于虫虫的私人写作花园，请输入开启之钥。
            </p>
          </div>

          <input
            type="password"
            placeholder="请输入管理员钥匙密码"
            className={styles.loginInput}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />

          {errorMsg && <div className={styles.loginError}>{errorMsg}</div>}

          <button type="submit" disabled={submitting} className={styles.loginBtn}>
            {submitting ? '安全凭证核验中...' : '核验并进入控制台'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 顶部主选项卡切换 */}
      <div className={styles.tabsHeader}>
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'write' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('write')}
          >
            📝 博文撰写面板
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'comments' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('comments')}
          >
            💬 评论审核中心
            {stats.pending > 0 && <span className={styles.pendingBadge}>{stats.pending}</span>}
          </button>
        </div>

        <a href="/" className={styles.exitBtn}>
          🚪 退出后台
        </a>
      </div>

      {activeTab === 'write' ? (
        <div className={styles.editorLayout}>
          {/* 1. 博文撰写及编辑器区域 */}
          <div className={styles.editorWrapper}>
            <div className={styles.editorTitleRow}>
              <h2 className={styles.sectionTitle}>
                {editSlug ? '🛠️ 编辑历史文章' : '✨ 创作全新文章'}
              </h2>
              {editSlug && (
                <button
                  className={styles.newPostBtn}
                  onClick={() => {
                    window.location.href = '/admin';
                  }}
                >
                  ＋ 切换为新建文章
                </button>
              )}
            </div>
            <AdminEditor initialSlug={editSlug} />
          </div>

          {/* 2. 右侧快速已发表文章管理列表 */}
          <aside className={`${styles.postsListPanel} glass-card`}>
            <h3 className={styles.widgetTitle}>历史文章管理</h3>
            {loading ? (
              <div className={styles.loading}>正在整理文献...</div>
            ) : posts.length === 0 ? (
              <div className={styles.empty}>绿洲中尚无文章</div>
            ) : (
              <div className={styles.list}>
                {posts.map((post) => (
                  <div key={post.slug} className={styles.postRow}>
                    <div className={styles.postMeta}>
                      <span className={`${styles.statusDot} ${post.status === 'PUBLISHED' ? styles.dotPub : styles.dotDraft}`} />
                      <a href={`/admin?edit=${post.slug}`} className={styles.postTitleLink} title="点击进行编辑">
                        {post.title}
                      </a>
                    </div>
                    <div className={styles.postActions}>
                      <a href={`/admin?edit=${post.slug}`} className={styles.actionBtnEdit} title="修改">
                        ✏️
                      </a>
                      <button className={styles.actionBtnDel} onClick={() => handleDeletePost(post.slug)} title="彻底删除">
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </aside>
        </div>
      ) : (
        <div className={styles.commentsLayout}>
          {/* 数据统计仪表盘看板 */}
          <section className={styles.statsDashboard}>
            <div className={`${styles.statCard} glass-card`}>
              <span className={styles.statLabel}>📝 全站总留言</span>
              <span className={styles.statVal}>{stats.total}</span>
            </div>
            <div className={`${styles.statCard} glass-card`} style={{ borderColor: 'rgba(99, 102, 241, 0.3)' }}>
              <span className={styles.statLabel} style={{ color: 'var(--color-accent-1)' }}>⏳ 待批准审核</span>
              <span className={styles.statVal} style={{ color: 'var(--color-accent-1)' }}>{stats.pending}</span>
            </div>
            <div className={`${styles.statCard} glass-card`} style={{ borderColor: 'rgba(16, 185, 129, 0.3)' }}>
              <span className={styles.statLabel} style={{ color: 'var(--color-accent-3)' }}>🟢 已批准上线</span>
              <span className={styles.statVal} style={{ color: 'var(--color-accent-3)' }}>{stats.approved}</span>
            </div>
          </section>

          {/* 待审核评论列表 */}
          <section className={`${styles.commentsListWrapper} glass-card`}>
            <h2 className={styles.sectionTitle}>待审批/已批准评论队列</h2>
            
            {loading ? (
              <div className={styles.loading}>加载讨论线索中...</div>
            ) : comments.length === 0 ? (
              <div className={styles.empty}>🎉 干净整洁！目前没有需要审核的评论。</div>
            ) : (
              <div className={styles.commentsGrid}>
                {comments.map((comment) => (
                  <div key={comment.id} className={`${styles.commentCard} ${comment.status === 'PENDING' ? styles.pendingCard : ''}`}>
                    <div className={styles.commentHeader}>
                      <div>
                        <span className={styles.commentNickname}>{comment.nickname}</span>
                        <span className={styles.commentContact}>{comment.contact}</span>
                      </div>
                      <span className={styles.commentMeta}>
                        📍 {comment.location} ({comment.ip})
                      </span>
                    </div>

                    <p className={styles.commentContent}>
                      <span className={styles.mapToPost}>关联博文：{comment.postSlug}</span>
                      <br />
                      {comment.content}
                    </p>

                    <div className={styles.commentFooter}>
                      <span className={styles.commentTime}>
                        {new Date(comment.createdAt).toLocaleString('zh-CN')}
                      </span>
                      
                      <div className={styles.moderationActions}>
                        {comment.status === 'PENDING' && (
                          <button
                            className={styles.approveBtn}
                            onClick={() => handleModerateComment(comment.id, 'APPROVE')}
                          >
                            ✔️ 批准发布
                          </button>
                        )}
                        {comment.status !== 'DELETED' && (
                          <button
                            className={styles.deleteBtn}
                            onClick={() => handleModerateComment(comment.id, 'DELETE')}
                          >
                            ❌ 驳回删除
                          </button>
                        )}
                        {comment.status === 'DELETED' && (
                          <span className={styles.deletedText}>🚫 已逻辑删除</span>
                        )}
                        {comment.status === 'APPROVED' && (
                          <span className={styles.approvedText}>🟢 已显示在前台</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
