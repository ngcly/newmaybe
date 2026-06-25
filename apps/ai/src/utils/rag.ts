export interface ContentItem {
  id: string;
  title: string;
  type: string;
  category: string;
  url: string;
  content: string;
  pubDate: string;
}

// 解决本地开发与线上部署的跨域数据获取
export const getContentUrl = (): string => {
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:4321/all-content.json';
    }
  }
  return 'https://newmaybe.com/all-content.json';
};

// 获取所有文章数据
export const fetchAllContent = async (): Promise<ContentItem[]> => {
  try {
    const url = getContentUrl();
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch content from ${url}`);
    return await res.json() as ContentItem[];
  } catch (err) {
    console.error('RAG content fetch error:', err);
    return [];
  }
};

// 提取查询中的关键词（支持中文单字/词组与英文单词）
export const extractKeywords = (query: string): string[] => {
  const normalized = query.toLowerCase();
  
  // 匹配所有英文单词或数字
  const enMatches = normalized.match(/[a-z0-9]+/g) || [];
  
  // 匹配所有中文字符
  const cnMatches = normalized.match(/[\u4e00-\u9fa5]/g) || [];
  
  // 简单合并
  const keywords = [...new Set([...enMatches, ...cnMatches])].filter(k => k.length > 0);
  
  // 过滤掉极常见的停用词（中英文）
  const stopWords = new Set([
    '的', '了', '和', '是', '在', '我', '有', '也', '你', '他', '她', '它', '这', '那', '都', '个', '与', '及',
    'the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'about'
  ]);
  
  return keywords.filter(k => !stopWords.has(k));
};

// 检索最相关的文档（基于简易 TF-IDF 关键词匹配逻辑）
export const retrieveRelevantDocs = (
  query: string,
  corpus: ContentItem[],
  limit = 3
): { doc: ContentItem; score: number }[] => {
  if (!query || corpus.length === 0) return [];
  
  const keywords = extractKeywords(query);
  if (keywords.length === 0) {
    // 如果没有提取出关键词（可能都是停用词或短标点），返回最新的几篇
    return corpus.slice(0, limit).map(doc => ({ doc, score: 1 }));
  }

  const scoredDocs = corpus.map(doc => {
    let score = 0;
    const titleLower = doc.title.toLowerCase();
    const contentLower = doc.content.toLowerCase();
    const categoryLower = (doc.category || '').toLowerCase();

    keywords.forEach(keyword => {
      // 1. 标题匹配（权重极高：每个匹配项 15 分）
      if (titleLower.includes(keyword)) {
        score += 15;
      }
      
      // 2. 分类匹配（权重中：每个匹配项 5 分）
      if (categoryLower.includes(keyword)) {
        score += 5;
      }

      // 3. 全文正文匹配（权重低：每个出现次数 1 分，上限 10 分防止长文垄断）
      if (contentLower.includes(keyword)) {
        const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
        const matches = contentLower.match(regex);
        const matchCount = matches ? matches.length : 0;
        score += Math.min(matchCount, 10);
      }
    });

    return { doc, score };
  });

  // 过滤掉得分为 0 的文档，并按分数降序排列
  return scoredDocs
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
};

// 构造大语言模型的 System Prompt
export const buildSystemPrompt = (relevantDocs: ContentItem[]): string => {
  let prompt = `你叫“newmaybe 智能园丁”，是 newmaybe.com（作者林的数字花园）的 AI 写作伴侣与风格化共创引擎。
你的任务是友好、文艺且具有深度启发性地解答读者的疑惑，并帮助读者打磨思想与文字。

请严格遵守以下美学与推理原则：
1. 【美学调性】：你的语气请始终保持谦和、克制、沉静且富有东方留白美感（符合 newmaybe 慢阅读、低饱和度的纸墨调性）。严禁使用死板的客服语气或堆砌浮夸的修饰词。
2. 【风格共创（Style Transfer）】：当读者提供自己的草稿、大白话或文字，请求润色、改写或“留白诊断”时，请基于林的“干净、极简、富有呼吸感”的文字风格为读者重写该片段。请同时给出你的 2-3 个润色版本（如：极简版、诗意版），并向读者说明你进行文字留白和减法处理的思路。
3. 【共鸣与跨时空对话】：当读者进行自我探讨或输入自己的念头（尤其是带有“【念头共鸣启发】”或“共鸣”请求时），请在参考资料中寻找与之最相似或产生共鸣的林的随笔、笔记或念头。请主动将两者进行对比，通过类似于“在林的数字花园里也曾有过相似的低回：在《...》中林写道：『...』”的表述方式展开文本层面的精神共振与对话。
4. 【启发性追问】：在每次回复的末尾，请务必向读者提出 1-2 个富有洞察力的、开放式的哲学/美学相关追问，引导读者继续往下书写或深化其想法。

`;

  if (relevantDocs.length > 0) {
    prompt += `以下是为你检索到的最相关的数字花园内容，请基于这些参考资料来回答用户的问题或提供共鸣对比。在回答中提及或引用这些内容时，请务必以 [文章/笔记标题](URL) 的格式添加 markdown 链接（例如：[慢阅读](https://newmaybe.com/memory/slow-reading)）：\n\n`;
    
    relevantDocs.forEach((doc, idx) => {
      prompt += `---
[参考资料 #${idx + 1}] 标题: ${doc.title}
分类: ${doc.category}
发布日期: ${doc.pubDate}
链接: ${doc.url}
正文内容:
${doc.content}
---\n\n`;
    });

    prompt += `【要求】：
1. 结合参考资料提供细致的分析、重写或共鸣对话。
2. 如果参考资料确实与读者的问题/内容无关，你可以基于大模型自身的知识发散回答，但请明确说明：“以下内容为我的发散推理，在林的数字花园中尚未找到直接对应记录”。
`;
  } else {
    prompt += `【要求】：
由于目前没有检索到与用户问题或念头直接相关的记录，请友好且沉静地告诉读者：
“我暂时没有在林的数字花园里检索到直接对应的文字记录，但我可以基于我自身的知识库为您提供一些启发性思考或共鸣探讨：”
然后给出你的发散润色或意象发散，务必在回答末尾带上启发性追问。`;
  }

  return prompt;
};
