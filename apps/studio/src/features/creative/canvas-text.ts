/** Fit one heading line without allowing glyphs to cross the poster margins. */
export function fitHeading(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  preferredSize: number,
  minimumSize: number,
): { text: string; adjusted: boolean; truncated: boolean } {
  let size = preferredSize;
  const setFont = () => {
    ctx.font = `normal ${size}px "Noto Serif SC", "Songti SC", serif`;
  };
  setFont();
  while (size > minimumSize && ctx.measureText(text).width > maxWidth) {
    size -= 1;
    setFont();
  }
  if (ctx.measureText(text).width <= maxWidth)
    return { text, adjusted: size < preferredSize, truncated: false };
  const chars = Array.from(text);
  while (chars.length && ctx.measureText(chars.join('') + '…').width > maxWidth) chars.pop();
  return { text: chars.join('') + '…', adjusted: true, truncated: true };
}
