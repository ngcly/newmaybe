interface SealStampProps {
  /** 印文文字（推荐 1~4 字，如：留白、文友、苏轼、完） */
  text: string;
  /** 印章形制：yang (朱文/阳刻：白底红字细框)、yin (白文/阴刻：红底白字) */
  type?: 'yang' | 'yin';
  /** 尺寸等级：xs (18px), sm (24px), md (34px), lg (44px) */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /** 形状：square (方印) 或 round (圆印) */
  shape?: 'square' | 'round';
  /** 是否应用微小金石雕刻倾斜角 */
  tilt?: boolean;
  className?: string;
  title?: string;
}

export default function SealStamp({
  text,
  type = 'yang',
  size = 'sm',
  shape = 'square',
  tilt = true,
  className = '',
  title,
}: SealStampProps) {
  const displayText = text.slice(0, 4) || '印';
  const isMulti = displayText.length >= 2;

  const sizeClasses = {
    xs: 'w-[18px] h-[18px] text-[10px]',
    sm: 'w-[24px] h-[24px] text-[11px]',
    md: 'w-[34px] h-[34px] text-[14px]',
    lg: 'w-[44px] h-[44px] text-[17px]',
  }[size];

  const shapeClasses = shape === 'round' ? 'rounded-full' : 'rounded-[2px_3px_2px_2.5px]';

  const typeClasses =
    type === 'yin'
      ? 'bg-[var(--cinnabar)] text-[var(--paper)] border border-[var(--cinnabar)] shadow-[0_1px_3px_rgba(197,61,49,0.25)]'
      : 'bg-[color-mix(in_srgb,var(--cinnabar)_4%,transparent)] text-[var(--cinnabar)] border-[1.2px] border-[var(--cinnabar)] shadow-[inset_0_0_1px_color-mix(in_srgb,var(--cinnabar)_20%,transparent)]';

  const tiltClass = tilt ? '-rotate-1 hover:rotate-0 hover:scale-105' : '';

  return (
    <span
      className={`inline-flex items-center justify-center select-none shrink-0 font-serif leading-none transition-all duration-300 ${sizeClasses} ${shapeClasses} ${typeClasses} ${tiltClass} ${className}`}
      title={title || `印章：${displayText}`}
      aria-label={`印章：${displayText}`}
      role="img"
    >
      <span
        className={`font-bold font-[var(--serif-kai)] text-center tracking-tight leading-none ${
          isMulti && shape === 'square' ? '[writing-mode:vertical-rl]' : ''
        }`}
      >
        {displayText}
      </span>
    </span>
  );
}
