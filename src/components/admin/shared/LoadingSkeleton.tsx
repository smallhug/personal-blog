'use client';

import React from 'react';
import styles from './LoadingSkeleton.module.css';

interface SkeletonProps {
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  className?: string;
  style?: React.CSSProperties;
}

export default function LoadingSkeleton({
  variant = 'text',
  width,
  height,
  className = '',
  style: customStyle = {},
}: SkeletonProps) {
  const mergedStyle: React.CSSProperties = {
    width: width || (variant === 'circular' ? '40px' : '100%'),
    height: height || getDefaultHeight(variant),
    ...customStyle,
  };

  return (
    <div
      className={`${styles.skeleton} ${styles[variant]} ${className}`}
      style={mergedStyle}
      aria-hidden="true"
    />
  );
}

function getDefaultHeight(variant: string): string {
  switch (variant) {
    case 'text':
      return '16px';
    case 'circular':
      return '40px';
    case 'rectangular':
      return '100px';
    default:
      return '16px';
  }
}

// 预定义骨架屏模板

export function ArticleListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={styles.articleItem}>
          <div className={styles.articleHeader}>
            <LoadingSkeleton variant="circular" width={40} height={40} />
            <div className={styles.articleMeta} style={{ flex: 1 }}>
              <LoadingSkeleton width="60%" height={16} />
              <LoadingSkeleton width="40%" height={12} style={{ marginTop: 8 }} />
            </div>
          </div>
          <div className={styles.articleContent}>
            <LoadingSkeleton width="100%" height={14} />
            <LoadingSkeleton width="90%" height={14} style={{ marginTop: 8 }} />
            <LoadingSkeleton width="75%" height={14} style={{ marginTop: 8 }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function CommentCardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className={styles.commentGrid}>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className={styles.commentCard}>
          <div className={styles.commentHeader}>
            <LoadingSkeleton variant="circular" width={32} height={32} />
            <div style={{ flex: 1 }}>
              <LoadingSkeleton width="25%" height={14} />
              <LoadingSkeleton width="15%" height={12} style={{ marginTop: 6 }} />
            </div>
          </div>
          <div className={styles.commentBody}>
            <LoadingSkeleton width="100%" height={13} />
            <LoadingSkeleton width="85%" height={13} style={{ marginTop: 8 }} />
          </div>
          <div className={styles.commentFooter}>
            <LoadingSkeleton width="20%" height={12} />
            <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
              <LoadingSkeleton width={70} height={28} />
              <LoadingSkeleton width={70} height={28} />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export function EditorSkeleton() {
  return (
    <div className={styles.editorContainer}>
      {/* 左侧元数据面板 */}
      <aside className={styles.metaPanel}>
        <LoadingSkeleton width="120px" height={20} />
        <div style={{ marginTop: 24 }}>
          <LoadingSkeleton width="80px" height={12} />
          <LoadingSkeleton width="100%" height={40} style={{ marginTop: 8 }} />
        </div>
        <div style={{ marginTop: 16 }}>
          <LoadingSkeleton width="80px" height={12} />
          <LoadingSkeleton width="100%" height={40} style={{ marginTop: 8 }} />
        </div>
        <div style={{ marginTop: 16 }}>
          <LoadingSkeleton width="80px" height={12} />
          <LoadingSkeleton width="100%" height={40} style={{ marginTop: 8 }} />
        </div>
        <LoadingSkeleton width="100%" height={44} style={{ marginTop: 24 }} />
      </aside>

      {/* 右侧编辑器 */}
      <main className={styles.writePanel}>
        <div className={styles.toolbarSkeleton}>
          <LoadingSkeleton width={200} height={32} />
          <LoadingSkeleton width={250} height={32} />
        </div>
        <div style={{ padding: 24, flex: 1 }}>
          {Array.from({ length: 15 }).map((_, i) => (
            <LoadingSkeleton 
              key={i} 
              width={`${Math.random() * 30 + 70}%`} 
              height={14}
              style={{ marginBottom: 12 }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}

export function StatsDashboardSkeleton() {
  return (
    <div className={styles.statsGrid}>
      {[1, 2, 3].map((item) => (
        <div key={item} className={styles.statCard}>
          <LoadingSkeleton width="80px" height={14} />
          <LoadingSkeleton width="60px" height={36} style={{ marginTop: 12 }} />
        </div>
      ))}
    </div>
  );
}
