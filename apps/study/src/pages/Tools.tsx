import { ExternalLink, Wrench } from 'lucide-react';

const TOOLS = [
  {
    name: '搜韵',
    url: 'https://sou-yun.cn',
    desc: '诗词创作者的必备工具：平水韵/词林正韵查询、律诗与词牌格律校验、对仗词汇、典故检索。写完一首先过一遍搜韵，格律硬伤全现形。',
    tag: '格律校验',
  },
  {
    name: '古诗文网（古文岛）',
    url: 'https://www.guwendao.net',
    desc: '带注释、译文、赏析的古籍库。本馆文本无注，遇到读不懂的篇目，去这里对照译文和背景赏析。',
    tag: '注释译文',
  },
  {
    name: '中国哲学书电子化计划',
    url: 'https://ctext.org/zh',
    desc: '学术级古籍库，可对照不同版本、查字词在全部古籍中的出处。查某个意象、某个词古人怎么用最方便。',
    tag: '版本校勘',
  },
  {
    name: '识典古籍',
    url: 'https://www.shidianguji.com',
    desc: '北大团队的古籍平台，有自动标点、AI 问答和书格原典影像，读原文遇到拦路虎时的好帮手。',
    tag: 'AI 辅助',
  },
  {
    name: '汉典',
    url: 'https://www.zdic.net',
    desc: '查字本义、引申义、古韵部归属。炼字的时候，先查这个字在古人那里有多少种用法。',
    tag: '字书韵书',
  },
  {
    name: '书格',
    url: 'https://www.shuge.org',
    desc: '高清古籍影印本。看倦了电子文本，来看看古人书页本来的样子，顺便练字。',
    tag: '原典影像',
  },
];

const RULES = [
  {
    k: '平水韵',
    v: '写近体诗押韵的标准，106 韵部。上平十五韵、下平十五韵先背常用的东、冬、江、支、微。',
  },
  { k: '词林正韵', v: '填词押韵的标准，比平水韵宽，十九部。' },
  { k: '钦定词谱', v: '查词牌格式：每牌多少字、几句、何处押韵、何处对仗。填词前必查。' },
  {
    k: '诗词格律（王力）',
    v: '薄薄一本小册子，把平仄、押韵、对仗、词牌规则讲得最清楚，入门第一本书。',
  },
];

export default function Tools() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="font-brush text-4xl mb-2 flex items-center gap-3">
        <Wrench className="w-8 h-8 text-cinnabar" /> 工具箱
      </h1>
      <p className="text-muted-foreground mb-8">
        书单管“输入”，这些管“产出”——格律、押韵、注释、版本，动笔时的外援全在这里。
      </p>

      <h2 className="text-xl font-semibold mb-4">在线工具</h2>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
        {TOOLS.map((t) => (
          <a
            key={t.name}
            href={t.url}
            target="_blank"
            rel="noreferrer"
            className="group bg-surface border rounded-lg p-5 hover:border-cinnabar/50 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold group-hover:text-cinnabar transition-colors">
                {t.name}
              </h3>
              <ExternalLink className="w-4 h-4 text-muted-foreground group-hover:text-cinnabar" />
            </div>
            <span className="inline-block mt-2 text-[11px] px-2 py-0.5 rounded-full bg-dai/10 text-dai">
              {t.tag}
            </span>
            <p className="mt-3 text-sm text-muted-foreground leading-6">{t.desc}</p>
          </a>
        ))}
      </div>

      <h2 className="text-xl font-semibold mb-4">格律常识速查</h2>
      <div className="bg-surface border rounded-lg divide-y">
        {RULES.map((r) => (
          <div key={r.k} className="p-5 flex gap-4">
            <span className="font-semibold text-cinnabar shrink-0 w-32">{r.k}</span>
            <p className="text-sm text-muted-foreground leading-6">{r.v}</p>
          </div>
        ))}
      </div>

      <div className="mt-8 bg-cinnabar/[0.05] border border-cinnabar/20 rounded-lg p-5 text-sm leading-7">
        <strong className="text-cinnabar">学习顺序建议：</strong>
        先把《声律启蒙》《笠翁对韵》读出对仗的直觉，再读王力《诗词格律》建立规则概念，
        之后每次动笔写诗用搜韵校验——语感、规则、工具，三者齐了才算会写。
      </div>
    </div>
  );
}
