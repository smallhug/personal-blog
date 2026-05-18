import { NextRequest } from 'next/server';

/**
 * 校验请求 Header 或 Cookie 中是否存在正确的凭证
 * 优先采用 x-admin-token 自定义 HTTP 请求头（支持加密持久化 LocalStorage），而后降级使用安全 Cookie
 */
export function verifyAdminAuth(request: NextRequest): boolean {
  // 1. 优先读取客户端发出的自定义 x-admin-token 头
  let token = request.headers.get('x-admin-token');

  // 2. 降级读取原有的安全 Cookie 凭证
  if (!token) {
    token = request.cookies.get('admin_token')?.value || null;
  }

  const correctPassword = process.env.ADMIN_PASSWORD || 'admin123';
  return token === correctPassword;
}
