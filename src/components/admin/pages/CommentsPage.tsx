'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import Button from '../shared/Button';
import AdminCard, { CardHeader, CardBody, CardFooter } from '../shared/AdminCard';
import { useToast } from '../shared/Toast';
import Modal, { ConfirmModal } from '../shared/Modal';
import LoadingSkeleton, { CommentCardSkeleton, StatsDashboardSkeleton } from '../shared/LoadingSkeleton';
import styles from './CommentsPage.module.css';
import {
  IconTotal,
  IconClock,
  IconCheckCircle,
  IconTrash,
  IconCheck,
  IconLink
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
  status: 'PENDING' | 'APPROVED' | 'DELETED';
}

interface StatsMeta {
  total: number;
  pending: number;
  approved: number;
}

import { useAdmin } from '../shared/AdminContext';

type FilterType = 'ALL' | 'PENDING' | 'APPROVED' | 'DELETED';

// 使用memo包裹，避免不必要的重渲染
function CommentsPageComponent() {
  const { comments, stats, loading, handleModerateComment: contextModerate } = useAdmin();
  const { showToast } = useToast();
  
  const [localFilter, setLocalFilter] = useState<FilterType>('ALL');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<CommentMeta | null>(null);

  // 数据获取已移至父组件，子组件只负责展示和交互

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

  const filteredComments = localFilter === 'ALL' 
    ? comments 
    : comments.filter(c => c.status === localFilter);

  const filterOptions: { value: FilterType; label: string; icon: React.ReactNode; count?: number }[] = [
    { value: 'ALL', label: '全部', icon: <IconTotal size={14} /> },
    { value: 'PENDING', label: '待审核', icon: <IconClock size={14} />, count: stats.pending },
    { value: 'APPROVED', label: '已批准', icon: <IconCheckCircle size={14} />, count: stats.approved },
    { value: 'DELETED', label: '已删除', icon: <IconTrash size={14} /> },
  ];

  return (
    <div className={styles.container}>
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="确认删除评论"
        message={`确定要删除「${selectedComment?.nickname}」的这条评论吗？该操作无法撤销。`}
        confirmText="确认删除"
        cancelText="取消"
        variant="danger"
      />

      <section className={styles.statsSection}>
        {loading ? (
          <StatsDashboardSkeleton />
        ) : (
          <div className={styles.statsGrid}>
            <AdminCard variant="bordered" className={styles.statCard}>
              <div className={styles.statIconContainer}>
                <IconTotal size={20} className={styles.statSvg} />
              </div>
              <div className={styles.statContent}>
                <span className={styles.statLabel}>全站总留言</span>
                <span className={styles.statValue}>{stats.total}</span>
              </div>
            </AdminCard>

            <AdminCard 
              variant="bordered" 
              className={`${styles.statCard} ${styles.statPending}`}
            >
              <div className={styles.statIconContainer}>
                <IconClock size={20} className={styles.statSvgPending} />
              </div>
              <div className={styles.statContent}>
                <span className={`${styles.statLabel} ${styles.labelPending}`}>待批准审核</span>
                <span className={`${styles.statValue} ${styles.valuePending}`}>{stats.pending}</span>
              </div>
            </AdminCard>

            <AdminCard 
              variant="bordered" 
              className={`${styles.statCard} ${styles.statApproved}`}
            >
              <div className={styles.statIconContainer}>
                <IconCheckCircle size={20} className={styles.statSvgApproved} />
              </div>
              <div className={styles.statContent}>
                <span className={`${styles.statLabel} ${styles.labelApproved}`}>已批准上线</span>
                <span className={`${styles.statValue} ${styles.valueApproved}`}>{stats.approved}</span>
              </div>
            </AdminCard>
          </div>
        )}
      </section>

      <section className={styles.commentsSection}>
        <AdminCard variant="default" padding="lg" className={styles.commentsCard}>
          <CardHeader>
            <div className={styles.headerRow}>
              <h2 className={styles.sectionTitle}>评论管理队列</h2>
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
                    : `当前筛选条件下暂无${localFilter === 'PENDING' ? '待审核' : localFilter === 'APPROVED' ? '已批准' : '已删除'}评论`
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
                          <span className={styles.authorName}>{comment.nickname}</span>
                          <span className={styles.authorContact}>{comment.contact}</span>
                        </div>
                      </div>
                      <div className={styles.commentMeta}>
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
                          {comment.status === 'DELETED' && (
                            <>
                              <IconTrash size={12} className={styles.badgeIcon} />
                              <span className={styles.badgeText}>已删除</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>

                    <div className={styles.commentBody}>
                      <p className={styles.commentContent}>{comment.content}</p>
                      <div className={styles.commentPostRef}>
                        <IconLink size={12} className={styles.refIcon} />
                        <span>关联博文：</span>
                        <span className={styles.postSlug}>{comment.postSlug}</span>
                      </div>
                    </div>

                    <div className={styles.commentFooter}>
                      <div className={styles.footerMeta}>
                        <span className={styles.locationInfo}>
                          地区: {comment.location}
                        </span>
                        <span className={styles.ipInfo}>
                          IP: {comment.ip}
                        </span>
                        <span className={styles.timeInfo}>
                          时间: {new Date(comment.createdAt).toLocaleString('zh-CN')}
                        </span>
                      </div>

                      <div className={styles.actionGroup}>
                        {comment.status === 'PENDING' && (
                          <Button
                            variant="success"
                            size="sm"
                            loading={actionLoading === comment.id}
                            icon={<IconCheck size={14} />}
                            onClick={() => handleModerateComment(comment.id, 'APPROVE')}
                          >
                            批准发布
                          </Button>
                        )}
                        {comment.status !== 'DELETED' && (
                          <Button
                            variant="danger"
                            size="sm"
                            icon={<IconTrash size={14} />}
                            onClick={() => handleDeleteClick(comment)}
                          >
                            删除
                          </Button>
                        )}
                        {comment.status === 'DELETED' && (
                          <span className={styles.deletedBadge}>已逻辑删除</span>
                        )}
                        {comment.status === 'APPROVED' && (
                          <span className={styles.approvedBadge}>显示在前台</span>
                        )}
                      </div>
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
