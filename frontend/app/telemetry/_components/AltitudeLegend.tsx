"use client";

import React from "react";

/**
 * Legend component showing the altitude-to-color gradient for airplane markers.
 * Positioned horizontally at the bottom of the map.
 */
export function AltitudeLegend() {
  return (
    <div className="absolute left-1/2 -translate-x-1/2 bottom-8 z-10 flex flex-col items-center gap-1 py-1.5 px-16 bg-surface border-2 border-ink shadow-brut min-w-[800px]">
      <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-ink-muted leading-none">
        Wysokość (metry)
      </p>

      <div className="w-full flex flex-col gap-1.5">
        {/* Gradient Bar with Ticks */}
        <div className="w-full relative h-3">
          <div
            className="w-full h-full border border-ink/20"
            style={{
              background: "linear-gradient(to right, var(--lime), var(--navy))",
            }}
          />
          {/* Tick Marks */}
          {[0, 25, 50, 75, 100].map((pos) => (
            <div
              key={pos}
              className="absolute top-0 h-full w-[2px] bg-ink/40 -translate-x-1/2"
              style={{ left: `${pos}%` }}
            />
          ))}
        </div>

        {/* Labels positioned relative to the bar's width */}
        <div className="w-full relative h-4">
          <span className="absolute left-0 -translate-x-1/2 font-mono text-[10px] font-bold text-ink whitespace-nowrap">
            0 m
          </span>
          <span className="absolute left-1/4 -translate-x-1/2 font-mono text-[10px] font-bold text-ink-muted whitespace-nowrap">
            3,000 m
          </span>
          <span className="absolute left-1/2 -translate-x-1/2 font-mono text-[10px] font-bold text-ink-muted whitespace-nowrap">
            6,000 m
          </span>
          <span className="absolute left-3/4 -translate-x-1/2 font-mono text-[10px] font-bold text-ink-muted whitespace-nowrap">
            9,000 m
          </span>
          <span className="absolute left-full -translate-x-1/2 font-mono text-[10px] font-bold text-ink whitespace-nowrap">
            12,000+ m
          </span>
        </div>
      </div>
    </div>
  );
}
