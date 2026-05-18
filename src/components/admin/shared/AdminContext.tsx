'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { encryptToken, decryptToken } from '@/lib/crypto';
import { useToast } from './Toast';

export interface PostListMeta {
  title: string;
  slug: string;
  date: string;
  status: 'DRAFT' | 'PUBLISHED';
  tags?: string[];
}

export interface CommentMeta {
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

export interface StatsMeta {
  total: number;
  pending: number;
  approved: number;
}

interface AdminContextType {
  isAuthenticated: boolean | null;
  adminToken: string;
  posts: PostListMeta[];
  comments: CommentMeta[];
  stats: StatsMeta;
  loading: boolean;
  activePage: 'dashboard' | 'write' | 'comments';
  editSlug: string | undefined;
  setActivePage: (page: 'dashboard' | 'write' | 'comments') => void;
  setEditSlug: (slug: string | undefined) => void;
  login: (password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => void;
  fetchDashboardData: (tokenArg?: string) => Promise<void>;
  handleModerateComment: (commentId: string, action: 'APPROVE' | 'DELETE') => Promise<void>;
  handleDeletePost: (slug: string) => Promise<boolean>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const { showToast } = useToast();
  
  // 核心认证状态
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [adminToken, setAdminToken] = useState('');
  
  // 后台全局数据状态
  const [posts, setPosts] = useState<PostListMeta[]>([]);
  const [comments, setComments] = useState<CommentMeta[]>([]);
  const [stats, setStats] = useState<StatsMeta>({ total: 0, pending: 0, approved: 0 });
  const [loading, setLoading] = useState(true);

  // 路由与编辑页内存状态
  const [activePage, setActivePage] = useState<'dashboard' | 'write' | 'comments'>('dashboard');
  const [editSlug, setEditSlug] = useState<string | undefined>(undefined);

  // 全局数据归集拉取
  const fetchDashboardData = useCallback(async (tokenArg?: string) => {
    try {
      setLoading(true);
      const currentToken = tokenArg || adminToken;
      const authHeaders: Record<string, string> = currentToken ? { 'x-admin-token': currentToken } : {};

      // 1. 获取文章列表
      const postsRes = await fetch('/api/admin/posts', {
        headers: { ...authHeaders }
      });
      if (postsRes.status === 401) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      if (!postsRes.ok) {
        throw new Error(`获取文章列表失败 (状态码: ${postsRes.status})`);
      }
      const postsData = await postsRes.json();
      setPosts(postsData);

      // 2. 获取待审评论列表与统计
      const commentsRes = await fetch('/api/admin/comments', {
        headers: { ...authHeaders }
      });
      if (commentsRes.status === 401) {
        setIsAuthenticated(false);
        setLoading(false);
        return;
      }
      if (!commentsRes.ok) {
        throw new Error(`获取评论列表失败 (状态码: ${commentsRes.status})`);
      }
      const { list, stats: commentStats } = await commentsRes.json();
      setComments(list);
      setStats(commentStats);

      setIsAuthenticated(true);
    } catch (err: any) {
      console.error('获取后台全局数据故障', err);
      setIsAuthenticated(false);
      showToast('error', err.message || '大盘数据加载失败，请检查网络连接');
    } finally {
      setLoading(false);
    }
  }, [adminToken, showToast]);

  // 首次加载挂载时，从 LocalStorage 静默加解密读取管理员凭证，实现免密静默秒登
  useEffect(() => {
    const secureToken = localStorage.getItem('admin_token_secure');
    if (secureToken) {
      const decrypted = decryptToken(secureToken);
      if (decrypted) {
        setAdminToken(decrypted);
        fetchDashboardData(decrypted);
      } else {
        setIsAuthenticated(false);
        setLoading(false);
      }
    } else {
      setIsAuthenticated(false);
      setLoading(false);
    }
  }, [fetchDashboardData]);

  // 管理员登录动作
  const login = async (password: string): Promise<{ success: boolean; message?: string }> => {
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });

      const result = await res.json();
      if (res.ok && result.success) {
        // 加密凭证并持久化至 LocalStorage 保持会话
        localStorage.setItem('admin_token_secure', encryptToken(password.trim()));
        setAdminToken(password.trim());
        setIsAuthenticated(true);
        showToast('success', '验证通过！正在加载控制台...');
        fetchDashboardData(password.trim());
        return { success: true };
      } else {
        return { success: false, message: result.message || '钥匙密码校验失败，请重试' };
      }
    } catch (err) {
      console.error('安全网关连接超时:', err);
      return { success: false, message: '安全网关连接超时，请重试' };
    }
  };

  // 管理员退出动作
  const logout = () => {
    localStorage.removeItem('admin_token_secure');
    setAdminToken('');
    setIsAuthenticated(false);
    setPosts([]);
    setComments([]);
    setStats({ total: 0, pending: 0, approved: 0 });
    setActivePage('dashboard');
    setEditSlug(undefined);
    showToast('success', '您已安全退出控制台');
  };

  // 评论审批审核流程
  const handleModerateComment = async (commentId: string, action: 'APPROVE' | 'DELETE') => {
    try {
      const res = await fetch('/api/admin/comments', {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-token': adminToken 
        },
        body: JSON.stringify({ commentId, action }),
      });

      if (res.ok) {
        // 重新拉取大盘最新数据以刷新 UI 状态
        const commentsRes = await fetch('/api/admin/comments', {
          headers: { 'x-admin-token': adminToken }
        });
        if (commentsRes.ok) {
          const { list, stats: commentStats } = await commentsRes.json();
          setComments(list);
          setStats(commentStats);
          showToast('success', action === 'APPROVE' ? '评论已批准发布' : '评论已成功彻底删除');
        }
      } else {
        showToast('error', '审批动作操作失败，请重试');
      }
    } catch (err) {
      console.error('审批接口故障', err);
      showToast('error', '网络异常，审批未完成');
    }
  };

  // 文章删除接口
  const handleDeletePost = async (slug: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/admin/posts?slug=${slug}`, {
        method: 'DELETE',
        headers: {
          'x-admin-token': adminToken
        }
      });

      if (res.ok) {
        showToast('success', `文章 "${slug}" 已成功删除`);
        fetchDashboardData(); // 重新拉取以刷新列表
        return true;
      } else {
        showToast('error', '❌ 删除文章失败，请重试');
        return false;
      }
    } catch (err) {
      console.error('删除文章异常', err);
      showToast('error', '⚠️ 网络异常，删除未完成');
      return false;
    }
  };

  return (
    <AdminContext.Provider
      value={{
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
        login,
        logout,
        fetchDashboardData,
        handleModerateComment,
        handleDeletePost
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (context === undefined) {
    throw new Error('useAdmin 必须在 AdminProvider 下方使用');
  }
  return context;
}
