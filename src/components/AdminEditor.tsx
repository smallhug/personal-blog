'use client';

import React, { useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import styles from './AdminEditor.module.css';

interface AdminEditorProps {
  initialSlug?: string; // 如果是编辑文章，传入 slug
}

export default function AdminEditor({ initialSlug }: AdminEditorProps) {
  // 1. 文章核心元数据与状态
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState('DRAFT'); // DRAFT, PUBLISHED
  const [content, setContent] = useState('');
  
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // 2. 本地自动保存缓存与恢复
  useEffect(() => {
    // 如果是新建文章且本地有未保存的草稿，提示恢复
    if (!initialSlug) {
      const saved = localStorage.getItem('autosave_new_post');
      if (saved) {
        try {
          const { title: sTitle, tags: sTags, content: sContent, slug: sSlug } = JSON.parse(saved);
          if (sContent || sTitle) {
            if (window.confirm('💡 检测到本地有未保存的文章草稿，是否恢复？')) {
              setTitle(sTitle || '');
              setTags(sTags || '');
              setContent(sContent || '');
              setSlug(sSlug || '');
            } else {
              localStorage.removeItem('autosave_new_post');
            }
          }
        } catch (e) {
          console.error('解析缓存草稿失败', e);
        }
      }
    } else {
      // 获取编辑文章的初始数据
      fetchPostData(initialSlug);
    }
  }, [initialSlug]);

  // 监听内容改变自动保存
  useEffect(() => {
    if (!initialSlug && (content || title)) {
      const draft = { title, tags, content, slug };
      localStorage.setItem('autosave_new_post', JSON.stringify(draft));
    }
  }, [title, tags, content, slug, initialSlug]);

  const fetchPostData = async (postSlug: string) => {
    try {
      const res = await fetch(`/api/admin/posts?slug=${postSlug}`);
      if (res.ok) {
        const { meta, content: postContent } = await res.json();
        setTitle(meta.title || '');
        setSlug(meta.slug || '');
        setTags(meta.tags ? meta.tags.join(', ') : '');
        setStatus(meta.status || 'DRAFT');
        setContent(postContent || '');
      } else {
        setMessage({ type: 'error', text: '加载文章数据失败' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '获取文章详情网络异常' });
    }
  };

  // 3. 拖拽 & 本地 Markdown 文件导入解析 (YAML Frontmatter 解析)
  const handleFileImport = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = (e.target?.result as string) || '';
      
      // 正则匹配 YAML Frontmatter --- ... ---
      const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
      const match = text.match(frontmatterRegex);

      if (match) {
        const yamlStr = match[1];
        const markdownBody = match[2];

        // 简易 YAML 解析器
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
        // 无 YAML 头，直接当成正文导入
        setTitle(file.name.replace(/\.mdx?$/, ''));
        setSlug(file.name.replace(/\.mdx?$/, '').toLowerCase().replace(/[^a-z0-9]+/g, '-'));
        setContent(text.trim());
      }
      setMessage({ type: 'success', text: '🎉 本地 Markdown 导入解析成功！' });
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

  // 4. 图片文件本地上传与光标注入
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
        body: formData,
      });

      if (res.ok) {
        const data = await res.json();
        const imageUrl = data.url;

        // 在 Textarea 光标处注入 Markdown 图片语法
        const textarea = textareaRef.current;
        if (textarea) {
          const start = textarea.selectionStart;
          const end = textarea.selectionEnd;
          const insertedText = `![${file.name.replace(/\.[^/.]+$/, '')}](${imageUrl})`;
          
          const newContent = content.slice(0, start) + insertedText + content.slice(end);
          setContent(newContent);
          
          // 重新定位光标至图片语法后
          setTimeout(() => {
            textarea.focus();
            textarea.setSelectionRange(start + insertedText.length, start + insertedText.length);
          }, 50);
        } else {
          setContent((prev) => `${prev}\n\n![${file.name.replace(/\.[^/.]+$/, '')}](${imageUrl})\n`);
        }
        setMessage({ type: 'success', text: '图片上传成功并已注入编辑器！' });
      } else {
        setMessage({ type: 'error', text: '图片保存失败' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '图片上传网络故障，请检查服务端' });
    } finally {
      setUploading(false);
    }
  };

  // 5. 编辑器快捷栏按钮
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

  // 6. 保存至 SQLite & 文件
  const handleSave = async (forceOverwrite = false) => {
    if (!title.trim() || !slug.trim()) {
      setMessage({ type: 'error', text: '标题与 Slug 链接名不能为空哦' });
      return;
    }

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch('/api/admin/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          slug: slug.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '-'),
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          status,
          content,
          isEdit: !!initialSlug,
          forceOverwrite,
        }),
      });

      const data = await res.json();

      if (res.status === 409) {
        // Slug 冲突防护警告
        if (window.confirm(`⚠️ 检测到 Slug 链接名冲突！\n\n您是否要选择：\n【确定】强制覆盖已有文章（旧文件将自动备份到 backup 文件夹中）？\n【取消】返回修改链接名？`)) {
          handleSave(true);
        } else {
          setSaving(false);
        }
        return;
      }

      if (res.ok) {
        setMessage({ type: 'success', text: '🎉 文章保存并同步写入本地磁盘成功！' });
        if (!initialSlug) {
          localStorage.removeItem('autosave_new_post');
          // 新建保存成功，跳转编辑页面
          setTimeout(() => {
            window.location.href = `/admin?edit=${slug}`;
          }, 1000);
        }
      } else {
        setMessage({ type: 'error', text: data.message || '保存失败' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '网络交互错误，请检查服务端连接' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className={styles.editorContainer} onDragOver={handleDragOver} onDrop={handleDrop}>
      {/* 左栏：配置元数据面板 */}
      <aside className={`${styles.metaPanel} glass-card`}>
        <h3 className={styles.sectionHeader}>博文设置</h3>
        
        {/* 本地拖拽导入区 */}
        <div
          className={styles.dropZone}
          onClick={() => fileInputRef.current?.click()}
          title="点击或拖拽本地 Markdown 文件上传"
        >
          📂 拖拽或点击导入本地 MD 文件
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

        <div className={styles.formGroup}>
          <label className={styles.label}>文章标题</label>
          <input
            type="text"
            className={styles.input}
            placeholder="请输入文章标题"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>Slug 链接名 (URL 后缀)</label>
          <input
            type="text"
            className={styles.input}
            placeholder="my-first-post"
            value={slug}
            onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]+/g, '-'))}
            disabled={!!initialSlug} // 编辑时不可变，防破坏已发布的 SEO 链接
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>文章标签 (英文逗号分隔)</label>
          <input
            type="text"
            className={styles.input}
            placeholder="React, Nextjs, CSS"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        <div className={styles.formGroup}>
          <label className={styles.label}>发布生命周期</label>
          <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="DRAFT">📁 保存为本地草稿</option>
            <option value="PUBLISHED">🚀 公开正式发布</option>
          </select>
        </div>

        {message && <div className={`${styles.alert} ${styles[message.type]}`}>{message.text}</div>}

        <button className="btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={() => handleSave(false)} disabled={saving}>
          {saving ? '⚡ 正在保存...' : '💾 保存文章'}
        </button>
      </aside>

      {/* 右栏：双栏双端写作/预览面板 */}
      <main className={`${styles.writePanel} glass-card`}>
        <div className={styles.toolbar}>
          <div className={styles.tabButtons}>
            <button className={`${styles.tabBtn} ${activeTab === 'write' ? styles.tabActive : ''}`} onClick={() => setActiveTab('write')}>
              ✍️ 撰写内容
            </button>
            <button className={`${styles.tabBtn} ${activeTab === 'preview' ? styles.tabActive : ''}`} onClick={() => setActiveTab('preview')}>
              👁️ 实时预览
            </button>
          </div>

          <div className={styles.editorControls}>
            {/* 快捷排版动作 */}
            <button className={styles.toolBtn} onClick={() => insertShortcut('**', '**')} title="加粗">B</button>
            <button className={styles.toolBtn} onClick={() => insertShortcut('*', '*')} title="斜体">*</button>
            <button className={styles.toolBtn} onClick={() => insertShortcut('### ')} title="三级标题">H3</button>
            <button className={styles.toolBtn} onClick={() => insertShortcut('[链接描述](', ')') } title="超链接">🔗</button>
            <button className={styles.toolBtn} onClick={() => insertShortcut('```\n', '\n```')} title="代码块">&lt;/&gt;</button>
            
            {/* 本地插图快捷插入 */}
            <label className={`${styles.toolBtn} ${uploading ? styles.disabled : ''}`} title="插入图片">
              🖼️ {uploading ? '...' : ''}
              <input type="file" className={styles.hiddenFile} accept="image/*" onChange={handleImageUpload} disabled={uploading} />
            </label>
          </div>
        </div>

        {activeTab === 'write' ? (
          <textarea
            ref={textareaRef}
            className={styles.textarea}
            value={content}
            placeholder="使用 Markdown 自由地创作您的博客内容吧..."
            onChange={(e) => setContent(e.target.value)}
          />
        ) : (
          <div
            className={styles.previewArea}
            dangerouslySetInnerHTML={{ __html: marked.parse(content || '*暂无内容，快写点什么吧～*') }}
          />
        )}
      </main>
    </div>
  );
}
