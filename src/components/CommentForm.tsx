'use client';

import React, { useState } from 'react';
import styles from './CommentForm.module.css';

interface CommentFormProps {
  postSlug: string;
  parentId?: string;
  onSuccess: () => void;
}

export default function CommentForm({ postSlug, parentId, onSuccess }: CommentFormProps) {
  const [nickname, setNickname] = useState('');
  const [contactType, setContactType] = useState('email');
  const [contactVal, setContactVal] = useState('');
  const [content, setContent] = useState('');
  
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const validate = () => {
    if (!nickname.trim()) return '请输入一个炫酷的昵称';
    if (!contactVal.trim()) return '请输入联系方式，用以自动生成专属像素头像';
    if (!content.trim()) return '请输入评论内容';
    if (content.length > 500) return '评论内容过长，请精简在 500 字以内';

    if (contactType === 'email') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(contactVal.trim())) return '邮箱格式不正确哦';
    } else if (contactType === 'phone') {
      const phoneRegex = /^1[3-9]\d{9}$/;
      if (!phoneRegex.test(contactVal.trim())) return '手机号格式不正确哦';
    } else if (contactType === 'qq') {
      const qqRegex = /^[1-9]\d{4,11}$/;
      if (!qqRegex.test(contactVal.trim())) return 'QQ 号格式不正确哦';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    const errorMsg = validate();
    if (errorMsg) {
      setMessage({ type: 'error', text: errorMsg });
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postSlug,
          parentId: parentId || null,
          nickname: nickname.trim(),
          contact: `${contactType}:${contactVal.trim()}`,
          content: content.trim(),
        }),
      });

      if (res.status === 429) {
        setMessage({ type: 'error', text: '📝 发言频率过快！为了防范灌水，请 30 秒后再发表评论哦。' });
      } else if (res.ok) {
        setMessage({ type: 'success', text: '🎉 评论发表成功！博主正在赶来审核的路上～' });
        setContent(''); // 仅清空输入框，保留个人信息方便下次评论
        setTimeout(() => {
          onSuccess();
          setMessage(null);
        }, 1500);
      } else {
        const data = await res.json();
        setMessage({ type: 'error', text: data.message || '发表评论失败，请重试' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: '网络异常，提交失败，请稍后重试' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      <div className={styles.metaRow}>
        <div className={styles.inputGroup}>
          <label className={styles.label}>昵称</label>
          <input
            type="text"
            className={styles.input}
            placeholder="张三"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            disabled={submitting}
            maxLength={20}
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>头像绑定方式</label>
          <div className={styles.contactWrapper}>
            <select
              className={styles.select}
              value={contactType}
              onChange={(e) => setContactType(e.target.value)}
              disabled={submitting}
            >
              <option value="email">QQ/网易邮箱</option>
              <option value="qq">QQ 号码</option>
              <option value="phone">手机号</option>
              <option value="wechat">微信号码</option>
            </select>
            <input
              type="text"
              className={styles.inputContact}
              placeholder="自动生成加密像素头像"
              value={contactVal}
              onChange={(e) => setContactVal(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
        </div>
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>评论内容</label>
        <textarea
          className={styles.textarea}
          placeholder="撰写友善的评论，交流技术与想法..."
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={submitting}
          maxLength={500}
          required
        />
        <span className={styles.wordCount}>{content.length}/500</span>
      </div>

      {message && (
        <div className={`${styles.alert} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      <button type="submit" className="btn-primary" disabled={submitting}>
        {submitting ? '🚀 正在飞速提交...' : '提交评论'}
      </button>
    </form>
  );
}
