import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';
import { publishedPosts } from '../../lib/blog';

const fonts = ([400, 700] as const).map((weight) => ({
  name: 'Inter',
  weight,
  style: 'normal' as const,
  data: readFileSync(join(process.cwd(), 'node_modules/@fontsource/inter/files', `inter-latin-${weight}-normal.woff`)),
}));

export async function getStaticPaths() {
  const posts = await publishedPosts();
  return [
    { params: { slug: 'default' }, props: { title: 'Engineering Notes', subtitle: 'System designs, runbooks and technical writing', kind: 'docs' } },
    ...posts.map((post) => ({
      params: { slug: post.id },
      props: { title: post.data.title, subtitle: post.data.description, kind: post.data.kind },
    })),
  ];
}

export async function GET({ props }: { props: { title: string; subtitle: string; kind: string } }) {
  const { title, subtitle, kind } = props;
  const node = {
    type: 'div',
    props: {
      style: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '72px',
        color: '#e8eaf4',
        background: 'linear-gradient(135deg, #0a0c13 0%, #1b1440 55%, #0b2a3a 100%)',
        fontFamily: 'Inter',
      },
      children: [
        {
          type: 'div',
          props: {
            style: { display: 'flex', alignItems: 'center', gap: '16px', fontSize: '28px', color: '#98a1bb' },
            children: [
              { type: 'div', props: { style: { width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, #8b6cff, #22d3ee)' } } },
              { type: 'div', props: { children: `Engineering Notes · ${kind}` } },
            ],
          },
        },
        {
          type: 'div',
          props: {
            style: { display: 'flex', flexDirection: 'column', gap: '24px' },
            children: [
              { type: 'div', props: { style: { fontSize: title.length > 48 ? '60px' : '76px', fontWeight: 700, lineHeight: 1.05, letterSpacing: '-0.03em' }, children: title } },
              { type: 'div', props: { style: { fontSize: '30px', color: '#98a1bb', lineHeight: 1.35 }, children: subtitle.slice(0, 140) } },
            ],
          },
        },
        { type: 'div', props: { style: { fontSize: '24px', color: '#22d3ee' }, children: 'dai-3235.github.io/docs' } },
      ],
    },
  };
  const svg = await satori(node as never, { width: 1200, height: 630, fonts });
  const png = new Resvg(svg).render().asPng();
  return new Response(png, { headers: { 'Content-Type': 'image/png' } });
}
