import { CARD_THEMES } from '@newmaybe/design-tokens';
import type { CardTheme, CardType, FragmentForm, ExcerptForm } from './types';

function wrapLines(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split('\n')) {
    if (!paragraph) {
      lines.push('');
      continue;
    }
    let line = '';
    for (const character of paragraph) {
      const candidate = line + character;
      if (line && ctx.measureText(candidate).width > maxWidth) {
        lines.push(line);
        line = character;
      } else {
        line = candidate;
      }
    }
    lines.push(line);
  }
  return lines;
}

function fitEllipsis(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  let result = text;
  while (result && ctx.measureText(`${result}…`).width > maxWidth) result = result.slice(0, -1);
  return `${result}…`;
}

function drawWrappedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxY: number,
): number {
  const lines = wrapLines(ctx, text, maxWidth);
  const maxLines = Math.max(1, Math.floor((maxY - y) / lineHeight) + 1);
  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines && visibleLines.length > 0) {
    visibleLines[visibleLines.length - 1] = fitEllipsis(
      ctx,
      visibleLines[visibleLines.length - 1],
      maxWidth,
    );
  }
  visibleLines.forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight));
  return y + visibleLines.length * lineHeight;
}

export async function downloadCard(
  cardType: CardType,
  cardTheme: CardTheme,
  scale: number,
  fragForm: FragmentForm,
  excForm: ExcerptForm,
) {
  await document.fonts.ready;

  const width = 800;
  const height = 500;
  const canvas = document.createElement('canvas');
  canvas.width = width * scale;
  canvas.height = height * scale;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  ctx.scale(scale, scale);

  const themeColors = CARD_THEMES[cardTheme];

  ctx.fillStyle = themeColors.bg;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = themeColors.line;
  ctx.lineWidth = 1;
  ctx.strokeRect(30, 30, width - 60, height - 60);

  if (cardType === 'fragment') {
    ctx.fillStyle = themeColors.textFaint;
    ctx.font = 'italic 16px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText(fragForm.pubDate, width - 60, 60);

    ctx.fillStyle = themeColors.textSoft;
    ctx.font = '22px "Noto Serif SC", "Songti SC", serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    drawWrappedText(ctx, fragForm.content, 60, 120, width - 120, 38, 350);

    ctx.strokeStyle = themeColors.line + '99';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(60, height - 90);
    ctx.lineTo(width - 60, height - 90);
    ctx.stroke();

    ctx.fillStyle = themeColors.textFaint;
    ctx.font = '14px "Noto Serif SC", "Songti SC", serif';
    ctx.textBaseline = 'middle';
    if (fragForm.location) {
      ctx.textAlign = 'left';
      ctx.fillText(`📍 ${fragForm.location}`, 60, height - 65);
    }
    if (fragForm.mood) {
      ctx.textAlign = 'right';
      ctx.fillText(fragForm.mood, width - 60, height - 65);
    }
  } else {
    ctx.fillStyle = themeColors.accent;
    ctx.globalAlpha = 0.15;
    ctx.font = 'normal 90px "Cormorant Garamond", Georgia, serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText('"', 50, 45);
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = themeColors.text;
    ctx.font = '22px "Noto Serif SC", "Songti SC", serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';

    const endY = drawWrappedText(ctx, excForm.content, 60, 110, width - 120, 38, height - 205);

    ctx.fillStyle = themeColors.textSoft;
    ctx.font = '16px "Noto Serif SC", "Songti SC", serif';
    ctx.textAlign = 'right';
    const authorY = endY + 15 > height - 180 ? height - 170 : endY + 15;
    ctx.fillText(`— ${excForm.author}`, width - 60, authorY);
    if (excForm.source) {
      ctx.fillStyle = themeColors.textFaint;
      ctx.font = 'italic 14px "Noto Serif SC", "Songti SC", serif';
      ctx.fillText(excForm.source, width - 60, authorY + 22);
    }

    if (excForm.comment) {
      const commentStartY = height - 110;
      ctx.strokeStyle = themeColors.line;
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(60, commentStartY);
      ctx.lineTo(width - 60, commentStartY);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = themeColors.accent;
      ctx.font = 'bold 11px "Noto Serif SC", "Songti SC", serif';
      ctx.textAlign = 'left';
      ctx.fillText('随感', 60, commentStartY + 15);

      ctx.fillStyle = themeColors.textSoft;
      ctx.font = '14px "Noto Serif SC", "Songti SC", serif';
      drawWrappedText(ctx, excForm.comment, 60, commentStartY + 35, width - 120, 22, height - 50);
    }
  }

  const url = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = `newmaybe-card-${cardType}-${cardTheme}-${scale}x.png`;
  link.href = url;
  link.click();
}
