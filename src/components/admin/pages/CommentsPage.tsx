'use client';

import React, { useState, useEffect, useCallback, memo, useMemo } from 'react';
import Button from '../shared/Button';
import AdminCard, { CardHeader, CardBody, CardFooter } from '../shared/AdminCard';
import { useToast } from '../shared/Toast';
import Modal, { ConfirmModal } from '../shared/Modal';
import LoadingSkeleton, { CommentCardSkeleton } from '../shared/LoadingSkeleton';
import { formatToChineseDateTime } from '@/lib/date';
import styles from './CommentsPage.module.css';
import {
  IconTotal,
  IconClock,
  IconCheckCircle,
  IconTrash,
  IconCheck,
  IconLink,
  IconSearch
} from '../icons';

interface CommentMeta {
  id: string;
  nickname: string;
  contact: string;
  content: string;
  ip: string;
  location: string;
  postSlug: string;
  createdAt: string;
  status: 'PENDING' | 'APPROVED';
}

interface StatsMeta {
  total: number;
  pending: number;
  approved: number;
}

import { useAdmin } from '../shared/AdminContext';

type FilterType = 'ALL' | 'PENDING' | 'APPROVED';

function CommentsPageComponent() {
  const { comments, posts, stats, loading, handleModerateComment: contextModerate } = useAdmin();
  const { showToast } = useToast();

  // 建立关联文章 slug 到标题的快速查找 Mapping
  const postSlugToTitleMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (posts) {
      posts.forEach(post => {
        map[post.slug] = post.title;
      });
    }
    return map;
  }, [posts]);

  // 🐞 后台调试日志探测，用以在浏览器 Console 中极其敏锐地捕获数据流向
  useEffect(() => {
    console.log("🐞 [CommentsPage Debug] useAdmin() Raw Global Context Data:", {
      comments,
      stats,
      loading
    });
  }, [comments, stats, loading]);
  
  const [localFilter, setLocalFilter] = useState<FilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<CommentMeta | null>(null);

  const handleModerateComment = async (commentId: string, action: 'APPROVE' | 'DELETE') => {
    try {
      setActionLoading(commentId);
      await contextModerate(commentId, action);
    } catch (err) {
      console.error('审批故障:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteClick = (comment: CommentMeta) => {
    setSelectedComment(comment);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (selectedComment) {
      handleModerateComment(selectedComment.id, 'DELETE');
    }
    setDeleteModalOpen(false);
    setSelectedComment(null);
  };

  const normalizedQuery = searchQuery.toLowerCase().trim();
  const filteredComments = comments
    .filter(c => localFilter === 'ALL' || c.status === localFilter)
    .filter(c => {
      if (!normalizedQuery) return true;
      return (
        c.nickname.toLowerCase().includes(normalizedQuery) ||
        c.content.toLowerCase().includes(normalizedQuery) ||
        c.postSlug.toLowerCase().includes(normalizedQuery)
      );
    });

  const filterOptions: { value: FilterType; label: string; icon: React.ReactNode; count?: number }[] = [
    { value: 'ALL', label: '全部', icon: <IconTotal size={14} />, count: stats.total },
    { value: 'PENDING', label: '待审核', icon: <IconClock size={14} />, count: stats.pending },
    { value: 'APPROVED', label: '已批准', icon: <IconCheckCircle size={14} />, count: stats.approved },
  ];

  return (
    <div className={styles.container}>
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="确认删除评论"
        message={`确定要删除「${selectedComment?.nickname}」的这条评论吗？该操作将从数据库中物理彻底删除，无法撤销。`}
        confirmText="确认删除"
        cancelText="取消"
        variant="danger"
      />

      <section className={styles.commentsSection}>
        <AdminCard variant="default" padding="lg" className={styles.commentsCard}>
          <CardHeader>
            <div className={styles.headerRow}>
              <div className={styles.filterGroup}>
                {filterOptions.map((option) => (
                  <button
                    key={option.value}
                    className={`${styles.filterBtn} ${localFilter === option.value ? styles.filterActive : ''}`}
                    onClick={() => setLocalFilter(option.value)}
                  >
                    <span className={styles.filterIcon}>{option.icon}</span>
                    <span className={styles.filterLabel}>{option.label}</span>
                    {option.count !== undefined && (
                      <span className={styles.filterCount}>{option.count}</span>
                    )}
                  </button>
                ))}
              </div>
              <div className={styles.searchBox}>
                <IconSearch size={14} className={styles.searchIcon} />
                <input
                  type="text"
                  className={styles.searchInput}
                  placeholder="搜索昵称、内容或文章..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </CardHeader>

          <CardBody className={styles.commentsBody}>
            {loading ? (
              <CommentCardSkeleton count={4} />
            ) : filteredComments.length === 0 ? (
              <div className={styles.emptyState}>
                <p className={styles.emptyText}>
                  {localFilter === 'ALL' 
                    ? '目前没有任何评论' 
                    : localFilter === 'PENDING'
                      ? (comments.some(c => c.status === 'APPROVED')
                          ? '🍵 清净无事！当前所有的文章回复评论均已审核完毕。您可以切换至“已批准”查看历史评论。'
                          : '目前没有任何待审核评论')
                      : '当前筛选条件下暂无已批准评论'
                  }
                </p>
              </div>
            ) : (
              <div className={styles.commentsList}>
                {filteredComments.map((comment, index) => (
                  <div
                    key={comment.id}
                    className={`${styles.commentItem} ${comment.status === 'PENDING' ? styles.pendingItem : ''}`}
                    style={{ animationDelay: `${index * 60}ms` }}
                  >
                    <div className={styles.commentHeader}>
                      <div className={styles.commentAuthor}>
                        <div className={styles.avatar}>
                          {comment.nickname.charAt(0).toUpperCase()}
                        </div>
                        <div className={styles.authorInfo}>
                          <div className={styles.authorMetaRow}>
                            <span className={styles.authorName}>{comment.nickname}</span>
                            <span className={styles.authorContact}>{comment.contact}</span>
                          </div>
                          <div className={styles.commentDetailsRow}>
                            <span className={styles.locationInfo}>📍 {comment.location}</span>
                            <span className={styles.ipInfo}>💻 IP: {comment.ip}</span>
                            <span className={styles.timeInfo} suppressHydrationWarning>
                              🕒 {formatToChineseDateTime(comment.createdAt)}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className={styles.commentMeta}>
                        <a 
                          href={`/posts/${comment.postSlug}`} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className={styles.commentPostRef}
                          title="在新标签页中阅读该文章"
                        >
                          <IconLink size={12} className={styles.refIcon} />
                          <span>关联文章：</span>
                          <span className={styles.postSlug}>
                            {postSlugToTitleMap[comment.postSlug] || comment.postSlug}
                          </span>
                        </a>

                        <div className={styles.metaRightRow}>
                          <span className={styles.statusBadge} data-status={comment.status}>
                            {comment.status === 'PENDING' && (
                              <>
                                <IconClock size={12} className={styles.badgeIcon} />
                                <span className={styles.badgeText}>待审核</span>
                              </>
                            )}
                            {comment.status === 'APPROVED' && (
                              <>
                                <IconCheckCircle size={12} className={styles.badgeIcon} />
                                <span className={styles.badgeText}>已批准</span>
                              </>
                            )}
                          </span>

                          <div className={styles.actionGroup}>
                            {comment.status === 'PENDING' && (
                              <Button
                                variant="success"
                                size="sm"
                                loading={actionLoading === comment.id}
                                icon={<IconCheck size={14} />}
                                onClick={() => handleModerateComment(comment.id, 'APPROVE')}
                              >
                                通过
                              </Button>
                            )}
                            <Button
                              variant="danger"
                              size="sm"
                              icon={<IconTrash size={14} />}
                              onClick={() => handleDeleteClick(comment)}
                            >
                              删除
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className={styles.commentBody}>
                      <p className={styles.commentContent}>{comment.content}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardBody>
        </AdminCard>
      </section>
    </div>
  );
}

// 导出memo化的组件
export default memo(CommentsPageComponent);
