import { NextResponse } from 'next/server';
import { getSortedPostsData } from '@/lib/posts';

export const revalidate = 3600; // 每小时缓存生成一次，极好地减轻服务器负载

export async function GET() {
  try {
    // 1. 获取所有公开的文章列表
    const posts = getSortedPostsData().filter((p) => p.status === 'PUBLISHED');
    
    // 2. 获取基准主机名 (常规部署环境默认为本地或用户域名)
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

    // 3. 拼接 XML 字符串元素
    const feedItems = posts
      .map((post) => {
        const postUrl = `${siteUrl}/posts/${post.slug}`;
        return `    <item>
      <title><![CDATA[${post.title}]]></title>
      <link>${postUrl}</link>
      <guid isPermaLink="true">${postUrl}</guid>
      <pubDate>${new Date(post.date).toUTCString()}</pubDate>
      <description><![CDATA[${post.summary}]]></description>
      <category>${post.tags.join(', ')}</category>
    </item>`;
      })
      .join('\n');

    const rssFeed = `<?xml version="1.0" encoding="UTF-8" ?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>虫虫OvO</title>
    <link>${siteUrl}</link>
    <description>这是一个关于科技工程、全栈编码、极客艺术的沉浸式空间。</description>
    <language>zh-CN</language>
    <atom:link href="${siteUrl}/rss.xml" rel="self" type="application/rss+xml" />
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${feedItems}
  </channel>
</rss>
`;

    // 4. 返回正规的 application/xml 格式头
    return new NextResponse(rssFeed, {
      headers: {
        'Content-Type': 'application/xml; charset=utf-8',
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    console.error('RSS 订阅源生成错误:', err);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
