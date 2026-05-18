'use client';

import React, { useEffect, useState } from 'react';
import styles from './FloatingHub.module.css';

export default function FloatingHub() {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight;
      const clientHeight = document.documentElement.clientHeight;
      const totalHeight = scrollHeight - clientHeight;
      
      if (totalHeight > 0) {
        const progress = (window.scrollY / totalHeight) * 100;
        setScrollProgress(Math.min(Math.max(progress, 0), 100));
      } else {
        setScrollProgress(0);
      }

      // 滚动超过 200px 时显示悬浮组件
      if (window.scrollY > 200) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    // 初始化执行一次
    handleScroll();

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    });
  };

  // SVG 圆环参数
  const radius = 20;
  const strokeWidth = 2.5;
  const circumference = 2 * Math.PI * radius; // 约 125.66
  const strokeDashoffset = circumference - (scrollProgress / 100) * circumference;

  return (
    <div 
      className={`${styles.hubContainer} ${isVisible ? styles.visible : ''}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={scrollToTop}
      title="返回顶部"
      role="button"
      aria-label="Back to top"
    >
      {/* 动态 SVG 圆形进度条 */}
      <svg className={styles.progressRing} width="48" height="48">
        <circle
          className={styles.ringTrack}
          stroke="var(--glass-border)"
          strokeWidth={strokeWidth}
          fill="transparent"
          r={radius}
          cx="24"
          cy="24"
        />
        <circle
          className={styles.ringIndicator}
          stroke="var(--color-accent-1)"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="transparent"
          r={radius}
          cx="24"
          cy="24"
        />
      </svg>

      {/* 中心交互内容 */}
      <div className={styles.centerWidget}>
        {isHovered ? (
          <span className={styles.arrowIcon}>↑</span>
        ) : (
          <span className={styles.progressText}>
            {Math.round(scrollProgress)}
            <span className={styles.percentSymbol}>%</span>
          </span>
        )}
      </div>
    </div>
  );
}
