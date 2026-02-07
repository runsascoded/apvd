/**
 * Training Worker wrapper for Vite bundling.
 *
 * Re-exports @apvd/worker's worker implementation so Vite can bundle it
 * with proper dependency resolution (including @apvd/wasm).
 */
import "@apvd/worker/worker"
