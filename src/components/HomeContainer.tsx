'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { PostMeta } from '@/lib/posts';
import { formatToChineseDateTime } from '@/lib/date';
import styles from './HomeContainer.module.css';

interface TagCloudItem {
  name: string;
  count: number;
}

interface HomeContainerProps {
  initialPosts: PostMeta[];
  tags: TagCloudItem[];
  commentCounts?: Record<string, number>;
  viewsMap?: Record<string, number>;
}

export default function HomeContainer({ initialPosts, tags, commentCounts = {}, viewsMap = {} }: HomeContainerProps) {
  const searchParams = useSearchParams();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  
  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const postsPerPage = 6;

  // 移动端侧栏折叠状态
  const [mobileExpanded, setMobileExpanded] = useState(false);

  // 1. 同步顶栏 Header 的搜索参数 `q`
  useEffect(() => {
    const q = searchParams.get('q');
    setSearchQuery(q || '');
    setCurrentPage(1); // 重新搜索时重置回第一页
  }, [searchParams]);

  const handleTagClick = (tagName: string) => {
    if (selectedTag === tagName) {
      setSelectedTag(null);
    } else {
      setSelectedTag(tagName);
    }
    setCurrentPage(1);
  };

  // 2. 筛选文章
  const filteredPosts = initialPosts.filter((post) => {
    if (post.status !== 'PUBLISHED') return false;

    const matchesSearch =
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.summary.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesTag = selectedTag ? post.tags.includes(selectedTag) : true;

    return matchesSearch && matchesTag;
  });

  // 3. 计算分页数据
  const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
  const displayedPosts = filteredPosts.slice(
    (currentPage - 1) * postsPerPage,
    currentPage * postsPerPage
  );

  // 4. 获取近期文章 (前 5 篇)
  const recentPosts = initialPosts
    .filter((post) => post.status === 'PUBLISHED')
    .slice(0, 5);

  const totalPublishedPosts = initialPosts.filter((post) => post.status === 'PUBLISHED').length;

  return (
    <div className={styles.container}>
      {/* 单栏极简网页布局 */}
      <div className={styles.layoutGrid}>
        
        {/* 主要内容：文章列表 */}
        <main className={styles.mainContent}>
          <div className={styles.listHeader}>
            {searchQuery && (
              <div className={styles.searchStatus}>
                <span className={styles.searchLabel}>正在展示 🔎 搜索: "{searchQuery}"</span>
                <span className={styles.listCount}>（找到 {filteredPosts.length} 篇文章）</span>
                <button
                  className={styles.resetBtn}
                  onClick={() => {
                    setSearchQuery('');
                    window.history.pushState({}, '', '/');
                  }}
                >
                  清除搜索 ×
                </button>
              </div>
            )}

            {/* 顶栏横向分类标签筛选 */}
            <div className={styles.tagFilters}>
              <button
                className={`${styles.tagFilterBtn} ${selectedTag === null ? styles.activeTag : ''}`}
                onClick={() => setSelectedTag(null)}
              >
                全部
                <span className={styles.tagFilterCount}>{totalPublishedPosts}</span>
              </button>
              {tags.map((tag) => (
                <button
                  key={tag.name}
                  className={`${styles.tagFilterBtn} ${selectedTag === tag.name ? styles.activeTag : ''}`}
                  onClick={() => handleTagClick(tag.name)}
                >
                  #{tag.name}
                  <span className={styles.tagFilterCount}>{tag.count}</span>
                </button>
              ))}
            </div>
          </div>

          <div className={styles.postsList}>
            {filteredPosts.length === 0 ? (
              <div className={styles.emptyState}>
                🛸 没有找到相关的文章，换个搜索词试试吧。
              </div>
            ) : (
              displayedPosts.map((post, idx) => {
                const isFirstPageTop = currentPage === 1 && idx === 0 && !selectedTag && !searchQuery;
                const showSummary = isFirstPageTop || (idx < 2 && currentPage === 1);
                
                return (
                  <article key={post.slug} className={styles.postBlock}>
                    {/* 文章标题 (第一篇置顶字号更大，采用有衬线体 Lora) */}
                    <h3 className={`${styles.postTitle} ${isFirstPageTop ? styles.topPostTitle : ''}`}>
                      <a href={`/posts/${post.slug}`} className={styles.postLink}>
                        {post.title}
                      </a>
                    </h3>

                    {/* 极简摘要 (仅对最新两篇文章展示一行极简灰色摘要) */}
                    {showSummary && (
                      <p className={styles.postSummary}>
                        {post.summary.length > 100 ? `${post.summary.slice(0, 100)}...` : post.summary}
                      </p>
                    )}

                    {/* 元数据行 */}
                    <div className={styles.postMeta}>
                      <span>
                        {formatToChineseDateTime(post.date)}
                      </span>
                      <span className={styles.dot}>·</span>
                      <span>约 {post.readingTime} 分钟</span>
                      <span className={styles.dot}>·</span>
                      <span className={styles.commentCount}>
                        {commentCounts[post.slug] || 0} 条评论
                      </span>
                      <span className={styles.dot}>·</span>
                      <span className={styles.viewCount}>
                        {viewsMap[post.slug] || 0} 次阅读
                      </span>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* 极简分页导航 */}
          {totalPages > 1 && (
            <div className={styles.pagination}>
              <button
                disabled={currentPage === 1}
                onClick={() => {
                  setCurrentPage((prev) => Math.max(prev - 1, 1));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={styles.pageBtn}
              >
                ← 上一页
              </button>
              <span className={styles.pageIndicator}>
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => {
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={styles.pageBtn}
              >
                下一页 →
              </button>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
