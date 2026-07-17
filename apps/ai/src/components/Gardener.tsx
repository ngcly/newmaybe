import { useState, useMemo } from 'react';
import {
  detectOrphanNodes,
  detectSprouts,
  getLinkSuggestions,
  type ContentItem,
} from '../utils/rag';

interface GardenerProps {
  allContent: ContentItem[];
  resolveSubdomain: (url: string) => string;
  onSwitchToChat: (prompt: string) => void;
}

export default function Gardener({ allContent, resolveSubdomain, onSwitchToChat }: GardenerProps) {
  const [activeSection, setActiveSection] = useState<'orphans' | 'sprouts' | 'suggestions'>(
    'suggestions',
  );
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  const orphans = useMemo(() => detectOrphanNodes(allContent), [allContent]);
  const sprouts = useMemo(() => detectSprouts(allContent), [allContent]);
  const suggestions = useMemo(() => getLinkSuggestions(allContent, 10), [allContent]);

  const handleSelectItem = (id: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const handleMergeSelected = () => {
    if (selectedItemIds.length === 0) return;
    const selectedDocs = allContent.filter((d) => selectedItemIds.includes(d.id));
    const listText = selectedDocs
      .map(
        (d, idx) =>
          `${idx + 1}. 《${d.title}》(${d.type === 'notes' ? '笔记' : '随笔'}):\n${d.content.slice(0, 400)}`,
      )
      .join('\n\n');

    const promptText = `【合并与演化提案】\n请帮我将以下几篇数字花园的碎片内容融合成一篇结构完整、层次清晰的 Bud（花蕾）级别笔记草稿：\n\n${listText}\n\n【合并要求】：\n1. 提取它们共同的哲学或美学内核。\n2. 保持林的极简留白叙事风格。\n3. 生成合适的 YAML Frontmatter（标题、stage: bud、tags 等）。`;

    onSwitchToChat(promptText);
  };

  const handleCopyConnection = (sourceId: string, targetId: string) => {
    // format as connection format: - notes/slug or - posts/slug
    const clipboardText = `connections:\n  - ${targetId}\n  # 在 ${targetId} 文件的 frontmatter 中也可以添加:\n  # - ${sourceId}`;
    navigator.clipboard.writeText(clipboardText).then(() => {
      setCopySuccess(`${sourceId}-${targetId}`);
      setTimeout(() => setCopySuccess(null), 2000);
    });
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-[var(--line)] pb-4 gap-4">
        <div>
          <h2 className="text-xl font-semibold text-[var(--ink)] font-serif">
            数字花园园丁 (Gardener Studio)
          </h2>
          <p className="text-xs text-[var(--ink-soft)] mt-1 font-sans">
            AI 自动扫描内容脉络，为您找出孤立的思想碎语，催化沉睡的绿芽，推荐奇妙的语义连线。
          </p>
        </div>

        {selectedItemIds.length > 0 && (
          <button
            onClick={handleMergeSelected}
            className="bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] text-[var(--paper)] text-xs px-4 py-2 rounded font-semibold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            合并选中项 ({selectedItemIds.length})
          </button>
        )}
      </div>

      {/* Sub tabs */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveSection('suggestions')}
          className={`px-4 py-2 text-xs rounded border transition-colors cursor-pointer ${
            activeSection === 'suggestions'
              ? 'bg-[var(--paper-deep)] border-[var(--line)] text-[var(--ochre)] font-semibold'
              : 'bg-transparent border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
          }`}
        >
          关联对撞机 ({suggestions.length})
        </button>
        <button
          onClick={() => setActiveSection('orphans')}
          className={`px-4 py-2 text-xs rounded border transition-colors cursor-pointer ${
            activeSection === 'orphans'
              ? 'bg-[var(--paper-deep)] border-[var(--line)] text-[var(--ochre)] font-semibold'
              : 'bg-transparent border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
          }`}
        >
          孤立节点诊断 ({orphans.length})
        </button>
        <button
          onClick={() => setActiveSection('sprouts')}
          className={`px-4 py-2 text-xs rounded border transition-colors cursor-pointer ${
            activeSection === 'sprouts'
              ? 'bg-[var(--paper-deep)] border-[var(--line)] text-[var(--ochre)] font-semibold'
              : 'bg-transparent border-[var(--line)] text-[var(--ink-soft)] hover:text-[var(--ink)]'
          }`}
        >
          待浇水绿芽 ({sprouts.length})
        </button>
      </div>

      {/* Main List */}
      <div className="space-y-4">
        {activeSection === 'suggestions' && (
          <>
            {suggestions.length === 0 ? (
              <p className="text-sm text-[var(--ink-faint)] py-8 text-center font-serif">
                目前未发现明显的跨领域相似度连线。花园很健康。
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {suggestions.map((sug, idx) => (
                  <div
                    key={idx}
                    className="p-4 rounded-lg bg-[var(--paper)] border border-[var(--line)] shadow-sm hover:border-[var(--ochre)] transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between text-[10px] text-[var(--ochre)] font-semibold uppercase tracking-wider mb-2">
                        <span>关联相似度分值: {sug.score}</span>
                        <span>推荐 #{idx + 1}</span>
                      </div>
                      <div className="space-y-2">
                        <div className="p-2 rounded bg-[var(--paper-deep)] border border-[var(--line)]">
                          <span className="text-[10px] text-[var(--ink-faint)] block">节点 A</span>
                          <span className="text-sm font-semibold text-[var(--ink)] font-serif">
                            {sug.source.title}
                          </span>
                        </div>
                        <div className="flex justify-center text-[var(--ink-faint)] py-0.5">⇄</div>
                        <div className="p-2 rounded bg-[var(--paper-deep)] border border-[var(--line)]">
                          <span className="text-[10px] text-[var(--ink-faint)] block">节点 B</span>
                          <span className="text-sm font-semibold text-[var(--ink)] font-serif">
                            {sug.target.title}
                          </span>
                        </div>
                      </div>

                      {/* Keywords */}
                      <div className="mt-3">
                        <span className="text-[10px] text-[var(--ink-faint)] block mb-1">
                          共同提及词汇:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {sug.commonKeywords.map((kw, kIdx) => (
                            <span
                              key={kIdx}
                              className="text-[10px] bg-[var(--paper-deep)] border border-[var(--line)] text-[var(--ink-soft)] px-1.5 py-0.5 rounded"
                            >
                              {kw}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--line)] flex gap-2 justify-end">
                      <button
                        onClick={() => handleCopyConnection(sug.source.id, sug.target.id)}
                        className="px-2.5 py-1 text-[10px] rounded border border-[var(--line)] bg-[var(--paper-deep)] text-[var(--ink-soft)] hover:text-[var(--ochre)] cursor-pointer transition-colors"
                      >
                        {copySuccess === `${sug.source.id}-${sug.target.id}`
                          ? '✓ 已复制连接语法'
                          : '🔗 复制 Frontmatter 连接'}
                      </button>
                      <button
                        onClick={() => {
                          window.open(
                            `${resolveSubdomain('https://graph.newmaybe.com')}?add_node=${encodeURIComponent(sug.source.title)}`,
                            '_blank',
                          );
                        }}
                        className="px-2.5 py-1 text-[10px] rounded border border-[var(--line)] bg-[var(--paper-deep)] text-[var(--ink-soft)] hover:text-[var(--ochre)] cursor-pointer transition-colors"
                      >
                        🌐 在沙盒查看
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeSection === 'orphans' && (
          <>
            {orphans.length === 0 ? (
              <p className="text-sm text-[var(--ink-faint)] py-8 text-center font-serif">
                没有检测到孤立节点，所有想法皆有链接网络。
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orphans.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-lg bg-[var(--paper)] border transition-all flex flex-col justify-between ${
                      selectedItemIds.includes(item.id)
                        ? 'border-[var(--ochre)] ring-1 ring-[var(--ochre)]'
                        : 'border-[var(--line)] hover:border-[var(--ink-soft)]'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] text-[var(--ochre)] font-semibold tracking-wide uppercase">
                          {item.type === 'notes' ? '笔记' : '文章'}
                        </span>
                        <input
                          type="checkbox"
                          checked={selectedItemIds.includes(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                          className="w-3.5 h-3.5 border-[var(--line)] text-[var(--ochre)] rounded cursor-pointer"
                        />
                      </div>
                      <h3 className="text-sm font-semibold text-[var(--ink)] font-serif mb-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[var(--ink-soft)] line-clamp-3 font-sans leading-relaxed">
                        {item.content || '（暂无详细文本内容）'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--line)] flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          const promptText = `【诊断孤立节点】\n我的笔记《${item.title}》是一个孤立节点，它的当前内容是：\n"""\n${item.content.slice(0, 500)}\n"""\n\n请帮我分析它为什么被孤立，并从我现有的数字花园内容中推荐 3 个可能与它产生概念连接的已有笔记或文章，解释其内在的语义联系，并给出推荐 chimneys connection 语法。`;
                          onSwitchToChat(promptText);
                        }}
                        className="px-2.5 py-1 text-[10px] rounded border border-[var(--line)] bg-[var(--paper-deep)] text-[var(--ink-soft)] hover:text-[var(--ochre)] cursor-pointer transition-colors"
                      >
                        🔍 AI 诊断并推荐连接
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {activeSection === 'sprouts' && (
          <>
            {sprouts.length === 0 ? (
              <p className="text-sm text-[var(--ink-faint)] py-8 text-center font-serif">
                花园里没有绿芽阶段的笔记，所有的概念都已发芽长大。
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sprouts.map((item) => (
                  <div
                    key={item.id}
                    className={`p-4 rounded-lg bg-[var(--paper)] border transition-all flex flex-col justify-between ${
                      selectedItemIds.includes(item.id)
                        ? 'border-[var(--ochre)] ring-1 ring-[var(--ochre)]'
                        : 'border-[var(--line)] hover:border-[var(--ink-soft)]'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] text-emerald-500 font-semibold tracking-wide uppercase">
                            绿芽 Sprout
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={selectedItemIds.includes(item.id)}
                          onChange={() => handleSelectItem(item.id)}
                          className="w-3.5 h-3.5 border-[var(--line)] text-[var(--ochre)] rounded cursor-pointer"
                        />
                      </div>
                      <h3 className="text-sm font-semibold text-[var(--ink)] font-serif mb-1">
                        {item.title}
                      </h3>
                      <p className="text-xs text-[var(--ink-soft)] line-clamp-3 font-sans leading-relaxed">
                        {item.content || '（暂无详细文本内容）'}
                      </p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-[var(--line)] flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          const promptText = `【浇灌绿芽笔记】\n我的绿芽（sprout）笔记《${item.title}》需要拓展和浇灌。以下是当前的草稿内容：\n"""\n${item.content.slice(0, 500)}\n"""\n\n请帮我拓展它的论述。我想将它演化到 Bud（花蕾）阶段。请基于你的分析，提供扩展大纲、补充的核心概念、以及如何与我的数字花园其他部分建立联系的思路。`;
                          onSwitchToChat(promptText);
                        }}
                        className="px-2.5 py-1 text-[10px] rounded border border-[var(--line)] bg-[var(--paper-deep)] text-[var(--ink-soft)] hover:text-[var(--ochre)] cursor-pointer transition-colors"
                      >
                        💧 浇灌并催化演化
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
