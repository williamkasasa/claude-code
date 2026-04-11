import { layout, layoutWithLines, measureLineStats, measureNaturalWidth, prepare, prepareWithSegments } from "@chenglou/pretext";

export interface MeasurementSample {
  lines: number;
  truncated: string;
  estimatedWidth: number;
}

interface MeasureOptions {
  font?: string;
  lineHeight?: number;
  whiteSpace?: "normal" | "pre-wrap";
}

interface HeightEstimateOptions extends MeasureOptions {
  chromeHeight?: number;
  paddingY?: number;
  minLines?: number;
}

const AVERAGE_GLYPH_WIDTH = 7.2;
const DEFAULT_FONT = '14px "Segoe UI", "Helvetica Neue", Arial, sans-serif';
const DEFAULT_LINE_HEIGHT = 20;

const preparedCache = new Map<string, ReturnType<typeof prepare>>();
const preparedSegmentsCache = new Map<string, ReturnType<typeof prepareWithSegments>>();

function normalizeText(text: string) {
  return text.replace(/\s+/g, " ").trim();
}

function supportsPretext() {
  return typeof window !== "undefined" && typeof document !== "undefined";
}

function getPrepared(text: string, options: MeasureOptions) {
  const font = options.font ?? DEFAULT_FONT;
  const whiteSpace = options.whiteSpace ?? "normal";
  const key = `${font}::${whiteSpace}::${text}`;
  const cached = preparedCache.get(key);
  if (cached) {
    return cached;
  }

  const prepared = prepare(text, font, { whiteSpace });
  preparedCache.set(key, prepared);
  return prepared;
}

function getPreparedWithSegments(text: string, options: MeasureOptions) {
  const font = options.font ?? DEFAULT_FONT;
  const whiteSpace = options.whiteSpace ?? "normal";
  const key = `${font}::${whiteSpace}::segments::${text}`;
  const cached = preparedSegmentsCache.get(key);
  if (cached) {
    return cached;
  }

  const prepared = prepareWithSegments(text, font, { whiteSpace });
  preparedSegmentsCache.set(key, prepared);
  return prepared;
}

function fallbackWrappedLines(text: string, widthPx: number) {
  if (!text.trim()) {
    return 1;
  }
  const charsPerLine = Math.max(12, Math.floor(widthPx / AVERAGE_GLYPH_WIDTH));
  return Math.max(1, Math.ceil(normalizeText(text).length / charsPerLine));
}

function findTightWidth(text: string, widthPx: number, options: MeasureOptions) {
  const prepared = getPreparedWithSegments(text, options);
  const targetStats = measureLineStats(prepared, widthPx);
  if (targetStats.lineCount <= 1) {
    return Math.min(widthPx, Math.ceil(measureNaturalWidth(prepared)));
  }

  let low = Math.max(48, Math.floor(widthPx * 0.45));
  let high = widthPx;
  let best = widthPx;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const current = measureLineStats(prepared, mid);
    if (current.lineCount <= targetStats.lineCount) {
      best = Math.max(Math.ceil(current.maxLineWidth), mid);
      high = mid - 1;
    } else {
      low = mid + 1;
    }
  }

  return Math.min(widthPx, best);
}

export function estimateWrappedLines(text: string, widthPx: number, options: MeasureOptions = {}): number {
  if (!text.trim()) {
    return 1;
  }

  if (!supportsPretext()) {
    return fallbackWrappedLines(text, widthPx);
  }

  try {
    const result = layout(
      getPrepared(text, { ...options, whiteSpace: options.whiteSpace ?? "pre-wrap" }),
      widthPx,
      options.lineHeight ?? DEFAULT_LINE_HEIGHT
    );
    return Math.max(1, result.lineCount || 1);
  } catch {
    return fallbackWrappedLines(text, widthPx);
  }
}

export function truncateMeasuredText(text: string, widthPx: number, options: MeasureOptions = {}): MeasurementSample {
  const normalized = normalizeText(text);
  if (!normalized) {
    return {
      lines: 1,
      truncated: "",
      estimatedWidth: 0,
    };
  }

  if (!supportsPretext()) {
    const charsPerLine = Math.max(8, Math.floor(widthPx / AVERAGE_GLYPH_WIDTH));
    if (normalized.length <= charsPerLine) {
      return {
        lines: 1,
        truncated: normalized,
        estimatedWidth: normalized.length * AVERAGE_GLYPH_WIDTH,
      };
    }

    return {
      lines: Math.ceil(normalized.length / charsPerLine),
      truncated: `${normalized.slice(0, Math.max(5, charsPerLine - 1))}...`,
      estimatedWidth: widthPx,
    };
  }

  try {
    const prepared = getPreparedWithSegments(normalized, options);
    const lineHeight = options.lineHeight ?? DEFAULT_LINE_HEIGHT;
    const laidOut = layoutWithLines(prepared, widthPx, lineHeight);
    const tightWidth = findTightWidth(normalized, widthPx, options);

    if (laidOut.lineCount <= 1) {
      return {
        lines: 1,
        truncated: normalized,
        estimatedWidth: Math.min(Math.ceil(measureNaturalWidth(prepared)), widthPx),
      };
    }

    const firstLine = laidOut.lines[0]?.text.trimEnd() ?? normalized;
    return {
      lines: Math.max(1, laidOut.lineCount),
      truncated: `${firstLine}...`,
      estimatedWidth: tightWidth,
    };
  } catch {
    const charsPerLine = Math.max(8, Math.floor(widthPx / AVERAGE_GLYPH_WIDTH));
    return {
      lines: Math.ceil(normalized.length / charsPerLine),
      truncated: `${normalized.slice(0, Math.max(5, charsPerLine - 1))}...`,
      estimatedWidth: widthPx,
    };
  }
}

export function measureCommentPreview(text: string, widthPx: number): MeasurementSample {
  return truncateMeasuredText(text, widthPx, {
    font: '13px "Segoe UI", "Helvetica Neue", Arial, sans-serif',
    lineHeight: 18,
  });
}

export function estimateTextBlockHeight(text: string, widthPx: number, options: HeightEstimateOptions = {}): number {
  const lineHeight = options.lineHeight ?? DEFAULT_LINE_HEIGHT;
  const lineCount = estimateWrappedLines(text, widthPx, {
    font: options.font,
    lineHeight,
    whiteSpace: options.whiteSpace ?? "pre-wrap",
  });
  const minLines = options.minLines ?? 1;
  const paddingY = options.paddingY ?? 0;
  const chromeHeight = options.chromeHeight ?? 0;
  return Math.max((Math.max(minLines, lineCount) * lineHeight) + paddingY + chromeHeight, lineHeight + paddingY + chromeHeight);
}
