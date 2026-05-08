import {useState, useEffect} from "react";

/**
 * Służy do ekstrakcji wartości zmiennych CSS zdefiniowanych w :root (globals.css)
 * i udostępnia ich do formie obiektow JS
 *
 * @description
 * MapLibre/Mapbox nie mają możliwości bezpośrednio odczytać stylów CSS typu `var(--color)`
 * Ten hook to bridge, który pobiera aktualne wartości i przekazuje je do warstw map
 *
 */
export function useThemeColors() {
    const [colors, setColors] = useState({
        navy: "#1E3A8A",
        lime: "#BEF264",
        navyHover: "#0F1E4A",
        ink: "#0A0A0A",
    });

    useEffect(() => {
        const root = document.documentElement;

        const getVar = (name: string, fallback: string) => {
            const value = getComputedStyle(root).getPropertyValue(name).trim();
            return value || fallback
        };

        setColors({
            navy: getVar("--navy", "#1E3A8A"),
            lime: getVar("--lime", "#BEF264"),
            navyHover: getVar("--navy-hover", "#0F1E4A"),
            ink: getVar("--ink", "#0A0A0A"),
        })
    }, []);

    return colors;
}