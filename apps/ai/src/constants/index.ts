import type { Suggestion } from '../types';

export const DAILY_FREE_LIMIT = 20;

export const WELCOME_MESSAGE = {
  id: 'welcome',
  role: 'assistant' as const,
  text: '您好，我是 newmaybe 的智能园丁。我可以通过您的内容中枢，为您检索、重组并分析您的数字花园。您可以随时向我提问，例如关于"慢阅读"、"隐私优先"或"对抗追踪"的思考。',
};

export const SUGGESTIONS: Suggestion[] = [
  { name: 'DeepSeek 官方', url: 'https://api.deepseek.com/v1', model: 'deepseek-chat' },
  {
    name: '硅基流动 (SiliconFlow)',
    url: 'https://api.siliconflow.cn/v1',
    model: 'deepseek-ai/DeepSeek-V3',
  },
  { name: '月之暗面 (Kimi)', url: 'https://api.moonshot.cn/v1', model: 'moonshot-v1-8k' },
  {
    name: '阿里通义千问',
    url: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    model: 'qwen-plus',
  },
  { name: '智谱 AI (GLM)', url: 'https://open.bigmodel.cn/api/paas/v1', model: 'glm-4-flash' },
  { name: 'OpenAI 官方', url: 'https://api.openai.com/v1', model: 'gpt-4o-mini' },
  {
    name: 'Gemini 官方',
    url: 'https://generativelanguage.googleapis.com',
    model: 'gemini-3.5-flash',
  },
];

export const QUICK_ACTIONS = [
  {
    label: '✍ 文字留白诊断',
    prompt:
      '【文字留白诊断】\n\n请帮我分析以下文字的段落节奏、密度与留白美感，并给出优化润色建议：\n\n「在此替换为你的文字」',
  },
  {
    label: '🍃 古典意象润色',
    prompt:
      '【古典意象润色】\n\n请将以下这段大白话或描述，润色为富有东方古典意境、诗意画面感和衬线质感的唯美句子：\n\n「在此替换为你的描述」',
  },
  {
    label: '💡 灵感词汇发散',
    prompt:
      '【灵感词汇发散】\n\n请以这个词或念头为中心，为我发散相关的古典隐喻、感官连结与散文联想意象：\n\n「在此替换为你的核心词」',
  },
  {
    label: '🌸 念头共鸣启发',
    prompt:
      '【念头共鸣启发】\n\n这是我最近写下或脑海中闪现的一个念头：\n\n「在此替换为你的念头/想法」\n\n请在林的数字花园中寻找与我产生共鸣的相似随笔、笔记或想法，并与我开启一场跨越时空的文字共鸣探讨。',
  },
];
