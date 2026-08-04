import { useState, useEffect, useCallback, useRef } from 'react';
import {
  fetchAllContent,
  retrieveRelevantDocs,
  buildSystemPrompt,
  type ContentItem,
} from '../utils/rag';
import { useFreeTurns } from './useFreeTurns';
import { WELCOME_MESSAGE } from '../constants';
import type { Message, ProviderType, ContentStats } from '../types';
import {
  AI_STORAGE_KEYS,
  createGeminiRequest,
  fitMessagesToCharBudget,
  readAIResponse,
} from '@newmaybe/ai-client';

function timestamp() {
  return new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    posts: '文章',
    notes: '笔记',
    memories: '记忆',
    excerpts: '拾遗',
    fragments: '念头',
  };
  return map[type] || type;
}

export interface UseChatReturn {
  messages: Message[];
  inputText: string;
  isTyping: boolean;
  contentLoading: boolean;
  contentError: string | null;
  stats: ContentStats | null;
  provider: ProviderType;
  model: string;
  apiKey: string;
  customBaseUrl: string;
  freeTurnsLeft: number;
  showConfig: boolean;
  allContent: ContentItem[];
  setInputText: (t: string) => void;
  setProvider: (p: ProviderType) => void;
  setModel: (m: string) => void;
  setApiKey: (k: string) => void;
  setCustomBaseUrl: (b: string) => void;
  setShowConfig: (v: boolean) => void;
  handleSend: (overrideText?: string) => Promise<void>;
  saveConfig: () => void;
  clearConfig: () => void;
  clearMessages: () => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<Message[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('newmaybe_ai_messages');
      if (saved) {
        try {
          return JSON.parse(saved);
        } catch (e) {
          console.warn('Failed to parse saved AI messages from localStorage', e);
        }
      }
    }
    return [{ ...WELCOME_MESSAGE, timestamp: timestamp() }];
  });

  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const [provider, setProvider] = useState<ProviderType>('free');
  const [model, setModel] = useState('workers-ai');
  const [apiKey, setApiKey] = useState('');
  const [customBaseUrl, setCustomBaseUrl] = useState('');
  const [showConfig, setShowConfig] = useState(false);

  const [allContent, setAllContent] = useState<ContentItem[]>([]);
  const [contentLoading, setContentLoading] = useState(true);
  const [contentError, setContentError] = useState<string | null>(null);
  const requestInFlight = useRef(false);

  const { freeTurnsLeft, checkFreeTurns, decrementFreeTurns } = useFreeTurns();

  // Load saved config and RAG content on mount
  useEffect(() => {
    const savedProvider = localStorage.getItem(AI_STORAGE_KEYS.provider) as ProviderType | null;
    const savedModel = localStorage.getItem(AI_STORAGE_KEYS.model);
    const savedKey = localStorage.getItem(AI_STORAGE_KEYS.apiKey);
    const savedBaseUrl = localStorage.getItem(AI_STORAGE_KEYS.customBaseUrl);

    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (savedProvider) setProvider(savedProvider);
    if (savedModel) {
      setModel(savedModel);
    } else if (savedProvider === 'gemini') {
      setModel('gemini-3.5-flash');
    } else if (savedProvider === 'openai') {
      setModel('gpt-4o-mini');
    }
    if (savedKey) setApiKey(savedKey.trim());
    if (savedBaseUrl) setCustomBaseUrl(savedBaseUrl.trim());

    fetchAllContent()
      .then((data) => {
        setAllContent(data);
        setContentError(null);
      })
      .catch((error: unknown) => {
        console.error('RAG content fetch error:', error);
        setContentError('知识花园索引加载失败，请刷新页面后重试。');
      })
      .finally(() => setContentLoading(false));
  }, []);

  // Persist messages to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('newmaybe_ai_messages', JSON.stringify(messages));
    } catch (e) {
      console.warn('Failed to save AI messages to localStorage', e);
    }
  }, [messages]);

  // Stats derived from loaded content
  const stats: ContentStats | null = contentLoading
    ? null
    : {
        posts: allContent.filter((item) => item.type === 'posts').length,
        notes: allContent.filter((item) => item.type === 'notes').length,
        memories: allContent.filter((item) => item.type === 'memories').length,
        excerpts: allContent.filter((item) => item.type === 'excerpts').length,
        fragments: allContent.filter((item) => item.type === 'fragments').length,
      };

  const handleSend = useCallback(
    async (overrideText?: string) => {
      const textToSend = (overrideText !== undefined ? overrideText : inputText).trim();
      if (!textToSend || requestInFlight.current) return;

      if (contentError) {
        setMessages((prev) => [
          ...prev,
          {
            id: `content-error-${Date.now()}`,
            role: 'assistant',
            text: contentError,
            timestamp: timestamp(),
          },
        ]);
        return;
      }

      // Free tier rate limiting
      if (provider === 'free') {
        const limitStatus = checkFreeTurns();
        if (!limitStatus.ok) {
          setMessages((prev) => [
            ...prev,
            {
              id: `limit-error-${Date.now()}`,
              role: 'assistant',
              text: `您好，今日免费对话额度（20 次）已用完。若不希望受到额度限制，可点击左下角配置个人 API 密钥（仅保存在本地浏览器）。`,
              timestamp: timestamp(),
            },
          ]);
          return;
        }
      }

      requestInFlight.current = true;

      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        role: 'user',
        text: textToSend,
        timestamp: timestamp(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputText('');
      setIsTyping(true);

      try {
        // RAG retrieval
        const matchedDocs = retrieveRelevantDocs(userMessage.text, allContent);
        const references = matchedDocs.map((item) => ({
          type: getTypeLabel(item.doc.type),
          title: item.doc.title,
          url: item.doc.url,
        }));

        const systemPromptContent = buildSystemPrompt(matchedDocs.map((m) => m.doc));
        const promptHistory = [
          { role: 'system', content: systemPromptContent },
          ...messages
            .filter((m) => m.id !== 'welcome')
            .map((m) => ({ role: m.role, content: m.text })),
          { role: 'user', content: userMessage.text },
        ];

        let replyText = '';
        const assistantMsgId = `msg-assistant-${Date.now()}`;

        if (provider === 'free' || provider === 'openai') {
          // OpenAI-compatible streaming
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
              ? JSON.stringify({ messages: fitMessagesToCharBudget(promptHistory) })
              : JSON.stringify({
                  model,
                  messages: promptHistory.map((m) => ({ role: m.role, content: m.content })),
                  stream: true,
                });

          const res = await fetch(endpoint, { method: 'POST', headers, body });
          if (!res.ok) {
            const errData = (await res.json().catch(() => ({}))) as {
              error?: { message?: string } | string;
            };
            const errMsg =
              typeof errData.error === 'string' ? errData.error : errData.error?.message;
            throw new Error(errMsg || '接口响应错误');
          }

          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: assistantMsgId,
              role: 'assistant',
              text: '',
              references: [],
              timestamp: timestamp(),
            },
          ]);

          replyText = await readAIResponse(res, (_token, accumulated) => {
            setMessages((prev) =>
              prev.map((m) => (m.id === assistantMsgId ? { ...m, text: accumulated } : m)),
            );
          });

          setMessages((prev) =>
            prev.map((m) => (m.id === assistantMsgId ? { ...m, text: replyText, references } : m)),
          );

          if (provider === 'free') {
            decrementFreeTurns();
          }
        } else if (provider === 'gemini') {
          // Gemini API
          const geminiMessages = promptHistory
            .filter((m) => m.role !== 'system')
            .map((m) => ({
              role: m.role === 'assistant' ? 'model' : 'user',
              parts: [{ text: m.content }],
            }));

          const request = createGeminiRequest(customBaseUrl, model, apiKey);
          const res = await fetch(request.url, {
            method: 'POST',
            headers: request.headers,
            body: JSON.stringify({
              contents: geminiMessages,
              systemInstruction: { parts: [{ text: systemPromptContent }] },
            }),
          });
          const data = (await res.json()) as {
            error?: { message?: string };
            candidates?: { content?: { parts?: { text?: string }[] } }[];
          };
          if (!res.ok || data.error) {
            throw new Error(data.error?.message || 'Gemini 接口调用出错');
          }
          replyText = data.candidates?.[0]?.content?.parts?.[0]?.text || '未能获取回复，请重试。';

          setIsTyping(false);
          setMessages((prev) => [
            ...prev,
            {
              id: assistantMsgId,
              role: 'assistant',
              text: replyText,
              references,
              timestamp: timestamp(),
            },
          ]);
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error(err);
        setMessages((prev) => [
          ...prev,
          {
            id: `msg-error-${Date.now()}`,
            role: 'assistant',
            text: `【错误反馈】AI 连接发生故障：${message}。请确保您的 API 密钥配置正确，或者检查网络连接。`,
            timestamp: timestamp(),
          },
        ]);
      } finally {
        requestInFlight.current = false;
        setIsTyping(false);
      }
    },
    [
      inputText,
      provider,
      model,
      apiKey,
      customBaseUrl,
      allContent,
      messages,
      checkFreeTurns,
      decrementFreeTurns,
      contentError,
    ],
  );

  const saveConfig = useCallback(() => {
    localStorage.setItem(AI_STORAGE_KEYS.provider, provider);
    localStorage.setItem(AI_STORAGE_KEYS.model, model);
    localStorage.setItem(AI_STORAGE_KEYS.apiKey, apiKey.trim());
    localStorage.setItem(AI_STORAGE_KEYS.customBaseUrl, customBaseUrl.trim());
    setShowConfig(false);
  }, [provider, model, apiKey, customBaseUrl]);

  const clearConfig = useCallback(() => {
    setProvider('free');
    setModel('workers-ai');
    setApiKey('');
    setCustomBaseUrl('');
    localStorage.removeItem(AI_STORAGE_KEYS.provider);
    localStorage.removeItem(AI_STORAGE_KEYS.model);
    localStorage.removeItem(AI_STORAGE_KEYS.apiKey);
    localStorage.removeItem(AI_STORAGE_KEYS.customBaseUrl);
    setShowConfig(false);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([{ ...WELCOME_MESSAGE, timestamp: timestamp() }]);
  }, []);

  return {
    messages,
    inputText,
    isTyping,
    contentLoading,
    contentError,
    stats,
    provider,
    model,
    apiKey,
    customBaseUrl,
    freeTurnsLeft,
    showConfig,
    allContent,
    setInputText,
    setProvider,
    setModel,
    setApiKey,
    setCustomBaseUrl,
    setShowConfig,
    handleSend,
    saveConfig,
    clearConfig,
    clearMessages,
  };
}
