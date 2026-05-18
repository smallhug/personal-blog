import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getPostData, getSortedPostsData } from '@/lib/posts';
import { verifyAdminAuth } from '@/lib/auth';

const postsDirectory = path.join(process.cwd(), 'content/posts');
const backupsDirectory = path.join(postsDirectory, 'backups');

// 确保备份文件夹存在
function ensureBackupsDirectory() {
  if (!fs.existsSync(backupsDirectory)) {
    fs.mkdirSync(backupsDirectory, { recursive: true });
  }
}

// 1. GET：加载所有博文列表（用于后台管理）或加载指定单篇详情
export async function GET(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ message: '安全网关拦截：未授权的后台数据读取' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  try {
    if (slug) {
      // 获取单篇文章详情
      const post = getPostData(slug);
      if (!post) {
        return NextResponse.json({ message: '博文不存在' }, { status: 404 });
      }
      return NextResponse.json(post);
    } else {
      // 获取所有文章列表（含草稿）
      const posts = getSortedPostsData();
      return NextResponse.json(posts);
    }
  } catch (err) {
    console.error('后台加载博文出错:', err);
    return NextResponse.json({ message: '后台加载博文失败' }, { status: 500 });
  }
}

// 2. POST：保存或更新文章（带 Slug 冲突拦截及强制覆盖备份机制）
export async function POST(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ message: '安全网关拦截：未授权的后台数据修改' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { title, slug, tags, status, content, isEdit, forceOverwrite } = body;

    if (!title || !slug) {
      return NextResponse.json({ message: '标题与 Slug 链接名是必填的哦' }, { status: 400 });
    }

    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
    const fileName = `${cleanSlug}.md`;
    const filePath = path.join(postsDirectory, fileName);

    // 目录确认
    if (!fs.existsSync(postsDirectory)) {
      fs.mkdirSync(postsDirectory, { recursive: true });
    }

    // A. 校验 Slug 冲突
    if (!isEdit && fs.existsSync(filePath)) {
      // 非编辑模式（即新建文章），但路径已存在同名文件，触发冲突
      if (!forceOverwrite) {
        return NextResponse.json(
          { message: '链接名 Slug 已经存在，是否强制覆盖？' },
          { status: 409 } // 冲突状态码
        );
      } else {
        // 选择强制覆盖，先备份旧文件防止博主心血丢失
        ensureBackupsDirectory();
        const oldFileContents = fs.readFileSync(filePath, 'utf-8');
        const backupFileName = `${cleanSlug}-${Date.now()}.bak.md`;
        fs.writeFileSync(path.join(backupsDirectory, backupFileName), oldFileContents, 'utf-8');
        console.log(`博文覆盖成功，旧版本已安全备份至: ${backupFileName}`);
      }
    }

    // B. 编辑模式下的安全备份（如果是修改已有文章，在覆盖写入前也先生成一个备份，确保数据绝对安全）
    if (isEdit && fs.existsSync(filePath)) {
      ensureBackupsDirectory();
      const oldContents = fs.readFileSync(filePath, 'utf-8');
      fs.writeFileSync(path.join(backupsDirectory, `${cleanSlug}-edit-${Date.now()}.bak.md`), oldContents, 'utf-8');
    }

    // C. 生成 Markdown frontmatter 元数据头并保存
    const cleanContent = content || '';
    const summary = cleanContent
      .replace(/[#*`~\[\]\(\)\-\r\n\s|]+/g, ' ')
      .slice(0, 140)
      .trim() + '...';

    const fileContent = `---
title: "${title.replace(/"/g, '\\"')}"
slug: "${cleanSlug}"
date: "${new Date().toISOString()}"
tags: "${tags.join(', ')}"
status: "${status}"
summary: "${summary.replace(/"/g, '\\"')}"
---
${cleanContent}
`;

    fs.writeFileSync(filePath, fileContent, 'utf-8');

    return NextResponse.json({ message: '博文已成功保存，并在本地磁盘同步！', slug: cleanSlug });
  } catch (err) {
    console.error('保存博文失败:', err);
    return NextResponse.json({ message: '本地磁盘写入失败，请检查服务写权限' }, { status: 500 });
  }
}

// 3. DELETE：物理彻底删除某篇文章
export async function DELETE(request: NextRequest) {
  if (!verifyAdminAuth(request)) {
    return NextResponse.json({ message: '安全网关拦截：未授权的后台数据删除' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const slug = searchParams.get('slug');

  if (!slug) {
    return NextResponse.json({ message: '文章 Slug 链接参数缺失' }, { status: 400 });
  }

  try {
    const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9_-]+/g, '-');
    const fileName = `${cleanSlug}.md`;
    const filePath = path.join(postsDirectory, fileName);

    if (fs.existsSync(filePath)) {
      // 删除前，将其备份至 backups 目录作为逻辑兜底，防止管理员手抖删错
      ensureBackupsDirectory();
      const fileContents = fs.readFileSync(filePath, 'utf-8');
      fs.writeFileSync(path.join(backupsDirectory, `${cleanSlug}-deleted-${Date.now()}.bak.md`), fileContents, 'utf-8');
      
      // 物理删除
      fs.unlinkSync(filePath);
      return NextResponse.json({ message: '博文已彻底物理删除，历史数据已安全归档备份！' });
    } else {
      return NextResponse.json({ message: '未找到指定要删除的文件' }, { status: 404 });
    }
  } catch (err) {
    console.error('物理删除博文错误:', err);
    return NextResponse.json({ message: '物理删除失败' }, { status: 500 });
  }
}
