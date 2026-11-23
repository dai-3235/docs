import { defineConfig } from 'astro/config';
import starlight from '@astrojs/starlight';
import starlightLinksValidator from 'starlight-links-validator';
import mermaid from 'astro-mermaid';
import mdx from '@astrojs/mdx';
import { unified } from '@astrojs/markdown-remark';
import icon from 'astro-icon';
import react from '@astrojs/react';
import rehypeExternalLinks from 'rehype-external-links';
import remarkGithubBlockquoteAlert from 'remark-github-blockquote-alert';
import { pluginLineNumbers } from '@expressive-code/plugin-line-numbers';
import { pluginCollapsibleSections } from '@expressive-code/plugin-collapsible-sections';

const initTheme = `
  document.documentElement.dataset.accent = localStorage.getItem('accent') || 'violet';
`;

const fontStack = 'Inter Variable, ui-sans-serif, system-ui, sans-serif';

export default defineConfig({
  site: 'https://dai-3235.github.io',
  base: '/docs',
  trailingSlash: 'always',
  markdown: {
    processor: unified({
      remarkPlugins: [remarkGithubBlockquoteAlert],
      rehypePlugins: [[rehypeExternalLinks, { target: '_blank', rel: ['noopener', 'noreferrer'], properties: { className: ['external'] } }]],
    }),
  },
  integrations: [
    mermaid({
      theme: 'base',
      autoTheme: false,
      mermaidConfig: {
        fontFamily: fontStack,
        flowchart: { curve: 'basis', padding: 18, nodeSpacing: 48, rankSpacing: 60, htmlLabels: true },
        sequence: { actorMargin: 70, messageMargin: 38, mirrorActors: false, boxMargin: 12 },
        state: { padding: 12 },
        themeVariables: { fontFamily: fontStack, fontSize: '16px' },
      },
    }),
    starlight({
      title: 'Engineering Notes',
      description: 'System designs, runbooks and technical writing.',
      favicon: '/favicon.svg',
      pagefind: false,
      plugins: [starlightLinksValidator({ errorOnRelativeLinks: false })],
      social: [{ icon: 'github', label: 'GitHub', href: 'https://github.com/dai-3235/docs' }],
      customCss: ['./src/styles/theme.css'],
      components: {
        Search: './src/components/Search.astro',
        ThemeSelect: './src/components/ThemeSelect.astro',
        Footer: './src/components/Footer.astro',
      },
      head: [
        { tag: 'script', content: initTheme },
        { tag: 'meta', attrs: { property: 'og:image', content: 'https://dai-3235.github.io/docs/og/default.png' } },
        { tag: 'meta', attrs: { name: 'twitter:card', content: 'summary_large_image' } },
        { tag: 'meta', attrs: { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' } },
        { tag: 'link', attrs: { rel: 'alternate', type: 'application/rss+xml', title: 'Engineering Notes', href: '/docs/rss.xml' } },
      ],
      expressiveCode: {
        themes: ['tokyo-night', 'github-light'],
        plugins: [pluginLineNumbers(), pluginCollapsibleSections()],
        defaultProps: { showLineNumbers: false, wrap: false },
        styleOverrides: {
          borderRadius: '12px',
          borderWidth: '1px',
          codeFontFamily: "'JetBrains Mono Variable', ui-monospace, 'SF Mono', Menlo, monospace",
          codeFontSize: '0.86rem',
          codeLineHeight: '1.7',
          codePaddingBlock: '1rem',
          codePaddingInline: '1.15rem',
          uiFontFamily: fontStack,
          frames: { frameBoxShadowCssValue: 'none' },
        },
      },
      editLink: { baseUrl: 'https://github.com/dai-3235/docs/edit/main/' },
      lastUpdated: true,
      pagination: true,
      sidebar: [
        { label: 'Start', link: '/' },
        { label: 'slack-relay', items: [{ autogenerate: { directory: 'slack-relay' } }] },
        { label: 'Blog', link: '/blog/' },
      ],
    }),
    mdx(),
    icon(),
    react(),
  ],
});
