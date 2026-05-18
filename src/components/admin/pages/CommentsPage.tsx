'use client';

import React, { useState, useEffect, useCallback, memo } from 'react';
import Button from '../shared/Button';
import AdminCard, { CardHeader, CardBody, CardFooter } from '../shared/AdminCard';
import { useToast } from '../shared/Toast';
import Modal, { ConfirmModal } from '../shared/Modal';
import LoadingSkeleton, { CommentCardSkeleton } from '../shared/LoadingSkeleton';
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
  status: 'PENDING' | 'APPROVED' | 'DELETED';
}

interface StatsMeta {
  total: number;
  pending: number;
  approved: number;
  deleted: number;
}

import { useAdmin } from '../shared/AdminContext';

type FilterType = 'ALL' | 'PENDING' | 'APPROVED' | 'DELETED';

// 使用memo包裹，避免不必要的重渲染
function CommentsPageComponent() {
  const { comments, stats, loading, handleModerateComment: contextModerate } = useAdmin();
  const { showToast } = useToast();
  
  const [localFilter, setLocalFilter] = useState<FilterType>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedComment, setSelectedComment] = useState<CommentMeta | null>(null);

  const handleModerateComment = async (commentId: string, action: 'APPROVE' | 'DELETE' | 'RESTORE') => {
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
    { value: 'DELETED', label: '已删除', icon: <IconTrash size={14} />, count: stats.deleted },
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
                        <span>关联文章：</span>
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
                        {comment.status === 'DELETED' && (
                          <Button
                            variant="ghost"
                            size="sm"
                            icon={<IconCheck size={14} />}
                            loading={actionLoading === comment.id}
                            onClick={() => handleModerateComment(comment.id, 'RESTORE')}
                          >
                            恢复
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
