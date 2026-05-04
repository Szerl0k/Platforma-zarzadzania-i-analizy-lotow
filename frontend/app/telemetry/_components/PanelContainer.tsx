"use client";

import { useCallback, useRef, useState, useEffect } from "react";
import { AirportPanel } from "@/common/components/Map/AirportPanel";
import { CityAirportsPanel } from "@/common/components/Map/CityAirportsPanel";
import { FlightPanel } from "@/common/components/Map/FlightPanel";
import type { Airport, AirlineWithDestinations } from "@/common/api/airports";
import type { FlightFeatureProperties } from "@/app/telemetry/_utils/telemetryMapHelpers";

interface PanelContainerProps {
  cityAirports: Airport[];
  selectedAirportData: Airport | null;
  selectedFlight: GeoJSON.Feature<GeoJSON.Point> | null;
  selectedAirlineIcaos: Set<string>;
  openAirportPanel: (airport: Airport) => void;
  handlePanelClose: () => void;
  handleFlightPanelClose: () => void;
  handleCityPanelClose: () => void;
  handleAirlineToggle: (airlineIcao: string, destinations: Airport[]) => void;
  handleToggleAll: (allRoutes: AirlineWithDestinations[]) => void;
}

/**
 * Manages the side panels for telemetry data, including resizing logic
 * and switching between different panel types (City, Airport, Flight).
 */
export function PanelContainer({
  cityAirports,
  selectedAirportData,
  selectedFlight,
  selectedAirlineIcaos,
  openAirportPanel,
  handlePanelClose,
  handleFlightPanelClose,
  handleCityPanelClose,
  handleAirlineToggle,
  handleToggleAll,
}: PanelContainerProps) {
  // Panel width state (shared across all panels for consistency)
  const [panelWidth, setPanelWidth] = useState(320); // Default w-80 = 320px
  const [isResizing, setIsResizing] = useState(false);
  const isResizingRef = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    isResizingRef.current = true;
    document.body.style.cursor = "col-resize";
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizingRef.current) return;

    e.preventDefault();
    const newWidth = e.clientX;

    // Width limits: min 320px, max 800px or 50vw
    if (newWidth >= 320 && newWidth <= Math.min(800, window.innerWidth * 0.5)) {
      setPanelWidth(newWidth);
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isResizingRef.current) {
      setIsResizing(false);
      isResizingRef.current = false;
      document.body.style.cursor = "default";
    }
  }, []);

  useEffect(() => {
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "default";
    };
  }, [handleMouseMove, handleMouseUp]);

  const isAnyPanelOpen = Boolean(
    cityAirports.length > 0 || selectedAirportData || selectedFlight,
  );

  return (
    <div
      className={`h-full flex shrink-0 relative overflow-hidden ${isResizing ? "" : "transition-[width] duration-300"}`}
      style={{ width: isAnyPanelOpen ? `${panelWidth}px` : "0px" }}
    >
      <div className="flex-1 min-w-[320px] h-full flex flex-col relative border-r-2 border-ink bg-surface">
        {/* City airports panel */}
        {cityAirports.length > 0 && (
          <div className="absolute inset-0 z-10 bg-surface">
            <CityAirportsPanel
              airports={cityAirports}
              selectedIcao={selectedAirportData?.icaoCode ?? null}
              onSelect={openAirportPanel}
              onClose={handleCityPanelClose}
            />
          </div>
        )}

        {/* Airport details and routes panel */}
        {selectedAirportData && !selectedFlight && (
          <div className="absolute inset-0 z-20 bg-surface">
            <AirportPanel
              key={selectedAirportData.icaoCode}
              airport={selectedAirportData}
              selectedAirlineIcaos={selectedAirlineIcaos}
              onClose={handlePanelClose}
              onAirlineToggle={handleAirlineToggle}
              onToggleAll={handleToggleAll}
            />
          </div>
        )}

        {/* Individual Flight Panel */}
        {selectedFlight && (
          <div className="absolute inset-0 z-30 bg-surface">
            <FlightPanel
              properties={selectedFlight.properties as FlightFeatureProperties}
              onClose={handleFlightPanelClose}
            />
          </div>
        )}
      </div>

      {/* Resizer Handle */}
      {isAnyPanelOpen && (
        <div
          className="w-2 hover:bg-ink/10 cursor-col-resize absolute right-0 top-0 bottom-0 flex items-center justify-center group z-50 transform translate-x-1/2"
          onMouseDown={handleMouseDown}
        >
          <div className="w-0.5 h-8 bg-ink/30 group-hover:bg-ink/60 rounded-full" />
        </div>
      )}
    </div>
  );
}
