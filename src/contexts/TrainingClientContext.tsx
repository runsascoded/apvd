/**
 * TrainingClientContext - Context for sharing the TrainingClient instance.
 *
 * Creates a single TrainingClient with the Worker transport and shares it
 * across the app. The client is created lazily on first use.
 */

import React, { createContext, useContext, useMemo, useEffect, useRef } from "react"
import { createTrainingClient, TrainingClient } from "@apvd/client"

interface TrainingClientContextValue {
  client: TrainingClient
}

const TrainingClientContext = createContext<TrainingClientContextValue | null>(null)

export function TrainingClientProvider({ children }: { children: React.ReactNode }) {
  const clientRef = useRef<TrainingClient | null>(null)

  // Create client lazily
  const client = useMemo(() => {
    if (!clientRef.current) {
      clientRef.current = createTrainingClient({ transport: "worker" })
    }
    return clientRef.current
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clientRef.current?.disconnect()
      clientRef.current = null
    }
  }, [])

  const value = useMemo(() => ({ client }), [client])

  return (
    <TrainingClientContext.Provider value={value}>
      {children}
    </TrainingClientContext.Provider>
  )
}

export function useTrainingClient(): TrainingClient {
  const context = useContext(TrainingClientContext)
  if (!context) {
    throw new Error("useTrainingClient must be used within a TrainingClientProvider")
  }
  return context.client
}
