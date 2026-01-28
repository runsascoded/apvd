import React, { createContext, useContext, ReactNode } from "react"
import useSessionStorageState from "use-session-storage-state"
import { LogLevel } from "../components/apvd"
import { CopyCoordinatesType } from "../components/tables/shapes"

// Panel visibility toggles
export type PanelToggles = {
    settingsShown: boolean
    setSettingsShown: (v: boolean) => void
    targetsShown: boolean
    setTargetsShown: (v: boolean) => void
    examplesShown: boolean
    setExamplesShown: (v: boolean) => void
    errorPlotShown: boolean
    setErrorPlotShown: (v: boolean) => void
    varsShown: boolean
    setVarsShown: (v: boolean) => void
    shapesShown: boolean
    setShapesShown: (v: boolean) => void
    layoutsShown: boolean
    setLayoutsShown: (v: boolean) => void
}

// Training parameters
export type TrainingSettings = {
    maxErrorRatioStepSize: number
    setMaxErrorRatioStepSize: (v: number) => void
    maxSteps: number
    setMaxSteps: (v: number) => void
    stepBatchSize: number
    setStepBatchSize: (v: number) => void
    convergenceThreshold: number
    setConvergenceThreshold: (v: number) => void
}

// Display settings
export type DisplaySettings = {
    showRegionSizes: boolean
    setShowRegionSizes: (v: boolean) => void
    shapeFillOpacity: number
    setShapeFillOpacity: (v: number) => void
    autoCenter: boolean
    setAutoCenter: (v: boolean) => void
    showSparkLines: boolean
    setShowSparkLines: (v: boolean) => void
    sparkLineLimit: number
    setSparkLineLimit: (v: number) => void
    showIntersectionPoints: boolean
    setShowIntersectionPoints: (v: boolean) => void
    svgBackgroundColor: string
    setSvgBackgroundColor: (v: string) => void
}

// URL/persistence settings
export type UrlSettings = {
    stateInUrlFragment: boolean
    setStateInUrlFragment: (v: boolean) => void
    urlShapesPrecisionScheme: number
    setUrlShapesPrecisionScheme: (v: number) => void
}

// Misc settings
export type MiscSettings = {
    logLevel: LogLevel
    setLogLevel: (v: LogLevel) => void
    copyCoordinatesType: CopyCoordinatesType
    setCopyCoordinatesType: (v: CopyCoordinatesType) => void
}

export type SettingsContextType = PanelToggles & TrainingSettings & DisplaySettings & UrlSettings & MiscSettings

const SettingsContext = createContext<SettingsContextType | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
    // Panel toggles
    const [ settingsShown, setSettingsShown ] = useSessionStorageState("settingsShown", { defaultValue: false })
    const [ targetsShown, setTargetsShown ] = useSessionStorageState("targetsShown", { defaultValue: false })
    const [ examplesShown, setExamplesShown ] = useSessionStorageState("examplesShown", { defaultValue: false })
    const [ errorPlotShown, setErrorPlotShown ] = useSessionStorageState("errorPlotShown", { defaultValue: false })
    const [ varsShown, setVarsShown ] = useSessionStorageState("varsShown", { defaultValue: false })
    const [ shapesShown, setShapesShown ] = useSessionStorageState("shapesShown", { defaultValue: false })
    const [ layoutsShown, setLayoutsShown ] = useSessionStorageState("layoutsShown", { defaultValue: false })

    // Training settings
    const [ maxErrorRatioStepSize, setMaxErrorRatioStepSize ] = useSessionStorageState("maxErrorRatioStepSize", { defaultValue: 0.5 })
    const [ maxSteps, setMaxSteps ] = useSessionStorageState("maxSteps", { defaultValue: 10000 })
    const [ stepBatchSize, setStepBatchSize ] = useSessionStorageState("stepBatchSize", { defaultValue: 20 })
    const [ convergenceThreshold, setConvergenceThreshold ] = useSessionStorageState("convergenceThreshold", { defaultValue: 1e-10 })

    // Display settings
    const [ showRegionSizes, setShowRegionSizes ] = useSessionStorageState("showRegionSizes", { defaultValue: false })
    const [ shapeFillOpacity, setShapeFillOpacity ] = useSessionStorageState<number>("shapeFillOpacity", { defaultValue: 0.2 })
    const [ autoCenter, setAutoCenter ] = useSessionStorageState("autoCenter", { defaultValue: true })
    const [ showSparkLines, setShowSparkLines ] = useSessionStorageState("showSparkLines", { defaultValue: true })
    const [ sparkLineLimit, setSparkLineLimit ] = useSessionStorageState("sparkLineLimit", { defaultValue: 40 })
    const [ showIntersectionPoints, setShowIntersectionPoints ] = useSessionStorageState("showIntersectionPoints", { defaultValue: false })
    const [ svgBackgroundColor, setSvgBackgroundColor ] = useSessionStorageState<string>("svgBackgroundColor", { defaultValue: "" })

    // URL settings
    const [ stateInUrlFragment, setStateInUrlFragment ] = useSessionStorageState<boolean>("shapesInUrlFragment", { defaultValue: true })
    const [ urlShapesPrecisionScheme, setUrlShapesPrecisionScheme ] = useSessionStorageState<number>("urlShapesPrecisionScheme", { defaultValue: 6 })

    // Misc
    const [ logLevel, setLogLevel ] = useSessionStorageState<LogLevel>("logLevel", { defaultValue: "info" })
    const [ copyCoordinatesType, setCopyCoordinatesType ] = useSessionStorageState<CopyCoordinatesType>("copyCoordinatesType", { defaultValue: "JSON" })

    const value: SettingsContextType = {
        // Panel toggles
        settingsShown, setSettingsShown,
        targetsShown, setTargetsShown,
        examplesShown, setExamplesShown,
        errorPlotShown, setErrorPlotShown,
        varsShown, setVarsShown,
        shapesShown, setShapesShown,
        layoutsShown, setLayoutsShown,
        // Training
        maxErrorRatioStepSize, setMaxErrorRatioStepSize,
        maxSteps, setMaxSteps,
        stepBatchSize, setStepBatchSize,
        convergenceThreshold, setConvergenceThreshold,
        // Display
        showRegionSizes, setShowRegionSizes,
        shapeFillOpacity, setShapeFillOpacity,
        autoCenter, setAutoCenter,
        showSparkLines, setShowSparkLines,
        sparkLineLimit, setSparkLineLimit,
        showIntersectionPoints, setShowIntersectionPoints,
        svgBackgroundColor, setSvgBackgroundColor,
        // URL
        stateInUrlFragment, setStateInUrlFragment,
        urlShapesPrecisionScheme, setUrlShapesPrecisionScheme,
        // Misc
        logLevel, setLogLevel,
        copyCoordinatesType, setCopyCoordinatesType,
    }

    return (
        <SettingsContext.Provider value={value}>
            {children}
        </SettingsContext.Provider>
    )
}

export function useSettings(): SettingsContextType {
    const context = useContext(SettingsContext)
    if (!context) {
        throw new Error("useSettings must be used within a SettingsProvider")
    }
    return context
}

// Convenience hooks for specific setting groups
export function usePanelToggles(): PanelToggles {
    const ctx = useSettings()
    return {
        settingsShown: ctx.settingsShown, setSettingsShown: ctx.setSettingsShown,
        targetsShown: ctx.targetsShown, setTargetsShown: ctx.setTargetsShown,
        examplesShown: ctx.examplesShown, setExamplesShown: ctx.setExamplesShown,
        errorPlotShown: ctx.errorPlotShown, setErrorPlotShown: ctx.setErrorPlotShown,
        varsShown: ctx.varsShown, setVarsShown: ctx.setVarsShown,
        shapesShown: ctx.shapesShown, setShapesShown: ctx.setShapesShown,
        layoutsShown: ctx.layoutsShown, setLayoutsShown: ctx.setLayoutsShown,
    }
}

export function useTrainingSettings(): TrainingSettings {
    const ctx = useSettings()
    return {
        maxErrorRatioStepSize: ctx.maxErrorRatioStepSize, setMaxErrorRatioStepSize: ctx.setMaxErrorRatioStepSize,
        maxSteps: ctx.maxSteps, setMaxSteps: ctx.setMaxSteps,
        stepBatchSize: ctx.stepBatchSize, setStepBatchSize: ctx.setStepBatchSize,
        convergenceThreshold: ctx.convergenceThreshold, setConvergenceThreshold: ctx.setConvergenceThreshold,
    }
}

export function useDisplaySettings(): DisplaySettings {
    const ctx = useSettings()
    return {
        showRegionSizes: ctx.showRegionSizes, setShowRegionSizes: ctx.setShowRegionSizes,
        shapeFillOpacity: ctx.shapeFillOpacity, setShapeFillOpacity: ctx.setShapeFillOpacity,
        autoCenter: ctx.autoCenter, setAutoCenter: ctx.setAutoCenter,
        showSparkLines: ctx.showSparkLines, setShowSparkLines: ctx.setShowSparkLines,
        sparkLineLimit: ctx.sparkLineLimit, setSparkLineLimit: ctx.setSparkLineLimit,
        showIntersectionPoints: ctx.showIntersectionPoints, setShowIntersectionPoints: ctx.setShowIntersectionPoints,
        svgBackgroundColor: ctx.svgBackgroundColor, setSvgBackgroundColor: ctx.setSvgBackgroundColor,
    }
}
