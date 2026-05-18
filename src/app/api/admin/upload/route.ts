import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { verifyAdminAuth } from '@/lib/auth';

const uploadDir = path.join(process.cwd(), 'public/uploads');

// 确保上传目录存在
function ensureUploadDirectory() {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
}

export async function POST(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ message: '安全网关拦截：未授权的图片上传请求' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ message: '文件对象缺失' }, { status: 400 });
    }

    ensureUploadDirectory();

    // A. 过滤文件名，限制安全格式并加时间戳防止覆盖冲突
    const ext = path.extname(file.name).toLowerCase();
    const safeName = file.name
      .replace(ext, '')
      .replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]+/g, '_')
      .slice(0, 50);
    const fileName = `img_${Date.now()}_${safeName}${ext || '.png'}`;
    const filePath = path.join(uploadDir, fileName);

    // B. 将 File 转换为 Buffer 并写入服务器本地磁盘
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    fs.writeFileSync(filePath, buffer);

    // C. 返回静态文件映射可访问的 URL 路径
    const url = `/uploads/${fileName}`;
    return NextResponse.json({ url, message: '图片已成功上传并保存在本地磁盘中！' });
  } catch (err) {
    console.error('上传图片服务端错误:', err);
    return NextResponse.json({ message: '服务端图片保存失败' }, { status: 500 });
  }
}
