import { useEffect, useRef } from 'react';
import { X, SlidersHorizontal, RotateCcw, Check } from 'lucide-react';
import type {
  ReaderPreferences,
  PaperTheme,
  ReaderFont,
  ReaderFontSize,
  ReaderLineHeight,
} from '../types';

interface ReaderSettingsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: ReaderPreferences;
  onChange: (prefs: ReaderPreferences) => void;
  onReset: () => void;
}

const PAPER_THEMES: {
  id: PaperTheme;
  name: string;
  desc: string;
}[] = [
  {
    id: 'paper',
    name: '宣纸白',
    desc: '天然纸感',
  },
  {
    id: 'parchment',
    name: '羊皮暖',
    desc: '温润护眼',
  },
  {
    id: 'bamboo',
    name: '竹青静',
    desc: '清雅微凉',
  },
  {
    id: 'ink',
    name: '松墨夜',
    desc: '沉浸夜读',
  },
];

const FONTS: { id: ReaderFont; name: string; family: string }[] = [
  { id: 'song', name: '宋体 · 风骨', family: 'font-serif' },
  { id: 'kai', name: '楷体 · 墨韵', family: 'font-kai' },
  { id: 'sans', name: '黑体 · 明晰', family: 'font-sans' },
];

const FONT_SIZES: { id: ReaderFontSize; label: string; px: string }[] = [
  { id: 'sm', label: '小', px: '16px' },
  { id: 'md', label: '标准', px: '18px' },
  { id: 'lg', label: '较大', px: '20px' },
  { id: 'xl', label: '特大', px: '24px' },
];

const LINE_HEIGHTS: { id: ReaderLineHeight; label: string }[] = [
  { id: 'compact', label: '紧凑' },
  { id: 'normal', label: '标准' },
  { id: 'relaxed', label: '松弛' },
];

export default function ReaderSettingsDrawer({
  isOpen,
  onClose,
  preferences,
  onChange,
  onReset,
}: ReaderSettingsDrawerProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const previousFocus = document.activeElement;
    closeRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
      if (event.key !== 'Tab') return;
      const buttons = panelRef.current?.querySelectorAll<HTMLButtonElement>('button');
      if (!buttons?.length) return;
      const first = buttons[0];
      const last = buttons[buttons.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (previousFocus instanceof HTMLElement) previousFocus.focus();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const previewFont = FONTS.find((font) => font.id === preferences.font)?.family;
  const previewSize = FONT_SIZES.find((size) => size.id === preferences.fontSize)?.px;
  const previewLineHeight = { compact: 1.85, normal: 2.15, relaxed: 2.45 }[preferences.lineHeight];

  return (
    <div className="club-reader-settings__backdrop">
      <div className="club-reader-settings__overlay" onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className="club-reader-settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reader-settings-title"
      >
        <div className="club-reader-settings__header">
          <div>
            <span className="club-reader__section-label">让阅读更从容</span>
            <h3 id="reader-settings-title">
              <SlidersHorizontal size={18} aria-hidden="true" /> 阅读排版
            </h3>
          </div>
          <button
            ref={closeRef}
            onClick={onClose}
            className="club-reader-settings__close"
            aria-label="关闭"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>

        <fieldset className="club-reader-settings__group">
          <legend>纸张色调</legend>
          <div className="club-reader-settings__tones">
            {PAPER_THEMES.map((theme) => {
              const active = preferences.theme === theme.id;
              return (
                <button
                  key={theme.id}
                  onClick={() => onChange({ ...preferences, theme: theme.id })}
                  aria-pressed={active}
                  className={`club-reader-theme-${theme.id} club-reader-settings__tone`}
                >
                  <span className="club-reader-settings__tone-sample" aria-hidden="true">
                    文{active && <Check size={12} />}
                  </span>
                  <span className="club-reader-settings__tone-name">{theme.name}</span>
                  <span className="club-reader-settings__tone-description">{theme.desc}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        <fieldset className="club-reader-settings__group">
          <legend>正文字体</legend>
          <div className="club-reader-settings__options">
            {FONTS.map((font) => (
              <button
                key={font.id}
                onClick={() => onChange({ ...preferences, font: font.id })}
                aria-pressed={preferences.font === font.id}
                className={`club-reader-settings__option ${font.family}`}
              >
                {font.name}
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="club-reader-settings__group">
          <legend>字号</legend>
          <div className="club-reader-settings__options club-reader-settings__options--four">
            {FONT_SIZES.map((size) => (
              <button
                key={size.id}
                onClick={() => onChange({ ...preferences, fontSize: size.id })}
                aria-pressed={preferences.fontSize === size.id}
                className="club-reader-settings__option"
              >
                {size.label}
                <span className="club-reader-settings__size">{size.px}</span>
              </button>
            ))}
          </div>
        </fieldset>

        <fieldset className="club-reader-settings__group">
          <legend>行间留白</legend>
          <div className="club-reader-settings__options">
            {LINE_HEIGHTS.map((spacing) => (
              <button
                key={spacing.id}
                onClick={() => onChange({ ...preferences, lineHeight: spacing.id })}
                aria-pressed={preferences.lineHeight === spacing.id}
                className="club-reader-settings__option"
              >
                {spacing.label}
              </button>
            ))}
          </div>
        </fieldset>

        <div className={`club-reader-settings__preview club-reader-theme-${preferences.theme}`}>
          <span className="club-reader__section-label">阅读预览</span>
          <p
            className={previewFont}
            style={{ fontSize: previewSize, lineHeight: previewLineHeight }}
          >
            字里相逢，行间留白。
            <br />
            愿每一次落笔，都有回响。
          </p>
        </div>
        <div className="club-reader-settings__footer">
          <span>偏好会自动保存</span>
          <button onClick={onReset} title="恢复默认偏好">
            <RotateCcw size={13} aria-hidden="true" /> 重置
          </button>
        </div>
      </div>
    </div>
  );
}
