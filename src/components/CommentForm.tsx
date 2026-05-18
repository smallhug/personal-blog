'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './CommentForm.module.css';

interface CommentFormProps {
  postSlug: string;
  parentId?: string;
  onSuccess: () => void;
}

const contactOptions = [
  { value: 'email', label: '邮箱' },
  { value: 'qq', label: 'QQ号' },
  { value: 'phone', label: '手机号' },
  { value: 'wechat', label: '微信号' },
];

const STORAGE_KEY = 'blog_comment_user_info';

interface UserInfo {
  nickname: string;
  contactType: string;
  contactVal: string;
}

export default function CommentForm({ postSlug, parentId, onSuccess }: CommentFormProps) {
  const [nickname, setNickname] = useState('');
  const [contactType, setContactType] = useState('email');
  const [contactVal, setContactVal] = useState('');
  const [content, setContent] = useState('');

  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isFading, setIsFading] = useState(false);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<NodeJS.Timeout | null>(null);
  const saveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const messageTimerRef = useRef<NodeJS.Timeout | null>(null);

  const currentLabel = contactOptions.find(opt => opt.value === contactType)?.label || '邮箱';

  const showMessage = useCallback((type: 'success' | 'error', text: string) => {
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setIsFading(false);
    setMessage({ type, text });

    messageTimerRef.current = setTimeout(() => {
      setIsFading(true);
    }, 1000);

    closeTimerRef.current = setTimeout(() => {
      setIsFading(false);
      setMessage(null);
    }, 2000);
  }, []);

  const saveUserInfo = useCallback((data: Partial<UserInfo>) => {
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
    }
    saveTimerRef.current = setTimeout(() => {
      const userInfo: UserInfo = {
        nickname,
        contactType,
        contactVal,
        ...data,
      };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(userInfo));
      } catch (e) {
        console.warn('保存用户信息失败:', e);
      }
    }, 500);
  }, [nickname, contactType, contactVal]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const data: UserInfo = JSON.parse(saved);
        if (data.nickname) setNickname(data.nickname);
        if (data.contactType) setContactType(data.contactType);
        if (data.contactVal) setContactVal(data.contactVal);
      }
    } catch (e) {
      console.warn('恢复用户信息失败:', e);
    }

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
      if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    };
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setDropdownOpen(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    closeTimerRef.current = setTimeout(() => {
      setDropdownOpen(false);
    }, 200);
  }, []);

  const handleSelectOption = (value: string) => {
    setContactType(value);
    setDropdownOpen(false);
    saveUserInfo({ contactType: value });
    if (closeTimerRef.current) {
      clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
  };

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
    if (messageTimerRef.current) clearTimeout(messageTimerRef.current);
    if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
    setIsFading(false);
    setMessage(null);

    const errorMsg = validate();
    if (errorMsg) {
      showMessage('error', errorMsg);
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
        showMessage('error', '📝 发言频率过快！为了防范灌水，请 30 秒后再发表评论哦。');
      } else if (res.ok) {
        showMessage('success', '🎉 评论发表成功！博主正在赶来审核的路上～');
        saveUserInfo({});
        setContent('');
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        const data = await res.json();
        showMessage('error', data.message || '发表评论失败，请重试');
      }
    } catch (err) {
      showMessage('error', '网络异常，提交失败，请稍后重试');
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
            onChange={(e) => {
              setNickname(e.target.value);
              saveUserInfo({ nickname: e.target.value });
            }}
            disabled={submitting}
            maxLength={20}
            required
          />
        </div>

        <div className={styles.inputGroup}>
          <label className={styles.label}>联系方式</label>
          <div className={styles.contactWrapper}>
            <div
              ref={dropdownRef}
              className={`${styles.dropdown} ${dropdownOpen ? styles.dropdownOpen : ''}`}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
            >
              <div className={styles.dropdownTrigger}>
                <span>{currentLabel}</span>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
              {dropdownOpen && (
                <div className={styles.dropdownMenu}>
                  {contactOptions.map((opt) => (
                    <div
                      key={opt.value}
                      className={`${styles.dropdownItem} ${contactType === opt.value ? styles.dropdownItemActive : ''}`}
                      onClick={() => handleSelectOption(opt.value)}
                    >
                      {opt.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
            <input
              type="text"
              className={styles.inputContact}
              placeholder="请输入联系方式"
              value={contactVal}
              onChange={(e) => {
                setContactVal(e.target.value);
                saveUserInfo({ contactVal: e.target.value });
              }}
              disabled={submitting}
              required
            />
          </div>
        </div>
      </div>

      <div className={styles.inputGroup}>
        <label className={styles.label}>评论内容</label>
        <div className={styles.textareaWrapper}>
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
          <button type="submit" className={styles.submitBtn} disabled={submitting}>
            {submitting ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83"/>
              </svg>
            ) : (
              '发送'
            )}
          </button>
        </div>
      </div>

      {message && createPortal(
        <div className={`${styles.centerNotification} ${styles[message.type]} ${styles.show} ${isFading ? styles.fading : ''}`}>
          <div className={styles.notificationContent}>
            {message.type === 'success' && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                <polyline points="22 4 12 14.01 9 11.01"></polyline>
              </svg>
            )}
            {message.type === 'error' && (
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"></circle>
                <line x1="15" y1="9" x2="9" y2="15"></line>
                <line x1="9" y1="9" x2="15" y2="15"></line>
              </svg>
            )}
            <span>{message.text}</span>
          </div>
        </div>,
        document.body
      )}
    </form>
  );
}
