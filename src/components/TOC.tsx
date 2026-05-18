'use client';

import React, { useEffect, useState } from 'react';
import styles from './TOC.module.css';

interface TOCItem {
  id: string;
  text: string;
  level: number;
}

export default function TOC() {
  const [headings, setHeadings] = useState<TOCItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  useEffect(() => {
    // 1. 获取文章正文内的所有 H1, H2, H3 元素
    const articleContainer = document.getElementById('article-content');
    if (!articleContainer) return;

    const headingElements = articleContainer.querySelectorAll('h1, h2, h3');
    const items: TOCItem[] = [];

    headingElements.forEach((el, index) => {
      const text = el.textContent || '';
      // 如果没有 ID，则为其自动分配一个，以便做锚点跳转
      let id = el.id;
      if (!id) {
        id = `heading-${index}-${text.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-')}`;
        el.id = id;
      }
      
      const level = parseInt(el.tagName.replace('H', ''), 10);
      items.push({ id, text, level });
    });

    setHeadings(items);

    // 2. 使用 IntersectionObserver 智能追踪当前正在阅读的标题目录高亮
    const observerCallback = (entries: IntersectionObserverEntry[]) => {
      // 过滤出进入视口的标题
      const visibleEntries = entries.filter((entry) => entry.isIntersecting);
      
      if (visibleEntries.length > 0) {
        // 如果有多个标题同时出现，则激活最靠上的那个
        const topEntry = visibleEntries.reduce((prev, curr) => 
          prev.boundingClientRect.top < curr.boundingClientRect.top ? prev : curr
        );
        setActiveId(topEntry.target.id);
      }
    };

    const observerOptions = {
      root: null,
      rootMargin: '0px 0px -60% 0px', // 当标题滚动到屏幕中上部（上方 40% 的视口区域内）时触发激活
      threshold: 1.0,
    };

    const observer = new IntersectionObserver(observerCallback, observerOptions);
    headingElements.forEach((el) => observer.observe(el));

    return () => {
      observer.disconnect();
    };
  }, []);

  const handleScrollTo = (e: React.MouseEvent, id: string) => {
    e.preventDefault();
    const element = document.getElementById(id);
    if (element) {
      const offset = 80; // 考虑 sticky header 顶栏的高度
      const bodyRect = document.body.getBoundingClientRect().top;
      const elementRect = element.getBoundingClientRect().top;
      const elementPosition = elementRect - bodyRect;
      const offsetPosition = elementPosition - offset;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
      setActiveId(id);
    }
  };

  if (headings.length === 0) return null;

  return (
    <nav className={styles.tocWrapper}>
      <h3 className={styles.title}>文章目录</h3>
      <ul className={styles.list}>
        {headings.map((item) => (
          <li
            key={item.id}
            className={`${styles.item} ${styles[`level-${item.level}`]} ${
              activeId === item.id ? styles.active : ''
            }`}
          >
            <a
              href={`#${item.id}`}
              onClick={(e) => handleScrollTo(e, item.id)}
              className={styles.link}
            >
              <span className={styles.indicator} />
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
