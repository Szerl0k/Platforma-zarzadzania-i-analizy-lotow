"use client";

interface BarChartVerticalDatum {
  label: string;
  value: number;
}

interface BarChartVerticalProps {
  data: BarChartVerticalDatum[];
  valueLabel?: (v: number) => string;
}

const BAR_WIDTH = 56;
const BAR_GAP = 18;
const CHART_HEIGHT = 180;
const LABEL_HEIGHT = 28;
const VALUE_HEIGHT = 18;
const PADDING_X = 12;

export function BarChartVertical({
  data,
  valueLabel = (v) => String(v),
}: BarChartVerticalProps) {
  if (data.length === 0) {
    return (
      <p className="font-mono text-xs uppercase text-ink-subtle">
        Brak danych
      </p>
    );
  }
  const max = Math.max(...data.map((d) => d.value), 1);
  const innerWidth = data.length * BAR_WIDTH + (data.length - 1) * BAR_GAP;
  const width = innerWidth + 2 * PADDING_X;
  const height = CHART_HEIGHT + LABEL_HEIGHT + VALUE_HEIGHT;

  return (
    <svg
      role="img"
      aria-label="Bar chart"
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
    >
      {data.map((d, i) => {
        const barH = Math.round((d.value / max) * CHART_HEIGHT);
        const x = PADDING_X + i * (BAR_WIDTH + BAR_GAP);
        const y = VALUE_HEIGHT + (CHART_HEIGHT - barH);
        return (
          <g key={d.label}>
            <text
              x={x + BAR_WIDTH / 2}
              y={VALUE_HEIGHT - 4}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontSize="11"
              className="fill-ink font-bold"
            >
              {valueLabel(d.value)}
            </text>
            <rect
              x={x}
              y={VALUE_HEIGHT}
              width={BAR_WIDTH}
              height={CHART_HEIGHT}
              className="fill-bg"
              stroke="currentColor"
              strokeWidth="2"
            />
            <rect
              x={x}
              y={y}
              width={BAR_WIDTH}
              height={barH}
              className="fill-lime"
            />
            <text
              x={x + BAR_WIDTH / 2}
              y={VALUE_HEIGHT + CHART_HEIGHT + LABEL_HEIGHT / 2 + 4}
              textAnchor="middle"
              fontFamily="ui-monospace, monospace"
              fontSize="11"
              className="fill-ink"
            >
              {d.label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}
