'use client';

import React, { Component, ErrorInfo, ReactNode } from 'react';
import styles from './ErrorBoundary.module.css';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

class AdminErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('管理后台捕获到未处理的异常:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    
    // 尝试刷新页面
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className={styles.container}>
          <div className={styles.content}>
            <div className={styles.icon}>⚠️</div>
            <h1 className={styles.title}>管理后台遇到意外错误</h1>
            <p className={styles.message}>
              抱歉，管理后台在渲染时遇到了问题。这可能是由于：
            </p>
            
            <ul className={styles.reasons}>
              <li>网络连接中断导致数据加载失败</li>
              <li>组件状态不一致或数据格式异常</li>
              <li>浏览器缓存损坏或插件冲突</li>
              <li>服务器端API接口返回了非预期数据</li>
            </ul>

            {this.state.error && (
              <details className={styles.details}>
                <summary>技术细节（开发者调试用）</summary>
                <pre className={styles.errorLog}>
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}

            <div className={styles.actions}>
              <button 
                onClick={this.handleReset}
                className={styles.primaryBtn}
              >
                🔄 刷新页面重试
              </button>
              
              <a 
                href="/admin"
                className={styles.secondaryBtn}
              >
                🏠 返回首页
              </a>

              {process.env.NODE_ENV === 'development' && (
                <button
                  onClick={() => this.setState({ hasError: false })}
                  className={styles.devBtn}
                >
                  🔧 开发模式：忽略错误继续（仅开发环境）
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AdminErrorBoundary;
