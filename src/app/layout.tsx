import React, { Suspense } from 'react';
import Navbar from '@/components/Navbar';
import FloatingHub from '@/components/FloatingHub';
import InteractiveFluid from '@/components/InteractiveFluid';
import '@/styles/globals.css';

export const metadata = {
  title: '虫虫OvO - 个人空间',
  description: '这里是关于技术探索、前沿编码、全栈开发及个人生活随想的数字花园。',
  keywords: 'Next.js, SQLite, TypeScript, Web3, 个人博客, 极客写作',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>
        {/* 智能物理流体烟霭背景天幕 */}
        <InteractiveFluid />

        <div className="app-container">
          {/* 极简主义 Fixed 顶栏 */}
          <Suspense fallback={<div style={{ height: '70px', opacity: 0 }} />}>
            <Navbar />
          </Suspense>

          {/* 页面主视图 */}
          <main className="main-content">{children}</main>

          {/* 智能进度环悬浮控制中心 */}
          <FloatingHub />

          {/* 底部 */}
          <footer className="footer">
            <p>
              © {new Date().getFullYear()} 虫虫OvO. Built with{' '}
              <a href="https://nextjs.org" className="footer-link" target="_blank" rel="noreferrer">
                Next.js
              </a>{' '}
              &{' '}
              <a href="https://sqlite.org" className="footer-link" target="_blank" rel="noreferrer">
                SQLite
              </a>
            </p>
            <p style={{ fontSize: '0.8rem', marginTop: '0.5rem', opacity: 0.6 }}>
              自豪地采用极简静态与动态融合架构呈献
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
