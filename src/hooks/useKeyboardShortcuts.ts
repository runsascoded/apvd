/**
 * useKeyboardShortcuts - Hook for registering keyboard shortcuts via use-kbd.
 *
 * Registers all playback and global keyboard shortcuts.
 */

import { useAction } from 'use-kbd'
import { Model } from '../lib/regions'
import { RunningState } from '../types'

export type UseKeyboardShortcutsOptions = {
  // Model state
  model: Model | null
  // Step control
  setStepIdx: (idx: number) => void
  fwdStep: (n?: number) => void
  revStep: (n?: number) => void
  // Running state
  runningState: RunningState
  setRunningState: (state: RunningState) => void
  // Constraints
  cantAdvance: boolean
  cantReverse: boolean
  // Theme
  toggleTheme: () => void
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions): void {
  const {
    model,
    setStepIdx,
    fwdStep,
    revStep,
    runningState,
    setRunningState,
    cantAdvance,
    cantReverse,
    toggleTheme,
  } = options

  // Playback shortcuts
  useAction('playback:step-forward', {
    label: 'Step forward',
    group: 'playback',
    defaultBindings: ['arrowright'],
    handler: () => {
      if (cantAdvance) return
      fwdStep()
      setRunningState("none")
    },
  })

  useAction('playback:step-forward-10', {
    label: 'Step forward 10',
    group: 'playback',
    defaultBindings: ['shift+arrowright'],
    handler: () => {
      if (cantAdvance) return
      fwdStep(10)
      setRunningState("none")
    },
  })

  useAction('playback:go-to-end', {
    label: 'Go to end',
    group: 'playback',
    defaultBindings: ['meta+arrowright'],
    handler: () => {
      if (cantAdvance || !model) return
      setStepIdx(model.steps.length - 1)
      setRunningState("none")
    },
  })

  useAction('playback:step-backward', {
    label: 'Step backward',
    group: 'playback',
    defaultBindings: ['arrowleft'],
    handler: () => {
      if (cantReverse) return
      revStep(1)
      setRunningState("none")
    },
  })

  useAction('playback:step-backward-10', {
    label: 'Step backward 10',
    group: 'playback',
    defaultBindings: ['shift+arrowleft'],
    handler: () => {
      if (cantReverse) return
      revStep(10)
      setRunningState("none")
    },
  })

  useAction('playback:go-to-start', {
    label: 'Go to start',
    group: 'playback',
    defaultBindings: ['meta+arrowleft'],
    handler: () => {
      if (cantReverse) return
      setStepIdx(0)
      setRunningState("none")
    },
  })

  useAction('playback:play-pause', {
    label: 'Play/pause',
    group: 'playback',
    defaultBindings: ['space'],
    handler: () => {
      if (cantAdvance) return
      setRunningState(runningState == "fwd" ? "none" : "fwd")
    },
  })

  useAction('playback:play-pause-reverse', {
    label: 'Play/pause (reverse)',
    group: 'playback',
    defaultBindings: ['shift+space'],
    handler: () => {
      if (cantReverse) return
      setRunningState(runningState == "rev" ? "none" : "rev")
    },
  })

  // Global shortcuts
  useAction('Global:toggle-theme', {
    label: 'Toggle dark/light mode',
    group: 'Global',
    defaultBindings: ['t'],
    handler: toggleTheme,
  })
}
