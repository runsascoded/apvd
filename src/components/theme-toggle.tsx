import React, { useEffect, useMemo } from 'react'
import useLocalStorageState from 'use-local-storage-state'

export type Theme = 'light' | 'dark'

const DIAGRAM_BG = {
    light: '#ffffff',
    dark: '#1a1a2e',
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

    return { theme, setTheme, toggleTheme, diagramBg }
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
