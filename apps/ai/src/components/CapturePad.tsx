import { useState } from 'react';
import { type ProviderType } from '../types';

interface CapturePadProps {
  provider: ProviderType;
  model: string;
  apiKey: string;
  customBaseUrl: string;
}

export default function CapturePad({ provider, model, apiKey, customBaseUrl }: CapturePadProps) {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState(false);

  const handleGenerate = async () => {
    if (!input.trim()) return;
    setIsLoading(true);
    setError(null);
    setOutput('');

    const todayStr = new Date().toISOString().split('T')[0];

    const systemPrompt = `你是一个数字花园格式化助手。你的任务是将用户输入的杂乱、非结构化想法，整理成符合 Astro 静态网站内容格式的 Markdown 文件。
你的输出必须包含完整的 YAML Frontmatter。
Frontmatter 字段要求：
- title: 提炼一个合适的标题（5-20字，不包含书名号或句号）
- pubDate: 今天的日期，必须是 "${todayStr}"
- stage: 评估其内容成熟度，取值范围：'sprout'（刚记录的碎碎念灵感）、'bud'（有一定条理和论述的草稿）或 'evergreen'（常青知识点）。大部分碎片输入应默认为 'sprout'。
- tags: 提取 1-3 个中文标签。
- category: 分类，取值：'随笔' | '观察' | '念头' | '诗歌'。碎片输入默认为 '念头'。
- draft: true
- connections: []

输出格式严格遵循以下示例，不要输出 markdown 的 \`\`\` 包裹标记，也不要进行任何前言后语解释：
---
title: 示例标题
pubDate: ${todayStr}
stage: sprout
tags:
  - 标签一
category: 念头
draft: true
connections: []
---
正文内容...`;

    try {
      const promptHistory = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: `请将以下想法格式化为 Markdown 笔记：\n\n${input}` },
      ];

      let generatedText = '';

      if (provider === 'free' || provider === 'openai') {
        const cleanBaseUrl =
          provider === 'openai'
            ? (customBaseUrl || 'https://api.openai.com/v1').replace(/\/$/, '')
            : '';
        const endpoint = provider === 'free' ? '/api/chat' : `${cleanBaseUrl}/chat/completions`;

        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (provider === 'openai') {
          headers['Authorization'] = `Bearer ${apiKey}`;
        }

        const body =
          provider === 'free'
            ? JSON.stringify({ messages: promptHistory })
            : JSON.stringify({
                model,
                messages: promptHistory,
                stream: false,
              });

        const res = await fetch(endpoint, { method: 'POST', headers, body });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error?.message || errData.error || '接口请求失败');
        }

        const data = await res.json();
        // check if response is streamed or normal json
        generatedText = data.choices?.[0]?.message?.content || data.response || data.text || '';
      } else if (provider === 'gemini') {
        const cleanBaseUrl = (customBaseUrl || 'https://generativelanguage.googleapis.com').replace(
          /\/$/,
          '',
        );
        const res = await fetch(
          `${cleanBaseUrl}/v1beta/models/${model}:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  role: 'user',
                  parts: [{ text: `请将以下想法格式化为 Markdown 笔记：\n\n${input}` }],
                },
              ],
              systemInstruction: { parts: [{ text: systemPrompt }] },
            }),
          },
        );
        const data = await res.json();
        if (!res.ok || data.error) {
          throw new Error(data.error?.message || 'Gemini 接口调用出错');
        }
        generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
      }

      // Clean markdown code fence formatting if the LLM outputted them anyway
      let cleaned = generatedText.trim();
      if (cleaned.startsWith('```markdown')) {
        cleaned = cleaned.slice(11).trim();
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.slice(3).trim();
      }
      if (cleaned.endsWith('```')) {
        cleaned = cleaned.slice(0, -3).trim();
      }

      setOutput(cleaned);
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      setError(`捕获失败：${errMsg}。请确认您的 API 密钥设置正确。`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  const handleDownload = () => {
    // extract slug from title or just use a timestamp
    const titleMatch = output.match(/title:\s*(.*)/);
    const title = titleMatch ? titleMatch[1].trim().replace(/['"]/g, '') : 'new-fragment';

    // convert title to a safe file slug
    const safeSlug =
      title
        .toLowerCase()
        .replace(/[^\w\u4e00-\u9fa5]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'note';

    const blob = new Blob([output], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${safeSlug}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="border-b border-[var(--line)] pb-4">
        <h2 className="text-xl font-semibold text-[var(--ink)] font-serif">
          灵感捕获板 (Capture Pad)
        </h2>
        <p className="text-xs text-[var(--ink-soft)] mt-1 font-sans">
          输入任何碎片化的杂感，AI 将自动分析并包装为符合主站编译格式的 Markdown 文件，包含完整的
          YAML Frontmatter。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
        {/* Input box */}
        <div className="flex flex-col space-y-4">
          <label className="text-xs font-semibold text-[var(--ink-soft)] font-sans">
            1. 录入灵感碎语
          </label>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="在这里输入、粘贴您的瞬间想法或非结构化草稿，例如：\n'今天散步发现雨后的桂花落了一地，有种寂静之美。突然想到，表达往往也是这样，在繁盛之后留下的空白反而是最有诗意的。'"
            className="flex-grow min-h-[300px] p-4 border border-[var(--line)] bg-[var(--paper)] rounded text-[var(--ink)] font-serif text-sm focus:border-[var(--ochre)] outline-none resize-none leading-relaxed"
          />
          <button
            onClick={handleGenerate}
            disabled={isLoading || !input.trim()}
            className="w-full bg-[var(--ochre)] hover:bg-[var(--ochre-deep)] text-[var(--paper)] p-3 rounded font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? '解析并生成中...' : '✨ 格式化为 Markdown 笔记'}
          </button>
        </div>

        {/* Output box */}
        <div className="flex flex-col space-y-4">
          <div className="flex justify-between items-center">
            <label className="text-xs font-semibold text-[var(--ink-soft)] font-sans">
              2. 格式化输出 (Astro Markdown)
            </label>
            {output && (
              <div className="flex gap-2">
                <button
                  onClick={handleCopy}
                  className="px-2 py-1 text-[10px] rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink-soft)] hover:text-[var(--ochre)] cursor-pointer transition-colors"
                >
                  {copySuccess ? '✓ 已复制' : '📋 复制'}
                </button>
                <button
                  onClick={handleDownload}
                  className="px-2 py-1 text-[10px] rounded border border-[var(--line)] bg-[var(--paper)] text-[var(--ink-soft)] hover:text-[var(--ochre)] cursor-pointer transition-colors"
                >
                  💾 下载 .md
                </button>
              </div>
            )}
          </div>

          <div className="flex-grow min-h-[300px] border border-[var(--line)] bg-[var(--paper-deep)] rounded p-4 overflow-y-auto select-text relative">
            {isLoading ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center space-y-2 text-[var(--ink-soft)]">
                <span className="w-6 h-6 border-2 border-[var(--ochre)] border-t-transparent rounded-full animate-spin" />
                <span className="text-xs font-sans">AI 正在提炼语义，构建 YAML Frontmatter...</span>
              </div>
            ) : error ? (
              <p className="text-xs text-red-500 font-serif leading-relaxed">{error}</p>
            ) : output ? (
              <pre className="text-xs font-mono text-[var(--ink)] leading-relaxed whitespace-pre-wrap select-all selection:bg-[var(--ochre)] selection:text-[var(--paper)]">
                {output}
              </pre>
            ) : (
              <p className="text-xs text-[var(--ink-faint)] font-serif py-12 text-center">
                生成的内容将在此处显示，可直接拖入 packages/content/ 目录中使用。
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
