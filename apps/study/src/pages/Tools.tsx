import { Link } from 'react-router';
import { ChevronRight, ExternalLink, Wrench } from 'lucide-react';

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
    k: '近体诗怎么押韵',
    v: '从平水韵的来历和 106 个韵部入手，理解律诗、绝句为何通常押平声韵。',
    source: '《诗词格律》· 平水韵',
    to: '/book/shicigelv/read/22',
  },
  {
    k: '填词怎么押韵',
    v: '词韵通常比诗韵宽。馆内章节以《词林正韵》的十九部为例，说明词韵如何合并诗韵。',
    source: '《诗词格律》· 词韵是诗韵的合并',
    to: '/book/shicigelv/read/39',
  },
  {
    k: '怎样看懂词谱',
    v: '先认识平、仄、中和韵脚标记，再按谱例逐句核对字数、句式与用韵。',
    source: '《白香词谱》· 谱例说明',
    to: '/book/baixiangcipu/read/0',
  },
  {
    k: '平仄从哪里学',
    v: '先弄清四声如何分成平、仄，再进入律诗的粘、对、拗救等具体规则。',
    source: '《诗词格律》· 平仄',
    to: '/book/shicigelv/read/3',
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

      <h2 className="text-xl font-semibold mb-1">馆内格律导读</h2>
      <p className="text-sm text-muted-foreground mb-4">从问题出发，直接读馆内已有的对应章节。</p>
      <div className="grid sm:grid-cols-2 gap-4">
        {RULES.map((r) => (
          <Link
            key={r.k}
            to={r.to}
            className="group bg-surface border rounded-lg p-5 hover:border-cinnabar/50 hover:shadow-sm transition-all"
          >
            <div className="flex items-center justify-between gap-3">
              <h3 className="font-semibold group-hover:text-cinnabar transition-colors">{r.k}</h3>
              <ChevronRight className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-cinnabar" />
            </div>
            <p className="mt-2 text-sm text-muted-foreground leading-6">{r.v}</p>
            <p className="mt-3 text-xs text-cinnabar">{r.source}</p>
          </Link>
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
