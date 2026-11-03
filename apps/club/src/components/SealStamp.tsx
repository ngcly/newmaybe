interface SealStampProps {
  /** 印文文字（推荐 1~4 字，如：留白、文友、苏轼、完） */
  text: string;
  /** 印章形制：yang (朱文/阳刻：白底红字细框)、yin (白文/阴刻：红底白字) */
  type?: 'yang' | 'yin';
  /** 尺寸等级：xs (20px), sm (24px), md (34px), lg (44px) */
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
  const characters = Array.from(text).slice(0, 4);
  if (!characters.length) characters.push('印');
  const displayText = characters.join('');
  const isMulti = characters.length >= 2;

  const sizeClasses = {
    xs: 'w-[20px] h-[20px]',
    sm: 'w-[24px] h-[24px]',
    md: 'w-[34px] h-[34px]',
    lg: 'w-[44px] h-[44px]',
  }[size];

  // 多字印每列两字，字号须让两字加字隙落在边框以内。
  const fontClasses = isMulti
    ? { xs: 'text-[8px]', sm: 'text-[10px]', md: 'text-[13px]', lg: 'text-[18px]' }[size]
    : { xs: 'text-[11px]', sm: 'text-[13px]', md: 'text-[16px]', lg: 'text-[20px]' }[size];

  const shapeClasses = shape === 'round' ? 'rounded-full' : 'rounded-[2px_3px_2px_2.5px]';

  // 与主站 SealStamp.astro 相同：方印按右列至左列、自上而下排布；圆形双字仍保持横排。
  const layoutClasses =
    (isMulti && shape === 'square') || characters.length > 2
      ? 'grid-rows-[repeat(2,1em)] [direction:rtl]'
      : 'grid-rows-[1em]';

  const typeClasses =
    type === 'yin'
      ? 'bg-[var(--cinnabar)] text-[var(--paper)] border border-[var(--cinnabar)] shadow-[0_1px_3px_color-mix(in_srgb,var(--cinnabar)_25%,transparent)]'
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
        className={`inline-grid grid-flow-col auto-cols-[1em] gap-[0.04em] font-kai font-bold text-center tracking-normal leading-none whitespace-nowrap ${fontClasses} ${layoutClasses}`}
      >
        {characters.map((character, index) => (
          <span key={index}>{character}</span>
        ))}
      </span>
    </span>
  );
}
