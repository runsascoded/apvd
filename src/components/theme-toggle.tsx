import React, { useEffect, useMemo } from 'react'
import useLocalStorageState from 'use-local-storage-state'

export type Theme = 'light' | 'dark'
export type SparklineColors = { red: string; green: string; blue: string }

export const DIAGRAM_BG = {
    light: '#ffffff',
    dark: '#1a1a2e',
}

// Sparkline colors - need good contrast against diagram background
export const SPARKLINE_COLORS = {
    light: {
        red: '#dc3545',
        green: '#198754',
        blue: '#0d6efd',
    },
    dark: {
        red: '#ff6b6b',
        green: '#51cf66',
        blue: '#74c0fc',
    },
}

// Default shape colors - need to be visible on both themes
export const SHAPE_COLORS = {
    light: [
        '#f99',     // A - light red/pink
        'green',    // B - green
        'orange',   // C - orange
        '#99f',     // D - light blue
    ],
    dark: [
        '#ffaaaa',  // A - bright pink/salmon
        '#88ff88',  // B - bright mint green
        '#ffdd66',  // C - bright gold/yellow
        '#aaccff',  // D - bright light blue
    ],
}

// Previous dark defaults (for migration - users with old values get new brighter ones)
const OLD_DARK_DEFAULTS = [
    ['#ff8a8a', '#ff6b6b'],  // A - old darker reds
    ['#66d966', '#51cf66'],  // B - old darker greens
    ['#ffb366', '#ffd43b'],  // C - old darker oranges
    ['#a3a3ff', '#74c0fc'],  // D - old darker blues
]

// Check if a color is a default shape color for the given index
export function isDefaultShapeColor(color: string, idx: number): boolean {
    const normalized = color.toLowerCase().trim()
    const lightDefault = SHAPE_COLORS.light[idx]?.toLowerCase()
    const darkDefault = SHAPE_COLORS.dark[idx]?.toLowerCase()
    const oldDarkDefaults = OLD_DARK_DEFAULTS[idx]?.map(c => c.toLowerCase()) || []
    return normalized === lightDefault || normalized === darkDefault || oldDarkDefaults.includes(normalized)
}

// Get effective shape color based on theme
export function getEffectiveShapeColor(color: string, idx: number, theme: Theme): string {
    if (isDefaultShapeColor(color, idx)) {
        return SHAPE_COLORS[theme][idx]
    }
    return color
}

// Check if a color is a default theme background (should follow theme)
export function isDefaultBg(color: string): boolean {
    const normalized = color.toLowerCase().trim()
    return normalized === '' ||
           normalized === 'white' ||
           normalized === '#fff' ||
           normalized === '#ffffff' ||
           normalized === DIAGRAM_BG.dark.toLowerCase()
}

export function useTheme() {
    const [theme, setTheme] = useLocalStorageState<Theme>('apvd-theme', {
        defaultValue: 'light',
    })

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    const toggleTheme = () => {
        setTheme(prev => prev === 'light' ? 'dark' : 'light')
    }

    const diagramBg = useMemo(() => DIAGRAM_BG[theme], [theme])
    const sparklineColors = useMemo(() => SPARKLINE_COLORS[theme], [theme])
    const shapeColors = useMemo(() => SHAPE_COLORS[theme], [theme])

    return { theme, setTheme, toggleTheme, diagramBg, sparklineColors, shapeColors }
}

export function ThemeToggle() {
    const { theme, toggleTheme } = useTheme()

    return (
        <button
            onClick={toggleTheme}
            style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: '1.2em',
                padding: '0.2em 0.4em',
                borderRadius: '4px',
            }}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        >
            {theme === 'light' ? '🌙' : '☀️'}
        </button>
    )
}
