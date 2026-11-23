import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';

export default defineConfig({
  site: 'https://dai-3235.github.io',
  base: '/docs',
  trailingSlash: 'always',
  integrations: [
    mermaid({ theme: 'neutral', autoTheme: true }),
    starlight({
      title: 'Engineering Notes',
      description: 'System designs, runbooks and technical writing.',
      favicon: '/favicon.svg',
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/dai-3235/docs' }],
      customCss: ['./src/styles/theme.css'],
      editLink: { baseUrl: 'https://github.com/dai-3235/docs/edit/main/' },
      lastUpdated: true,
      pagination: true,
      sidebar: [
        { label: 'Start', link: '/' },
        { label: 'slack-relay', items: [{ autogenerate: { directory: 'slack-relay' } }] },
        { label: 'Blog', link: '/blog/' },
      ],
    }),
  ],
});
