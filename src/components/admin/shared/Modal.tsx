'use client';

import React, { useEffect, useRef } from 'react';
import styles from './Modal.module.css';
import { IconInfo } from '../icons';

type ModalVariant = 'default' | 'danger' | 'info';
type ModalSize = 'sm' | 'md' | 'lg' | 'full';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  onConfirm?: () => void;
  confirmText?: string;
  cancelText?: string;
  variant?: ModalVariant;
  size?: ModalSize;
  showFooter?: boolean;
  closeOnOverlayClick?: boolean;
}

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  onConfirm,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'default',
  size = 'md',
  showFooter = true,
  closeOnOverlayClick = true,
}: ModalProps) {
  const modalRef = useRef<HTMLDivElement>(null);

  // ESC键关闭
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    
    // 打开时禁止背景滚动
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = '';
    };
  }, [isOpen, onClose]);

  // 聚焦管理
  useEffect(() => {
    if (isOpen && modalRef.current) {
      modalRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (closeOnOverlayClick && e.target === e.currentTarget) {
      onClose();
    }
  };

  const renderHeaderIcon = () => {
    if (variant === 'info') {
      return <IconInfo className={styles.titleIconInfo} size={20} />;
    }
    return null;
  };

  return (
    <div 
      className={styles.overlay}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div 
        ref={modalRef}
        className={`${styles.modal} ${styles[size]}`}
        tabIndex={-1}
      >
        {/* 头部 */}
        <div className={styles.header}>
          <div className={styles.titleContainer}>
            {renderHeaderIcon()}
            <h2 id="modal-title" className={styles.title}>{title}</h2>
          </div>
          <button 
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="关闭对话框"
          >
            ✕
          </button>
        </div>

        {/* 内容区 */}
        <div className={styles.body}>
          {children}
        </div>

        {/* 底部操作栏 */}
        {showFooter && (
          <div className={styles.footer}>
            <button
              className={styles.cancelBtn}
              onClick={onClose}
            >
              {cancelText}
            </button>
            {onConfirm && (
              <button
                className={`${styles.confirmBtn} ${styles[variant]}`}
                onClick={() => {
                  onConfirm();
                  onClose();
                }}
              >
                {confirmText}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// 确认对话框封装（替代window.confirm）
export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title = '确认操作',
  message,
  confirmText = '确认',
  cancelText = '取消',
  variant = 'danger' as ModalVariant,
}: {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: ModalVariant;
}) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      onConfirm={onConfirm}
      confirmText={confirmText}
      cancelText={cancelText}
      variant={variant}
      size="sm"
    >
      <p className={styles.confirmMessage}>{message}</p>
    </Modal>
  );
}
