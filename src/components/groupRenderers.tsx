import { createTwoColumnRenderer } from 'use-kbd'

export const PlaybackRenderer = createTwoColumnRenderer({
    headers: ['', 'Back', 'Forward'],
    getRows: () => [
        { label: 'Step (±1)', leftAction: 'playback:step-backward', rightAction: 'playback:step-forward' },
        { label: 'Step (±10)', leftAction: 'playback:step-backward-10', rightAction: 'playback:step-forward-10' },
        { label: 'Go to start/end', leftAction: 'playback:go-to-start', rightAction: 'playback:go-to-end' },
        { label: 'Play/pause', leftAction: 'playback:play-pause-reverse', rightAction: 'playback:play-pause' },
    ],
})
