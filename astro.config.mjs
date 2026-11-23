import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import mermaid from 'astro-mermaid';

const initTheme = `
  const root = document.documentElement;
  root.dataset.accent = localStorage.getItem('accent') || 'violet';
`;

export default defineConfig({
  site: 'https://dai-3235.github.io',
  base: '/docs',
  trailingSlash: 'always',
  integrations: [
    mermaid({
      theme: 'base',
      autoTheme: false,
      mermaidConfig: {
        fontFamily: 'Inter Variable, system-ui, sans-serif',
        flowchart: { curve: 'basis', padding: 16, nodeSpacing: 44, rankSpacing: 56, htmlLabels: true },
        sequence: { actorMargin: 60, messageMargin: 36, mirrorActors: false },
        themeVariables: { fontFamily: 'Inter Variable, system-ui, sans-serif', fontSize: '15px' },
      },
    }),
    starlight({
      title: 'Engineering Notes',
      description: 'System designs, runbooks and technical writing.',
      favicon: '/favicon.svg',
      pagefind: false,
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/dai-3235/docs' }],
      customCss: ['./src/styles/theme.css'],
      components: {
        Search: './src/components/Search.astro',
        ThemeSelect: './src/components/ThemeSelect.astro',
        Footer: './src/components/Footer.astro',
      },
      head: [{ tag: 'script', content: initTheme }],
      expressiveCode: { themes: ['night-owl', 'github-light'], styleOverrides: { borderRadius: '12px' } },
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
