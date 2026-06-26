import type { APIRoute, InferGetStaticPropsType } from 'astro';
import { getCollection } from 'astro:content';
import satori from 'satori';
import sharp from 'sharp';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { OG_COLORS } from '../../lib/og-tokens';

// 解决 Monorepo 依赖提升导致的 node_modules 路径变化问题
function findHoistedFile(relPath: string) {
  let current = process.cwd();
  while (true) {
    const full = join(current, relPath);
    if (existsSync(full)) return full;
    const parent = join(current, '..');
    if (parent === current) break;
    current = parent;
  }
  return join(process.cwd(), relPath);
}

// Lazy-loaded on first GET call — avoids blocking worker thread at module evaluation time
// satori uses opentype.js which supports TTF/OTF/WOFF but not WOFF2
let fontNoto: Buffer | null = null;
let fontCormorant: Buffer | null = null;
function loadFonts() {
  if (!fontNoto) {
    fontNoto = readFileSync(
      findHoistedFile('node_modules/@fontsource/noto-serif-sc/files/noto-serif-sc-chinese-simplified-400-normal.woff')
    );
  }
  if (!fontCormorant) {
    fontCormorant = readFileSync(
      findHoistedFile('node_modules/@fontsource/cormorant-garamond/files/cormorant-garamond-latin-600-normal.woff')
    );
  }
  return { fontNoto: fontNoto!, fontCormorant: fontCormorant! };
}

export async function getStaticPaths() {
  const posts = await getCollection('posts', ({ data }) => !data.draft);
  return posts.map((post) => ({
    params: { slug: post.id },
    props: { post },
  }));
}

type Props = InferGetStaticPropsType<typeof getStaticPaths>;

export const GET: APIRoute<Props> = async ({ props }) => {
  const { fontNoto, fontCormorant } = loadFonts();
  const { title, description, category } = props.post.data;

  const titleFontSize = title.length > 14 ? 48 : title.length > 8 ? 60 : 72;

  // Plain object VNodes — satori accepts { type, props } without React
  const element = {
    type: 'div',
    props: {
      style: {
        display: 'flex',
        flexDirection: 'row' as const,
        width: '1200px',
        height: '630px',
        background: OG_COLORS.paper,
      },
      children: [
        // Left ochre accent bar
        {
          type: 'div',
          props: {
            style: { width: '5px', background: OG_COLORS.ochre, flexShrink: 0 },
            children: null,
          },
        },
        // Main content area
        {
          type: 'div',
          props: {
            style: {
              display: 'flex',
              flexDirection: 'column' as const,
              flex: 1,
              padding: '72px 90px',
            },
            children: [
              // Category label
              {
                type: 'div',
                props: {
                  style: {
                    fontFamily: 'Noto Serif SC',
                    fontSize: '22px',
                    color: OG_COLORS.ochre,
                    marginBottom: '28px',
                    letterSpacing: '0.1em',
                    flexShrink: 0,
                  },
                  children: category,
                },
              },
              // Title
              {
                type: 'div',
                props: {
                  style: {
                    fontFamily: 'Noto Serif SC',
                    fontSize: `${titleFontSize}px`,
                    fontWeight: 400,
                    color: OG_COLORS.ink,
                    lineHeight: 1.3,
                    flex: 1,
                  },
                  children: title,
                },
              },
              // Description
              {
                type: 'div',
                props: {
                  style: {
                    fontFamily: 'Noto Serif SC',
                    fontSize: '24px',
                    color: OG_COLORS.inkSoft,
                    lineHeight: 1.7,
                    marginBottom: '40px',
                    flexShrink: 0,
                  },
                  children: description.length > 60 ? description.slice(0, 59) + '…' : description,
                },
              },
              // Footer
              {
                type: 'div',
                props: {
                  style: {
                    display: 'flex',
                    flexDirection: 'row' as const,
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderTop: `1px solid ${OG_COLORS.line}`,
                    paddingTop: '24px',
                    flexShrink: 0,
                  },
                  children: [
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontFamily: 'Cormorant Garamond',
                          fontSize: '34px',
                          fontWeight: 600,
                          color: OG_COLORS.ink,
                          letterSpacing: '0.02em',
                        },
                        children: 'newmaybe.',
                      },
                    },
                    {
                      type: 'div',
                      props: {
                        style: {
                          fontFamily: 'Cormorant Garamond',
                          fontSize: '20px',
                          color: OG_COLORS.inkFaint,
                          letterSpacing: '0.04em',
                        },
                        children: 'newmaybe.com',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      ],
    },
  } as any;

  const svg = await satori(element, {
    width: 1200,
    height: 630,
    fonts: [
      { name: 'Noto Serif SC', data: fontNoto, weight: 400, style: 'normal' },
      { name: 'Cormorant Garamond', data: fontCormorant, weight: 600, style: 'normal' },
    ],
  });

  const png = await sharp(Buffer.from(svg)).png().toBuffer();

  return new Response(new Uint8Array(png), {
    headers: { 'Content-Type': 'image/png' },
  });
};
