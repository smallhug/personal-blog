import { NextRequest, NextResponse } from 'next/server';

export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password } = body;
    const correctPassword = process.env.ADMIN_PASSWORD || 'admin123';

    if (password === correctPassword) {
      const response = NextResponse.json({ 
        success: true, 
        message: '认证成功，欢迎进入管理后台！' 
      });

      // 写入 HTTP-only 安全 Cookie
      response.cookies.set('admin_token', correctPassword, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 天内有效
        path: '/',
      });

      return response;
    }

    return NextResponse.json(
      { success: false, message: '管理密码校验错误，请输入正确的钥匙密码。' },
      { status: 401 }
    );
  } catch (err) {
    console.error('登录认证出错:', err);
    return NextResponse.json(
      { success: false, message: '服务器认证网关异常。' },
      { status: 500 }
    );
  }
}
