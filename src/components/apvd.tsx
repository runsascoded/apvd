import {ReactNode, useEffect, useState} from "react";
import init_apvd, {init_logs, update_log_level} from "apvd";

export type LogLevel = "debug" | "info" | "warn" | "error"

export type Props = {
    logLevel: LogLevel
    children: () => ReactNode
}
export default function Apvd({ logLevel, children }: Props) {
    // Initialize wasm library
    const [ apvdInitialized, setApvdInitialized ] = useState(false)
    useEffect(
        () => {
            init_apvd().then(() => {
                init_logs()
                setApvdInitialized(true)
            })
        },
        []
    );

    // WASM log level
    useEffect(
        () => {
            if (!apvdInitialized) return
            update_log_level(logLevel)
        },
        [ apvdInitialized, logLevel, ]
    );

    return apvdInitialized ? <>{children()}</> : <div>Loading...</div>
}
