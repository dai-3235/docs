import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { publishedPosts } from '../lib/blog';

export async function GET(context: APIContext) {
  const posts = await publishedPosts();
  const base = import.meta.env.BASE_URL.replace(/\/$/, '');
  return rss({
    title: 'Engineering Notes',
    description: 'System designs, runbooks and technical writing.',
    site: context.site ?? 'https://dai-3235.github.io',
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.pubDate,
      link: `${base}/blog/${post.id}/`,
      categories: post.data.tags,
    })),
  });
}
