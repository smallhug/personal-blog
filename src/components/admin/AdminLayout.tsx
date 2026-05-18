'use client';

import React, { useState, useEffect } from 'react';
import Sidebar, { NavItem } from './Sidebar';
import styles from './AdminLayout.module.css';

interface PageConfig {
  id: string;
  title: string;
  subtitle?: string;
}

const pageConfigs: Record<string, PageConfig> = {
  dashboard: {
    id: 'dashboard',
    title: '📊 数据中心',
    subtitle: '掌握博客的流量与评论动态',
  },
  write: {
    id: 'write',
    title: '✍️ 博文撰写面板',
    subtitle: '创作和管理您的博客文章',
  },
  comments: {
    id: 'comments',
    title: '💬 评论审核中心',
    subtitle: '管理访客留言和评论审核',
  },
};

interface AdminLayoutProps {
  children: React.ReactNode;
  initialPage?: string;
  pendingCommentsCount?: number;
  onPageChange?: (pageId: string) => void;
}

export default function AdminLayout({ 
  children, 
  initialPage = 'dashboard',
  pendingCommentsCount = 0,
  onPageChange 
}: AdminLayoutProps) {
  const [activePage, setActivePage] = useState(initialPage);
  const [isMobile, setIsMobile] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (initialPage !== activePage) {
      setActivePage(initialPage);
    }
  }, [initialPage]);

  const handleNavigate = (pageId: string) => {
    setActivePage(pageId);
    
    if (onPageChange) {
      onPageChange(pageId);
    }
    
    if (isMobile) {
      setMobileMenuOpen(false);
    }
  };

  const currentPageConfig = pageConfigs[activePage] || pageConfigs.dashboard;

  const navItems: NavItem[] = [
    { 
      id: 'dashboard', 
      label: '数据中心', 
      icon: '📊' 
    },
    { 
      id: 'write', 
      label: '博文撰写', 
      icon: '✍️' 
    },
    { 
      id: 'comments', 
      label: '评论审核', 
      icon: '💬',
      badge: pendingCommentsCount 
    },
  ];

  return (
    <div className={`${styles.layout} admin-root-container`}>
      {/* 移动端遮罩层 */}
      {isMobile && mobileMenuOpen && (
        <div 
          className={styles.overlay}
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* 下方区域：左侧导航 + 右侧内容 */}
      <div className={styles.body}>
        {/* 左侧导航栏 */}
        <Sidebar
          activeItem={activePage}
          onNavigate={handleNavigate}
          pendingCommentsCount={pendingCommentsCount}
        />

        {/* 右侧主内容区 */}
        <main className={`${styles.content} admin-page-transition`}>
          {children}
        </main>
      </div>
    </div>
  );
}

export type { PageConfig };
