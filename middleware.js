import { NextResponse } from 'next/server';

export const config = {
  matcher: ['/', '/api/:path*'], // 保护主页和所有 API
};

export function middleware(req) {
  // 获取浏览器发来的账号密码
  const basicAuth = req.headers.get('authorization');
  
  // 获取环境变量里的账号密码
  const user = process.env.AUTH_USER;
  const pwd = process.env.AUTH_PASS;

  // 如果没配置密码，为了安全直接拒绝
  if (!user || !pwd) {
    return new NextResponse('Error: Please set AUTH_USER and AUTH_PASS in environment variables', { status: 401 });
  }

  if (basicAuth) {
    const authValue = basicAuth.split(' ')[1];
    // 解码
    const [u, p] = atob(authValue).split(':');

    // 验证成功
    if (u === user && p === pwd) {
      return NextResponse.next();
    }
  }

  // 验证失败，弹窗提示
  return new NextResponse('Auth Required', {
    status: 401,
    headers: {
      'WWW-Authenticate': 'Basic realm="Secure Area"',
    },
  });
}