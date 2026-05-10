"use client";

interface BarChartHorizontalDatum {
  label: string;
  value: number;
}

interface BarChartHorizontalProps {
  data: BarChartHorizontalDatum[];
  valueLabel?: (v: number) => string;
}

const ROW_HEIGHT = 28;
const ROW_GAP = 8;
const LABEL_WIDTH = 110;
const PADDING_X = 12;
const VALUE_WIDTH = 50;

export function BarChartHorizontal({
  data,
  valueLabel = (v) => String(v),
}: BarChartHorizontalProps) {
  if (data.length === 0) {
    return (
      <p className="font-mono text-xs uppercase text-ink-subtle">Brak danych</p>
    );
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  const height = data.length * ROW_HEIGHT + (data.length - 1) * ROW_GAP;
  const width = 480;
  const trackStart = LABEL_WIDTH + PADDING_X;
  const trackEnd = width - VALUE_WIDTH - PADDING_X;
  const trackWidth = trackEnd - trackStart;

  return (
    <svg
      role="img"
      aria-label="Bar chart"
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
    >
      {data.map((d, i) => {
        const y = i * (ROW_HEIGHT + ROW_GAP);
        const w = Math.round((d.value / max) * trackWidth);
        return (
          <g key={d.label}>
            <text
              x={LABEL_WIDTH}
              y={y + ROW_HEIGHT / 2 + 4}
              textAnchor="end"
              fontFamily="ui-monospace, monospace"
              fontSize="11"
              className="fill-ink"
            >
              {d.label}
            </text>
            <rect
              x={trackStart}
              y={y}
              width={trackWidth}
              height={ROW_HEIGHT}
              className="fill-bg"
              stroke="currentColor"
              strokeWidth="2"
            />
            <rect
              x={trackStart}
              y={y}
              width={w}
              height={ROW_HEIGHT}
              className="fill-lime"
            />
            <text
              x={trackEnd + PADDING_X}
              y={y + ROW_HEIGHT / 2 + 4}
              fontFamily="ui-monospace, monospace"
              fontSize="11"
              className="fill-ink font-bold"
            >
              {valueLabel(d.value)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
