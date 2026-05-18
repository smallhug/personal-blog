'use client';

import React, { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import AdminLayout from '@/components/admin/AdminLayout';
import ToastContainer from '@/components/admin/shared/Toast';
import { ConfirmModal } from '@/components/admin/shared/Modal';
import AdminErrorBoundary from '@/components/admin/shared/ErrorBoundary';
import { AdminProvider, useAdmin } from '@/components/admin/shared/AdminContext';
import LoginPage from '@/components/admin/pages/LoginPage';
import DashboardPage from '@/components/admin/pages/DashboardPage';
import WritePage from '@/components/admin/pages/WritePage';
import CommentsPage from '@/components/admin/pages/CommentsPage';
import styles from '@/components/AdminDashboard.module.css';

function AdminContentInner() {
  const {
    isAuthenticated,
    adminToken,
    posts,
    comments,
    stats,
    loading,
    activePage,
    editSlug,
    setActivePage,
    setEditSlug,
    handleModerateComment,
    handleDeletePost
  } = useAdmin();

  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const editSlugFromUrl = searchParams.get('edit') || undefined;

  // 删除确认弹窗局部状态
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pendingDeleteSlug, setPendingDeleteSlug] = useState<string | null>(null);

  // 1. 路由双向单向同步：从物理 URL 路径同步至 React Context 状态
  useEffect(() => {
    const segments = pathname.split('/').filter(Boolean);
    
    // 如果是 /admin 根路径，自动优雅重定向到 /admin/data
    if (segments.length === 1 && segments[0] === 'admin') {
      router.replace('/admin/data');
      setActivePage('dashboard');
    } else if (segments.length === 2 && segments[0] === 'admin') {
      const subPage = segments[1];
      if (subPage === 'data') {
        setActivePage('dashboard');
      } else if (subPage === 'write') {
        setActivePage('write');
      } else if (subPage === 'comments') {
        setActivePage('comments');
      }
    }
  }, [pathname, setActivePage, router]);

  // 2. 初始化挂载时，将 edit 参数同步至全局上下文
  useEffect(() => {
    if (editSlugFromUrl) {
      setEditSlug(editSlugFromUrl);
      setActivePage('write');
    }
  }, [editSlugFromUrl, setActivePage, setEditSlug]);

  // 3. 锁定视口高度，并在后台状态下关闭全局页脚以避免高度溢出
  useEffect(() => {
    const prevBodyOverflow = document.body.style.overflow;
    const prevBodyHeight = document.body.style.height;
    
    document.body.style.overflow = 'hidden';
    document.body.style.height = '100vh';
    
    const footer = document.querySelector('.footer') as HTMLElement;
    let prevFooterDisplay = '';
    if (footer) {
      prevFooterDisplay = footer.style.display;
      footer.style.display = 'none';
    }

    return () => {
      document.body.style.overflow = prevBodyOverflow;
      document.body.style.height = prevBodyHeight;
      if (footer) {
        footer.style.display = prevFooterDisplay;
      }
    };
  }, []);

  // 统一路由与页面切换控制器
  const handlePageChange = (page: 'dashboard' | 'write' | 'comments') => {
    setActivePage(page);
    if (page === 'dashboard') {
      router.push('/admin/data');
    } else if (page === 'write') {
      if (editSlug) {
        router.push(`/admin/write?edit=${editSlug}`);
      } else {
        router.push('/admin/write');
      }
    } else if (page === 'comments') {
      router.push('/admin/comments');
    }
  };

  const handleDeleteTrigger = (slug: string) => {
    setPendingDeleteSlug(slug);
    setDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteSlug) return;
    const success = await handleDeletePost(pendingDeleteSlug);
    if (success) {
      setDeleteModalOpen(false);
      setPendingDeleteSlug(null);
    }
  };

  if (isAuthenticated === null) {
    return (
      <div className={styles.loading} style={{ padding: '8rem 0' }}>
        智能钥匙凭证静默核验中...
      </div>
    );
  }

  if (isAuthenticated === false) {
    return <LoginPage />;
  }

  return (
    <>
      {/* 极简博文删除确认弹窗 */}
      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setPendingDeleteSlug(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="⚠️ 确认删除文章"
        message={`确定要删除文章 "${pendingDeleteSlug}" 吗？此操作不可撤销，文件将被永久删除！`}
        confirmText="确认删除"
        cancelText="取消"
        variant="danger"
      />

      <AdminLayout
        initialPage={activePage}
        pendingCommentsCount={stats.pending}
        onPageChange={(page) => handlePageChange(page as 'dashboard' | 'write' | 'comments')}
      >
        {activePage === 'dashboard' ? (
          <DashboardPage />
        ) : activePage === 'write' ? (
          <WritePage
            editSlug={editSlug}
            posts={posts}
            loading={loading}
            adminToken={adminToken}
            onDeletePost={handleDeleteTrigger}
            onPageChange={(page) => handlePageChange(page as 'dashboard' | 'write' | 'comments')}
          />
        ) : (
          <CommentsPage />
        )}
      </AdminLayout>
    </>
  );
}

export default function AdminPage() {
  return (
    <AdminErrorBoundary>
      <ToastContainer position="top-right" maxToasts={5}>
        <AdminProvider>
          <Suspense fallback={<div style={{ textAlign: 'center', padding: '5rem', color: 'var(--text-secondary)' }}>正在加载管理后台...</div>}>
            <AdminContentInner />
          </Suspense>
        </AdminProvider>
      </ToastContainer>
    </AdminErrorBoundary>
  );
}
