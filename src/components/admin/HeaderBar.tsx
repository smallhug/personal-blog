'use client';

import React from 'react';
import styles from './HeaderBar.module.css';

interface HeaderBarProps {
  title: string;
  subtitle?: string;
}

export default function HeaderBar({ title, subtitle }: HeaderBarProps) {
  return (
    <header className={styles.header}>
      <div className={styles.headerContent}>
        {/* 左侧：页面标题 */}
        <div className={styles.titleSection}>
          <h1 className={styles.title}>{title}</h1>
          {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
        </div>

        {/* 右侧：操作区（预留） */}
        <div className={styles.actions}>
          {/* 可在此添加用户信息、通知铃铛等 */}
        </div>
      </div>
    </header>
  );
}
