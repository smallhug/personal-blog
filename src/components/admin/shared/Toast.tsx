'use client';

import React, { useEffect, useState, createContext, useContext, useCallback, useMemo } from 'react';
import styles from './Toast.module.css';

type ToastType = 'success' | 'error' | 'warning' | 'info';
type ToastPosition = 'top-right' | 'top-center' | 'bottom-right' | 'bottom-center';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
  isExiting?: boolean; // 正在退场标记
}

interface ToastContextType {
  showToast: (type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}

export default function ToastContainer({ 
  position = 'top-right',
  maxToasts = 5,
  children 
  // 省略了对 ToastPosition 的重新声明，因为在前面已有声明
}: { 
  position?: ToastPosition; 
  maxToasts?: number; 
  children?: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const startExitAnimation = useCallback((id: string) => {
    // 1. 首先标记状态为正在退出，触发 CSS exiting 淡出且缩小高度动画
    setToasts(prev => prev.map(t => t.id === id ? { ...t, isExiting: true } : t));
    
    // 2. 延迟 250ms（等退场动画结束后）再彻底物理从 DOM 数据中移除
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 250);
  }, []);

  const showToast = useCallback((type: ToastType, message: string, duration: number = 3000) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    const newToast: Toast = { id, type, message, duration };
    
    setToasts(prev => [...prev, newToast]);

    if (duration > 0) {
      setTimeout(() => {
        startExitAnimation(id);
      }, duration);
    }
  }, [startExitAnimation]);

  const removeToast = useCallback((id: string) => {
    startExitAnimation(id);
  }, [startExitAnimation]);

  // 使用 useMemo 极其牢固地缓存 Context 传递的值对象，保证 showToast 的引用在生命周期内永不动荡
  const contextValue = useMemo(() => ({ showToast }), [showToast]);

  const visibleToasts = toasts.slice(-maxToasts);

  return (
    <ToastContext.Provider value={contextValue}>
      {children}
      <div className={`${styles.container} ${styles[position]}`}>
        {visibleToasts.map((toast) => (
          <div
            key={toast.id}
            className={`${styles.toast} ${styles[toast.type]} ${toast.isExiting ? styles.exiting : ''}`}
            role="alert"
            aria-live="polite"
          >
            <span className={styles.icon}>
              {toast.type === 'success' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
                  <polyline points="22 4 12 14.01 9 11.01"></polyline>
                </svg>
              )}
              {toast.type === 'error' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="15" y1="9" x2="9" y2="15"></line>
                  <line x1="9" y1="9" x2="15" y2="15"></line>
                </svg>
              )}
              {toast.type === 'warning' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                  <line x1="12" y1="9" x2="12" y2="13"></line>
                  <line x1="12" y1="17" x2="12.01" y2="17"></line>
                </svg>
              )}
              {toast.type === 'info' && (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              )}
            </span>
            <span className={styles.message}>{toast.message}</span>
            <button 
              className={styles.closeBtn}
              onClick={() => removeToast(toast.id)}
              aria-label="关闭"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
