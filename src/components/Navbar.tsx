'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import styles from './Navbar.module.css';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const inputRef = useRef<HTMLInputElement>(null);

  // 1. 监听滚动，改变顶栏为纯白并附加底边框
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 10) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 2. 初始化读取 URL 搜索参数
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setSearchQuery(q);
      setSearchExpanded(true);
    }
  }, [searchParams]);

  // 3. 点击展开搜索并聚焦输入框
  const toggleSearch = () => {
    if (searchExpanded) {
      if (searchQuery.trim()) {
        router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
      } else {
        setSearchExpanded(false);
      }
    } else {
      setSearchExpanded(true);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <nav className={`${styles.navbar} ${isScrolled ? styles.scrolled : ''}`}>
      <div className={styles.inner}>
        {/* 左侧 Logo (包含头像) 与 GitHub 链接 */}
        <div className={styles.logoContainer}>
          <a href="/" className={styles.logo}>
            <span className={styles.avatarWrapper}>
              <svg className={styles.avatar} viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="38" fill="#fafafa" stroke="#eaeaea" strokeWidth="1" />
                <text x="50%" y="55%" dominantBaseline="middle" textAnchor="middle" fill="#0f766e" fontSize="24" fontWeight="700">
                  🐛
                </text>
              </svg>
            </span>
            <span className={styles.logoText}>虫虫OvO</span>
          </a>

          <a 
            href="https://github.com" 
            target="_blank" 
            rel="noreferrer" 
            className={styles.githubLink} 
            title="查看我的 GitHub"
          >
            <svg 
              xmlns="http://www.w3.org/2000/svg" 
              width="18" 
              height="18" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="2.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            >
              <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"></path>
              <path d="M9 18c-4.51 2-5-2-7-2"></path>
            </svg>
          </a>
        </div>

        {/* 右侧导航与搜索 */}
        <div className={styles.rightSide}>
          {/* 极简伸缩搜索框 */}
          <div className={`${styles.searchContainer} ${searchExpanded ? styles.expanded : ''}`}>
            <input
              ref={inputRef}
              type="text"
              placeholder="搜索文章..."
              className={styles.searchInput}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onBlur={() => {
                if (!searchQuery.trim()) {
                  setSearchExpanded(false);
                }
              }}
            />
            <button 
              onClick={toggleSearch} 
              className={styles.searchBtn} 
              aria-label="Search"
              title="搜索文章"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <path d="m21 21-4.3-4.3"></path>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
}
