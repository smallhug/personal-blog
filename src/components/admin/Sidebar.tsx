'use client';

import React from 'react';
import styles from './Sidebar.module.css';
import { IconPen, IconMessage, IconTotal } from './icons';

export interface NavItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
}

interface SidebarProps {
  activeItem: string;
  onNavigate: (itemId: string) => void;
  pendingCommentsCount?: number;
}

const defaultNavItems: NavItem[] = [
  { id: 'dashboard', label: '数据中心', icon: <IconTotal size={16} /> },
  { id: 'write', label: '文章撰写', icon: <IconPen size={16} /> },
  { id: 'comments', label: '评论审核', icon: <IconMessage size={16} /> },
];

export default function Sidebar({ 
  activeItem, 
  onNavigate, 
  pendingCommentsCount = 0
}: SidebarProps) {
  const navItems = defaultNavItems.map((item) =>
    item.id === 'comments'
      ? { ...item, badge: pendingCommentsCount }
      : item
  );

  return (
    <aside className={styles.sidebar}>
      {/* 导航菜单 */}
      <nav className={styles.nav}>
        <ul className={styles.navList}>
          {navItems.map((item) => (
            <li key={item.id} className={styles.navItem}>
              <button
                className={`${styles.navButton} ${
                  activeItem === item.id ? styles.active : ''
                }`}
                onClick={() => onNavigate(item.id)}
                title={item.label}
              >
                <span className={styles.navIcon}>{item.icon}</span>
                <span className={styles.navLabel}>{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className={styles.badge}>{item.badge}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      </nav>

    </aside>
  );
}
