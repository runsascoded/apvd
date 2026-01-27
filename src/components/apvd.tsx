import {ReactNode, useEffect, useState} from "react";
import init_apvd, {init_logs, update_log_level} from "apvd-wasm";

export type LogLevel = "debug" | "info" | "warn" | "error"

export type Props = {
    children: () => ReactNode
}
export default function Apvd({ children }: Props) {
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

    return apvdInitialized ? <>{children()}</> : <div>Loading...</div>
}
