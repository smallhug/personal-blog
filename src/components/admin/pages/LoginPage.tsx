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
        <div>
          <h2 className={styles.loginTitle}>🔑 管理员登录</h2>
          <p className={styles.loginSubtitle}>
            这是属于虫虫的私人写作花园，请输入开启之钥。
          </p>
        </div>

        <input
          type="password"
          placeholder="请输入管理员钥匙密码"
          className={styles.loginInput}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoFocus
        />

        {errorMsg && <div className={styles.loginError}>{errorMsg}</div>}

        <button type="submit" disabled={submitting} className={styles.loginBtn}>
          {submitting ? '安全凭证核验中...' : '核验并进入控制台'}
        </button>
      </form>
    </div>
  );
}
