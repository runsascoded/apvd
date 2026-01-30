# APVD - Area-Proportional Venn Diagrams (`static` branch)

Fully static SPA for generating area-proportional Venn diagrams. Runs WASM in a Web Worker - deployable to GitHub Pages with no backend server needed.

**Live**: https://runsascoded.com/apvd
**Repo**: https://github.com/runsascoded/apvd

## Branches

This repo uses two branches for different deployment modes:

| Branch | Mode | Description |
|--------|------|-------------|
| `server` | **WebSocket backend** | Frontend connects to native Rust server via WebSocket RPC. Better performance, recommended for users. |
| `static` | WASM Worker | Fully static SPA, runs WASM in a Web Worker. Deployable to GitHub Pages, no server needed. |

Most commits cherry-pick cleanly between branches. Conflicts occur at:
- `package.json` (different deps: `static` needs `apvd-wasm`, `server` doesn't)
- Transport config (`createTrainingClient({ transport: "worker" })` vs `"websocket"`)
- README.md / CLAUDE.md (branch-specific docs)

See also: [static branch], [server branch]

[static branch]: https://github.com/runsascoded/apvd/tree/static
[server branch]: https://github.com/runsascoded/apvd/tree/server

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                      Frontend (React/Vite)                       │
├──────────────────────────────────────────────────────────────────┤
│                      TrainingClient API                          │
│                      (@apvd/client)                              │
├─────────────────────────────┬────────────────────────────────────┤
│   WorkerTransport (static)  │    WebSocketTransport (server)     │
│   (postMessage to Worker)   │    (RPC to Rust server)            │
└─────────────────────────────┴────────────────────────────────────┘
             │                              │
             ▼                              ▼
    ┌────────────────┐           ┌─────────────────────┐
    │  apvd-wasm     │           │  apvd serve         │
    │  (WASM Worker) │           │  (native Rust)      │
    └────────────────┘           └─────────────────────┘
```

**Repos:**
- **apvd** (this repo): Vite/React frontend, visualization, UI
- **[shapes]** (`../shapes`): Rust library for math, autodiff, optimization
  - `apvd-wasm`: WASM build (for `static` branch)
  - `apvd-core`: Core library (used by both WASM and native server)
  - `@apvd/client`: TypeScript client with Worker and WebSocket transports

[shapes]: https://github.com/runsascoded/shapes

## Quick Start

```bash
pnpm install
pnpm dev       # Dev server on :5183
pnpm build     # Production build
pnpm test      # Vitest tests
```

### shapes (Rust/WASM)

```bash
cd ../shapes
wasm-pack build --target web   # Outputs to pkg/
cargo test
```

## Key Files

### Frontend (`src/`)
- `src/App.tsx`: Main app - UI, state management, keyboard shortcuts
- `src/lib/shape.ts`: Shape types (Circle, XYRR, XYRRT, Polygon)
- `src/lib/shapes-buffer.ts`: Binary encoding for URL serialization (uses [use-prms] for bit-packing)
- `src/lib/targets.ts`: Target region sizes
- `src/lib/regions.ts`: Region computation, area calculations
- `src/lib/layout.ts`: Initial shape configurations (Ellipses4, CirclesFlexible, etc.)
- `src/lib/sample-targets.tsx`: Built-in examples (FizzBuzz, Zhang 2014, etc.)
- `src/lib/params.ts`: URL parameter handling
- `src/components/grid.tsx`: Main SVG visualization
- `src/components/fab.tsx`: Floating action button (controls bar)
- `src/components/theme-toggle.tsx`: Light/dark mode toggle
- `src/components/tables/`: Interactive data tables (targets, shapes, vars)

[use-prms]: https://github.com/runsascoded/use-prms

### Rust/WASM (`../shapes/src/`)
- `lib.rs`: WASM exports (`make_model`, `train`, `make_step`, etc.)
- `dual.rs`: Forward-mode autodiff wrapper
- `shape.rs`: Shape enum with traits
- `ellipses/quartic.rs`: Quartic solver for ellipse intersections
- `region.rs`, `regions.rs`: Region geometry
- `model.rs`, `step.rs`: Optimization loop
- `math/`: Polynomial solvers (quadratic, cubic, quartic)

## URL Parameters

State is encoded in the hash fragment for shareability:
- `s`: Shapes (binary-encoded, base64)
- `t`: Targets (comma-separated, prefix `i` for inclusive)
- `n`: Set metadata (names, abbreviations, colors)

Example: `#s=Mzx868w...&t=i16,16,4,12,4,3,2&n=Fizz,Buzz,Bazz`

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Space | Play/pause forward |
| Shift+Space | Play/pause reverse |
| ← / → | Step back/forward |
| Shift+← / Shift+→ | Step 10 |
| ⌘+← / ⌘+→ | Jump to start/end |

## Shape Types

- **Circle**: center (x,y), radius r
- **XYRR**: axis-aligned ellipse - center (x,y), radii (rx, ry)
- **XYRRT**: rotated ellipse - center (x,y), radii (rx, ry), rotation theta
- **Polygon**: vertices as array of (x,y) points

## Dependencies

Frontend:
- vite@6, react@18, typescript@5
- react-bootstrap, react-plotly.js
- [use-kbd] for keyboard shortcuts and omnibar
- [use-prms] for lossy float/binary encoding (URL serialization)
- [@apvd/client] for training client abstraction
- `apvd-wasm` (WASM binary, loaded by Worker)

Rust (shapes repo):
- num-dual (autodiff), nalgebra (linear algebra)
- wasm-bindgen, serde-wasm-bindgen, tsify (WASM build)

[use-kbd]: https://github.com/runsascoded/use-kbd
[@apvd/client]: https://github.com/runsascoded/shapes/tree/main/client

## Development Workflow

### Working with branches

```bash
# Switch between modes
git checkout static   # WASM Worker mode
git checkout server   # WebSocket backend mode

# Cherry-pick commits across branches
git checkout server
git cherry-pick <commit-from-static>

# View differences between branches
git diff static..server
```

### Local dependency development

Use [pds] (pnpm-dep-source) to develop against local builds:

```bash
# Point at local @apvd/client
pds init ../shapes/client
pds local @apvd/client

# Point at local apvd-wasm (static branch only)
pds init ../shapes/apvd-wasm
pds local apvd-wasm

# Switch back to npm/GitHub versions
pds npm @apvd/client
pds gh apvd-wasm
```

[pds]: https://github.com/runsascoded/pnpm-dep-source

## Known Issues / TODOs

- Absolute error metric only (shapes#9)
- Basic missing-region penalty (shapes#10)
- URL params are 1-directional / lossy (UI→URL, not URL→UI after init)

## Improvement Roadmap

### Phase 1: Tooling Modernization ✓
- [x] Convert Next.js → Vite (static SPA, no SSR needed)
- [x] Switch npm → pnpm
- [x] Upgrade dependencies (React 18, TypeScript 5.7, Vite 6)
- [x] Add [scrns] for automated screenshot capture

### Phase 2: Library Integration ✓
- [x] Replace manual keyboard handling with [use-kbd]
  - Omnibar (⌘K) for actions
  - User-customizable keybindings
  - Shortcuts modal
- [x] Integrate [use-prms] for lossy float/binary encoding
  - Custom base64 alphabet for backward-compatible URL serialization
  - Bit-aligned encoding for compact URLs

### Phase 3: UI Improvements ✓
- [x] Light/dark mode with theme toggle
- [x] Floating controls bar (FAB)
  - Theme toggle, keyboard shortcuts button, GitHub link
- [ ] Responsive layout improvements

### Phase 4: Polygon Support ✓ (shapes crate)
- [x] Add `Polygon` shape type to shapes crate
  - Vertices as `Vec<R2<D>>`
  - Polygon-polygon intersection (line segment intersections)
  - Shoelace formula for area
- [x] Binary encoding for polygons in URL params
- [ ] Self-intersection detection and prevention
- [ ] Convexity/skinny penalty in loss function
- [ ] Polygon vertex manipulation UI

### Phase 5: Future (Curvy Blobs)
- [ ] Circular arc splines: alternating line segments + circular arcs
  - Arc-arc and arc-line intersections are closed-form
  - Tractable middle ground before full Bezier curves

[scrns]: https://www.npmjs.com/package/scrns
[use-kbd]: https://www.npmjs.com/package/use-kbd
[use-prms]: https://github.com/runsascoded/use-prms

## Tests

```bash
pnpm test             # Vitest (frontend)
cd ../shapes && cargo test  # Rust
```

Test files: `tests/*.test.ts` (shape encoding, backward compatibility, math functions)
