import rss from '@astrojs/rss';
import { getCollection } from 'astro:content';

export async function GET(context: any) {
  const posts = await getCollection('posts');
  const publishedPosts = posts
    .filter((post) => post.data.status === 'PUBLISHED')
    .sort((a, b) => new Date(b.data.date).getTime() - new Date(a.data.date).getTime());

  return rss({
    title: 'smallhug的数字空间',
    description: '一起来玩暗区喵~',
    site: context.site || 'https://smallhug.github.io',
    items: publishedPosts.map((post) => ({
      title: post.data.title,
      pubDate: new Date(post.data.date),
      description: post.data.summary || post.data.excerpt || '',
      link: `/personal-blog/posts/${post.id}/`,
    })),
    customData: `<language>zh-CN</language>`,
  });
}
