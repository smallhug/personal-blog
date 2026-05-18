'use client';

import React, { useEffect, useState } from 'react';
import CommentForm from './CommentForm';
import { formatToChineseDateTime } from '@/lib/date';
import styles from './CommentsSection.module.css';

interface CommentType {
  id: string;
  parentId: string | null;
  postSlug: string;
  content: string;
  nickname: string;
  contact: string;
  avatar: string; // SVG string representing the generated pixel-art
  ip: string;
  location: string;
  likes: number;
  createdAt: string;
  replies?: CommentType[];
}

interface CommentsSectionProps {
  postSlug: string;
}

export default function CommentsSection({ postSlug }: CommentsSectionProps) {
  const [comments, setComments] = useState<CommentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [replyToId, setReplyToId] = useState<string | null>(null);
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>({});

  // 1. 获取该文章下的所有已批准评论
  const fetchComments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/comments?slug=${postSlug}`);
      if (res.ok) {
        const data = await res.json();
        setComments(data);
      }
    } catch (err) {
      console.error('获取评论失败:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComments();
    
    // 初始化已点赞列表
    const savedLikes = localStorage.getItem(`likes_${postSlug}`);
    if (savedLikes) {
      setLikedComments(JSON.parse(savedLikes));
    }
  }, [postSlug]);

  // 2. 评论点赞与取消点赞功能
  const handleLike = async (commentId: string) => {
    const isLiked = !!likedComments[commentId];
    const action = isLiked ? 'unlike' : 'like';

    try {
      const res = await fetch(`/api/comments`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commentId, action }),
      });

      if (res.ok) {
        // 更新本地状态
        const change = isLiked ? -1 : 1;
        setComments((prev) =>
          prev.map((c) => {
            if (c.id === commentId) {
              return { ...c, likes: Math.max(0, c.likes + change) };
            }
            if (c.replies) {
              return {
                ...c,
                replies: c.replies.map((r) => (r.id === commentId ? { ...r, likes: Math.max(0, r.likes + change) } : r)),
              };
            }
            return c;
          })
        );

        const updatedLikes = { ...likedComments };
        if (isLiked) {
          delete updatedLikes[commentId];
        } else {
          updatedLikes[commentId] = true;
        }
        setLikedComments(updatedLikes);
        localStorage.setItem(`likes_${postSlug}`, JSON.stringify(updatedLikes));
      }
    } catch (err) {
      console.error('操作点赞失败:', err);
    }
  };

  const handleCommentSuccess = () => {
    setReplyToId(null);
    fetchComments(); // 重新加载评论列表
  };

  if (loading) {
    return <div className={styles.loading}>正在加载精彩讨论...</div>;
  }

  return (
    <section className={styles.container} id="comments-section">
      <h2 className={styles.sectionTitle}>
        <span className="gradient-title">评论</span>
        <span className={styles.count}>({comments.reduce((acc, c) => acc + 1 + (c.replies?.length || 0), 0)})</span>
      </h2>

      {/* 一级评论表单 */}
      <div className={styles.mainFormWrapper}>
        <CommentForm postSlug={postSlug} onSuccess={handleCommentSuccess} />
      </div>

      <div className={styles.list}>
        {comments.length === 0 ? (
          <div className={styles.empty}>暂无评论，快来抢沙发吧！</div>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className={styles.commentGroup}>
              {/* 一级父评论 */}
              <div className={`${styles.commentNode} glass-card`}>
                <div
                  className={styles.avatar}
                  dangerouslySetInnerHTML={{ __html: comment.avatar }}
                  title={`${comment.nickname} 的专属数码头像`}
                />
                <div className={styles.body}>
                  <div className={styles.header}>
                    <span className={styles.nickname}>{comment.nickname}</span>
                    <span className={styles.meta}>
                      <span className={styles.location}>📍 {comment.location}</span>
                      <span className={styles.dot}>•</span>
                      <span className={styles.time}>
                        {formatToChineseDateTime(comment.createdAt)}
                      </span>
                    </span>
                  </div>
                  <p className={styles.content}>{comment.content}</p>
                  
                  <div className={styles.actions}>
                    <button
                      onClick={() => handleLike(comment.id)}
                      className={`${styles.likeBtn} ${likedComments[comment.id] ? styles.liked : ''}`}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill={likedComments[comment.id] ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                      </svg>
                      <span>{comment.likes}</span>
                    </button>
                    <button
                      onClick={() => setReplyToId(replyToId === comment.id ? null : comment.id)}
                      className={styles.replyBtn}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                      </svg>
                      <span>回复</span>
                    </button>
                  </div>

                  {/* 行内二级回复表单 */}
                  {replyToId === comment.id && (
                    <div className={styles.inlineForm}>
                      <div className={styles.replyToBadge}>
                        回复 @{comment.nickname} :
                        <button className={styles.cancelReply} onClick={() => setReplyToId(null)}>
                          取消
                        </button>
                      </div>
                      <CommentForm
                        postSlug={postSlug}
                        parentId={comment.id}
                        onSuccess={handleCommentSuccess}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 二级嵌套回复列表 */}
              {comment.replies && comment.replies.length > 0 && (
                <div className={styles.repliesList}>
                  {comment.replies.map((reply) => (
                    <div key={reply.id} className={`${styles.replyNode} glass-card`}>
                      <div
                        className={styles.avatar}
                        dangerouslySetInnerHTML={{ __html: reply.avatar }}
                      />
                      <div className={styles.body}>
                        <div className={styles.header}>
                          <span className={styles.nickname}>{reply.nickname}</span>
                          <span className={styles.replyBadge}>回复 @{comment.nickname}</span>
                          <span className={styles.meta}>
                            <span className={styles.location}>📍 {reply.location}</span>
                            <span className={styles.dot}>•</span>
                            <span className={styles.time}>
                              {formatToChineseDateTime(reply.createdAt)}
                            </span>
                          </span>
                        </div>
                        <p className={styles.content}>{reply.content}</p>

                        <div className={styles.actions}>
                          <button
                            onClick={() => handleLike(reply.id)}
                            className={`${styles.likeBtn} ${likedComments[reply.id] ? styles.liked : ''}`}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill={likedComments[reply.id] ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path>
                            </svg>
                            <span>{reply.likes}</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </section>
  );
}
