'use client';

import React, { useState } from 'react';
import { useAdmin } from '../shared/AdminContext';
import styles from '@/components/AdminDashboard.module.css';

export default function LoginPage() {
  const { login } = useAdmin();
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setErrorMsg('钥匙密码不能空噢');
      return;
    }

    try {
      setSubmitting(true);
      setErrorMsg('');
      const res = await login(password.trim());
      if (!res.success) {
        setErrorMsg(res.message || '钥匙密码校验失败，请重试');
      }
    } catch (err) {
      console.error('登录校验发生网络故障', err);
      setErrorMsg('安全网关连接超时，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.loginOverlay}>
      <form onSubmit={handleSubmit} className={styles.loginCard}>
        <div className={styles.loginIcon}>
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
          </svg>
        </div>

        <input
          type="password"
          placeholder="请输入密钥"
          className={styles.loginInput}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />

        {errorMsg && <div className={styles.loginError}>{errorMsg}</div>}

        <button type="submit" disabled={submitting} className={styles.loginBtn}>
          {submitting ? '安全凭证核验中...' : '登录'}
        </button>
      </form>
    </div>
  );
}
