'use client';

import React, { useEffect, useState } from 'react';
import styles from './CodeCopyButton.module.css';

export default function CodeCopyButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    addCopyButtons();
  }, []);

  if (!mounted) return null;

  function addCopyButtons() {
    const content = document.getElementById('article-content');
    if (!content) return;

    const codeBlocks = content.querySelectorAll('pre');
    codeBlocks.forEach((pre) => {
      if (pre.querySelector(`.${styles.copyBtn}`)) return;

      const button = document.createElement('button');
      button.className = styles.copyBtn;
      button.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
        </svg>
        <span>复制</span>
      `;

      button.addEventListener('click', async () => {
        const code = pre.querySelector('code');
        if (!code) return;

        try {
          await navigator.clipboard.writeText(code.textContent || '');
          button.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>已复制</span>
          `;
          button.classList.add(styles.copied);

          setTimeout(() => {
            button.innerHTML = `
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
              </svg>
              <span>复制</span>
            `;
            button.classList.remove(styles.copied);
          }, 2000);
        } catch (err) {
          console.error('复制失败:', err);
        }
      });

      pre.style.position = 'relative';
      pre.appendChild(button);
    });
  }

  return null;
}
