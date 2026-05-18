'use client';

import React, { useEffect, useRef, useState, useCallback, memo } from 'react';
import { marked } from 'marked';
import Button from '../shared/Button';
import AdminCard, { CardHeader, CardBody, CardFooter } from '../shared/AdminCard';
import Modal, { ConfirmModal } from '../shared/Modal';
import { useToast } from '../shared/Toast';
import styles from './WritePage.module.css';
import {
  IconCloudUpload,
  IconFloppy,
  IconPen,
  IconEye,
  IconSplit,
  IconBold,
  IconItalic,
  IconHeading,
  IconLink,
  IconCode,
  IconImage,
  IconTrash,
  IconPencil
} from '../icons';

interface PostListMeta {
  title: string;
  slug: string;
  date: string;
  status: 'DRAFT' | 'PUBLISHED';
}

interface WritePageProps {
  editSlug?: string;
  posts?: PostListMeta[];
  loading?: boolean;
  adminToken?: string;
  onDeletePost?: (slug: string) => Promise<boolean> | Promise<void> | void;
  onPageChange?: (page: string) => void;
}

import { useAdmin } from '../shared/AdminContext';

// 使用memo包裹，避免不必要的重渲染
function WritePageComponent({ 
  editSlug: propEditSlug,
  posts: propPosts,
  loading: propLoading,
  adminToken: propAdminToken,
  onDeletePost: propOnDeletePost,
  onPageChange: propOnPageChange 
}: WritePageProps) {
  const context = useAdmin();

  // 混合上下文适配机制：优先尊重 Props 传入，无 Props 时自动无缝消费 useAdmin 全局状态
  const editSlug = propEditSlug !== undefined ? propEditSlug : context.editSlug;
  const posts = (propPosts && propPosts.length > 0) ? propPosts : context.posts;
  const loading = propLoading !== undefined ? propLoading : context.loading;
  const adminToken = propAdminToken || context.adminToken;
  const onDeletePost = propOnDeletePost || context.handleDeletePost;
  const onPageChange = propOnPageChange || (context.setActivePage as (page: string) => void);
  const { showToast } = useToast();
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState('DRAFT');
  const [content, setContent] = useState('');

  const [activeTab, setActiveTab] = useState<'write' | 'preview' | 'split'>('split');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal状态管理
  const [draftModalOpen, setDraftModalOpen] = useState(false);
  const [conflictModalOpen, setConflictModalOpen] = useState(false);
  const [pendingSlugForSave, setPendingSlugForSave] = useState<string | null>(null);

  // 历史文章弹窗控制 State
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [pendingSlugForDelete, setPendingSlugForDelete] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!editSlug) {
      const saved = localStorage.getItem('autosave_new_post');
      if (saved) {
        try {
          const { title: sTitle, tags: sTags, content: sContent, slug: sSlug } = JSON.parse(saved);
          if (sContent || sTitle) {
            setDraftModalOpen(true); // 使用Modal替代window.confirm
            // 先暂存草稿数据，等用户确认后再恢复
            window.__pendingDraft__ = { title: sTitle || '', tags: sTags || '', content: sContent || '', slug: sSlug || '' };
          }
        } catch (e) {
          console.error('解析缓存草稿失败', e);
        }
      }
    } else {
      fetchPostData(editSlug);
    }
  }, [editSlug]);

  useEffect(() => {
    if (!editSlug && (content || title)) {
      const draft = { title, tags, content, slug };
      localStorage.setItem('autosave_new_post', JSON.stringify(draft));
    }
  }, [title, tags, content, slug, editSlug]);

  const handleRestoreDraft = () => {
    if (window.__pendingDraft__) {
      setTitle(window.__pendingDraft__.title);
      setTags(window.__pendingDraft__.tags);
      setContent(window.__pendingDraft__.content);
      setSlug(window.__pendingDraft__.slug);
      delete window.__pendingDraft__;
    }
    setDraftModalOpen(false);
  };

  const handleDiscardDraft = () => {
    localStorage.removeItem('autosave_new_post');
    if (window.__pendingDraft__) {
      delete window.__pendingDraft__;
    }
    setDraftModalOpen(false);
  };

  const fetchPostData = async (postSlug: string) => {
    try {
      const res = await fetch(`/api/admin/posts?slug=${postSlug}`, {
        headers: adminToken ? { 'x-admin-token': adminToken } : {}
      });
      if (res.ok) {
        const { meta, content: postContent } = await res.json();
        setTitle(meta.title || '');
        setSlug(meta.slug || '');
        setTags(meta.tags ? meta.tags.join(', ') : '');
        setStatus(meta.status || 'DRAFT');
        setContent(postContent || '');
      } else {
        showToast('error', '加载文章数据失败');
      }
    } catch (err) {
      showToast('error', '获取文章详情网络异常');
    }
  };

  const handleFileImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      
      const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
      const match = text.match(frontmatterRegex);

      if (match) {
        const yamlStr = match[1];
        const markdownBody = match[2];

        const parsedMeta: Record<string, string> = {};
        yamlStr.split('\n').forEach((line) => {
          const parts = line.split(':');
          if (parts.length >= 2) {
            const key = parts[0].trim();
            const val = parts.slice(1).join(':').trim().replace(/^['"]|['"]$/g, '');
            parsedMeta[key] = val;
          }
        });

        setTitle(parsedMeta.title || file.name.replace(/\.mdx?$/, ''));
        setSlug(parsedMeta.slug || file.name.replace(/\.mdx?$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
        setTags(parsedMeta.tags || parsedMeta.keywords || '');
        setStatus(parsedMeta.status === 'published' ? 'PUBLISHED' : 'DRAFT');
        setContent(markdownBody.trim());
      } else {
        setTitle(file.name.replace(/\.mdx?$/, ''));
        setSlug(file.name.replace(/\.mdx?$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
        setContent(text.trim());
      }
      showToast('success', '🎉 本地 Markdown 导入解析成功！');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      handleFileImport(files[0]);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    setUploading(true);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: adminToken ? { 'x-admin-token': adminToken } : {},
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const imageUrl = data.url;

        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const insertedText = `![${file.name.replace(/\.[^/.]+$/, '')}](${imageUrl})`;
          
          const newContent = content.slice(0, start) + insertedText + content.slice(end);
          setContent(newContent);
          
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + insertedText.length, start + insertedText.length);
          }, 50);
        } else {
          setContent((prev) => `${prev}\n\n![${file.name.replace(/\.[^/.]+$/, '')}](${imageUrl})\n`);
        }
        showToast('success', '图片上传成功并已注入编辑器！');
      } else {
        showToast('error', '图片保存失败');
      }
    } catch (err) {
      showToast('error', '图片上传网络故障，请检查服务端');
    } finally {
      setUploading(false);
    }
  };

  const insertShortcut = (before: string, after: string = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selection = content.slice(start, end);
    const replacement = before + selection + after;
    
    setContent(content.slice(0, start) + replacement + content.slice(end));
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selection.length);
    }, 50);
  };

  const handleSave = async (forceOverwrite = false) => {
    if (!title.trim() || !slug.trim()) {
      showToast('error', '标题与 Slug 链接名不能空哦');
      return;
    }

    setSaving(true);

    try {
      const res = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(adminToken ? { 'x-admin-token': adminToken } : {})
        },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-'),
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          status,
          content,
          isEdit: !!editSlug,
          forceOverwrite,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        // 使用ConfirmModal替代window.confirm
        setPendingSlugForSave(slug);
        setConflictModalOpen(true);
        setSaving(false);
        return;
      }

      if (res.ok) {
        showToast('success', '🎉 博文保存并同步写入本地磁盘成功！');
        if (!editSlug) {
          localStorage.removeItem('autosave_new_post');
          // 极致无缝 SPA 跳转：更新 context 的 editSlug 并在原地自适应切换
          if (context && typeof context.setEditSlug === 'function') {
            context.setEditSlug(slug);
          }
          if (onPageChange) {
            onPageChange('write');
          }
          if (context && typeof context.fetchDashboardData === 'function') {
            context.fetchDashboardData();
          }
        } else {
          // 编辑状态下保存成功也刷新大盘列表
          if (context && typeof context.fetchDashboardData === 'function') {
            context.fetchDashboardData();
          }
        }
      } else {
        showToast('error', data.message || '保存失败');
      }
    } catch (err) {
      showToast('error', '网络交互错误，请检查服务端连接');
    } finally {
      setSaving(false);
    }
  };

  const handleEditHistoryPost = (postSlug: string) => {
    setIsHistoryModalOpen(false);
    if (context && typeof context.setEditSlug === 'function') {
       context.setEditSlug(postSlug);
    }
    fetchPostData(postSlug);
    if (onPageChange) {
      onPageChange('write');
    }
  };

  const handleDeleteConfirm = async () => {
    if (pendingSlugForDelete) {
      const success = await onDeletePost(pendingSlugForDelete);
      // 防御性判断：由于 onDeletePost 可能返回 void/undefined，只要不明确返回 false 均视作执行成功
      if (success !== false) {
        // 如果删除的是当前正在编辑的文章，则将编辑器重置为新建状态！
        if (editSlug === pendingSlugForDelete) {
          setTitle('');
          setSlug('');
          setTags('');
          setStatus('DRAFT');
          setContent('');
          if (context && typeof context.setEditSlug === 'function') {
            context.setEditSlug(undefined);
          }
        }
      }
      setDeleteConfirmOpen(false);
      setPendingSlugForDelete(null);
    }
  };

  const handleConflictConfirm = () => {
    setConflictModalOpen(false);
    if (pendingSlugForSave) {
      handleSave(true);
      setPendingSlugForSave(null);
    }
  };

  const renderEditorPane = () => (
    <div className={styles.editorPane}>
      {/* 嵌入式 Notion 风格属性面板 */}
      <div className={styles.embeddedAttrPanel}>
        {/* 1. 超大极简无边框标题输入框 */}
        <input
          type="text"
          className={styles.embeddedTitleInput}
          placeholder="在此输入博文标题..."
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        
        {/* 2. 紧凑的元数据参数格 */}
        <div className={styles.embeddedAttrGrid}>
          {/* Tags 标签 */}
          <div className={styles.embeddedAttrRow}>
            <span className={styles.embeddedAttrLabel}>🏷️ 标签</span>
            <input
              type="text"
              className={styles.embeddedAttrInput}
              placeholder="例如：生活, 极客 (用逗号分隔)"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
            />
          </div>

          {/* Slug 链接名 */}
          <div className={styles.embeddedAttrRow}>
            <span className={styles.embeddedAttrLabel}>🔗 链接名</span>
            <input
              type="text"
              className={styles.embeddedAttrInput}
              placeholder="my-post-slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-'))}
              disabled={!!editSlug}
            />
          </div>

          {/* 发布状态 */}
          <div className={styles.embeddedAttrRow}>
            <span className={styles.embeddedAttrLabel}>🟢 状态</span>
            <div className={styles.selectWrapper}>
              <select 
                className={styles.embeddedAttrSelect} 
                value={status} 
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="DRAFT">🟡 保存草稿 (Draft)</option>
                <option value="PUBLISHED">🟢 物理公开 (Publish)</option>
              </select>
            </div>
          </div>

          {/* Markdown 本地导入 */}
          <div className={styles.embeddedAttrRow}>
            <span className={styles.embeddedAttrLabel}>📂 导入 MD</span>
            <div className={styles.miniImportBtn} onClick={() => fileInputRef.current?.click()}>
              <span>点击导入 MD 文件</span>
              <input
                type="file"
                ref={fileInputRef}
                className={styles.hiddenFile}
                accept=".md,.mdx"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) handleFileImport(e.target.files[0]);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* 正文输入 */}
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={content}
        placeholder="使用 Markdown 自由地创作您的博客内容吧..."
        onChange={(e) => setContent(e.target.value)}
      />
    </div>
  );

  return (
    <div className={styles.pageContainer} onDragOver={handleDragOver} onDrop={handleDrop}>
      {/* 1. 草稿恢复确认弹窗 */}
      <ConfirmModal
        isOpen={draftModalOpen}
        onClose={handleDiscardDraft}
        onConfirm={handleRestoreDraft}
        title="发现未保存的草稿"
        message="检测到本地有未保存的文章草稿，是否恢复？"
        confirmText="恢复草稿"
        cancelText="丢弃草稿"
        variant="info"
      />

      {/* 2. Slug冲突确认弹窗 */}
      <ConfirmModal
        isOpen={conflictModalOpen}
        onClose={() => setConflictModalOpen(false)}
        onConfirm={handleConflictConfirm}
        title="Slug 链接名冲突"
        message={`确定要强制覆盖已有文章吗？旧文件将自动备份到 backup 文件夹中。`}
        confirmText="强制覆盖"
        cancelText="返回修改"
        variant="danger"
      />

      {/* 3. 彻底删除危险二次确认弹窗 */}
      <ConfirmModal
        isOpen={deleteConfirmOpen}
        onClose={() => {
          setDeleteConfirmOpen(false);
          setPendingSlugForDelete(null);
        }}
        onConfirm={handleDeleteConfirm}
        title="⚠️ 危险操作：彻底删除博文"
        message={`确定要永久删除文章 "${pendingSlugForDelete}" 吗？此操作将永久抹去磁盘 Markdown 文件和数据库记录，无法找回！`}
        confirmText="确认删除"
        cancelText="取消"
        variant="danger"
      />



      {/* ================= 核心重构 2：全宽度编辑器面板 ================= */}
      <AdminCard variant="flat" className={styles.editorCard}>
        <div className={styles.toolbar}>
          {/* 左侧：编辑/对照/预览 Tab 切换 */}
          <div className={styles.tabButtons}>
            <button
              className={`${styles.tabBtn} ${activeTab === 'write' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('write')}
              title="纯编辑模式"
            >
              <IconPen size={14} />
              <span className={styles.tabText}>纯编辑</span>
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'split' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('split')}
              title="双栏对照模式"
            >
              <IconSplit size={14} />
              <span className={styles.tabText}>双栏对照</span>
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'preview' ? styles.tabActive : ''}`}
              onClick={() => setActiveTab('preview')}
              title="纯预览模式"
            >
              <IconEye size={14} />
              <span className={styles.tabText}>纯预览</span>
            </button>
          </div>

          {/* 中间：Markdown 快捷样式辅助栏 */}
          <div className={styles.editorControls}>
            <Button variant="ghost" size="sm" onClick={() => insertShortcut('**', '**')} title="加粗">
              <IconBold size={14} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => insertShortcut('*', '*')} title="斜体">
              <IconItalic size={14} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => insertShortcut('### ')} title="三级标题">
              <IconHeading size={14} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => insertShortcut('[链接描述](', ')')} title="超链接">
              <IconLink size={14} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => insertShortcut('```\n', '\n```')} title="代码块">
              <IconCode size={14} />
            </Button>
            
            <label
              className={`${styles.toolBtn} ${uploading ? styles.disabled : ''}`}
              title="插入图片"
            >
              <IconImage size={14} />
              <input
                type="file"
                className={styles.hiddenFile}
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
              />
            </label>
          </div>

          {/* 右侧：全局整合动作按钮区 */}
          <div className={styles.actionButtons}>
            {editSlug && (
              <Button
                variant="ghost"
                size="sm"
                title="新建博文并清空内容"
                icon={<IconPen size={14} />}
                onClick={() => {
                  setTitle('');
                  setSlug('');
                  setTags('');
                  setStatus('DRAFT');
                  setContent('');
                  if (context && typeof context.setEditSlug === 'function') {
                    context.setEditSlug(undefined);
                  }
                  showToast('success', '已切入全新博文创作！');
                }}
              >
                新建文章
              </Button>
            )}

            <Button
              variant="ghost"
              size="sm"
              title="管理历史博文"
              icon={<IconPencil size={14} />}
              onClick={() => setIsHistoryModalOpen(true)}
            >
              历史文章
            </Button>

            <Button
              variant="primary"
              size="sm"
              loading={saving}
              icon={<IconFloppy size={14} />}
              onClick={() => handleSave(false)}
            >
              {saving ? '保存中...' : '保存博文'}
            </Button>
          </div>
        </div>

        {/* 主编辑渲染区 */}
        <div className={styles.editorContent}>
          {activeTab === 'split' ? (
            <div className={styles.splitGrid}>
              {renderEditorPane()}
              <div className={styles.previewPane}>
                <div
                  id="article-content"
                  className={styles.previewArea}
                  dangerouslySetInnerHTML={{
                    __html: marked.parse(content || '*暂无内容，快写点什么吧～*'),
                  }}
                />
              </div>
            </div>
          ) : activeTab === 'write' ? (
            renderEditorPane()
          ) : (
            <div
              id="article-content"
              className={styles.previewArea}
              dangerouslySetInnerHTML={{
                __html: marked.parse(content || '*暂无内容，快写点什么吧～*'),
              }}
            />
          )}
        </div>
      </AdminCard>

      {/* ================= 核心重构 3：📁 历史博文极速管理库弹窗 ================= */}
      {isHistoryModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsHistoryModalOpen(false)}>
          <div className={`${styles.historyModal} glass-card`} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>📂 历史博文管理库</h3>
              <button className={styles.closeBtn} onClick={() => setIsHistoryModalOpen(false)}>×</button>
            </div>

            <div className={styles.modalBody}>
              {loading ? (
                <div className={styles.loadingState}>正在整理博文数据...</div>
              ) : posts.length === 0 ? (
                <div className={styles.emptyState}>绿洲中尚无历史文章</div>
              ) : (
                <div className={styles.historyList}>
                  {posts
                    .slice()
                    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime())
                    .map((post) => (
                      <div key={post.slug} className={styles.historyItem}>
                        <div className={styles.historyInfo}>
                          <span className={`${styles.statusDot} ${post.status === 'PUBLISHED' ? styles.dotPub : styles.dotDraft}`} />
                          <span className={styles.historyPostTitle}>{post.title}</span>
                          <span className={styles.historyPostDate}>{post.date}</span>
                        </div>
                        <div className={styles.historyActions}>
                          <button
                            className={styles.actionBtnEdit}
                            onClick={() => handleEditHistoryPost(post.slug)}
                            title="立即载入编辑"
                          >
                            <IconPencil size={14} /> 载入
                          </button>
                          <button
                            className={styles.actionBtnDelete}
                            onClick={() => {
                              setPendingSlugForDelete(post.slug);
                              setDeleteConfirmOpen(true);
                            }}
                            title="彻底删除"
                          >
                            <IconTrash size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// 导出memo化的组件
export default memo(WritePageComponent);

// 全局临时存储（用于草稿恢复）
declare global {
  interface Window {
    __pendingDraft__?: {
      title: string;
      tags: string;
      content: string;
      slug: string;
    };
  }
}
