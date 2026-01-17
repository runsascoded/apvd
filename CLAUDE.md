# APVD - Area-Proportional Venn Diagrams

Interactive web app for generating area-proportional Venn diagrams using up to 4 ellipses with gradient-descent optimization.

**Live**: https://runsascoded.com/apvd
**Repo**: https://github.com/runsascoded/apvd

## Architecture

Two repos:
- **apvd** (this repo): Next.js/React frontend, visualization, UI
- **[shapes]** (`../shapes`): Rust→WASM library for math, autodiff, optimization

[shapes]: https://github.com/runsascoded/shapes

## Quick Start

```bash
npm install
npm run dev    # Dev server on :3000
npm run build  # Production build
npm run test   # Jest tests
```

### shapes (Rust/WASM)

```bash
cd ../shapes
wasm-pack build --target web   # Outputs to pkg/
cargo test
```

## Key Files

### Frontend (`pages/`, `src/`)
- `pages/index.tsx`: Main app (≈1500 lines) - UI, state management, keyboard shortcuts
- `src/lib/shape.ts`: Shape types (Circle, XYRR, XYRRT)
- `src/lib/shapes-buffer.ts`: Binary encoding for URL serialization
- `src/lib/targets.ts`: Target region sizes
- `src/lib/regions.ts`: Region computation, area calculations
- `src/lib/layout.ts`: Initial shape configurations (Ellipses4, CirclesFlexible, etc.)
- `src/lib/sample-targets.tsx`: Built-in examples (FizzBuzz, Zhang 2014, etc.)
- `src/components/grid.tsx`: Main SVG visualization
- `src/components/tables/`: Interactive data tables (targets, shapes, vars)

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

## Dependencies

Frontend uses:
- next@13.2.4, react@18.2.0
- react-bootstrap, react-plotly.js
- [next-utils] for param handling
- apvd (shapes WASM) via gitpkg

Rust uses:
- num-dual (autodiff), nalgebra (linear algebra)
- wasm-bindgen, serde-wasm-bindgen, tsify

[next-utils]: https://github.com/runsascoded/next-utils

## Known Issues / TODOs

- Max 4 shapes (ellipses); polygon support would enable more
- Absolute error metric only (shapes#9)
- Basic missing-region penalty (shapes#10)
- URL params are 1-directional / lossy (UI→URL, not URL→UI after init)

## Improvement Roadmap

### Phase 1: Tooling Modernization
- [ ] Convert Next.js → Vite (static SPA, no SSR needed)
- [ ] Switch npm → pnpm
- [ ] Upgrade dependencies (React 18→19, TypeScript 5.1→5.7, etc.)
- [ ] Add [scrns] for automated screenshot capture of examples

### Phase 2: Library Integration
- [ ] Replace manual keyboard handling with [use-kbd]
  - Add omnibar (⌘K) for actions: play, rewind, load examples, export, etc.
  - User-customizable keybindings
  - Shortcuts modal (?)
- [ ] Replace `next-utils/params` with [@rdub/use-url-params]
  - Requires new "lossy/write-only" mode (spec at `use-url-params/SPEC-LOSSY-MODE.md`)
  - Hash param support already exists

### Phase 3: UI Improvements
- [ ] Light/dark mode with theme toggle
- [ ] Floating controls bar (L/R FAB pattern from use-kbd site)
  - Theme toggle, keyboard shortcuts button, GitHub link
- [ ] Responsive layout improvements

### Phase 4: Polygon Support (shapes + apvd)
- [ ] Add `Polygon` shape type to shapes crate
  - Vertices as `Vec<R2<D>>`
  - Polygon-polygon intersection (line segment intersections)
  - Shoelace formula for area (already have this)
- [ ] Self-intersection detection and prevention
  - Detect edge crossings
  - Either zero out gradients or heavy penalty
- [ ] Convexity/skinny penalty in loss function
  - Isoperimetric quotient: penalize low area/perimeter² ratio
  - Compare to convex hull area
- [ ] UI for polygon mode toggle (ellipses OR polygons, not mixed initially)
- [ ] Vertex manipulation UI
  - Add vertex (break edge)
  - Remove vertex
  - Drag vertices

### Phase 5: Future (Curvy Blobs)
- [ ] Circular arc splines: alternating line segments + circular arcs
  - Arc-arc and arc-line intersections are closed-form
  - Tractable middle ground before full Bezier curves

[scrns]: https://www.npmjs.com/package/scrns
[use-kbd]: https://www.npmjs.com/package/use-kbd
[@rdub/use-url-params]: https://www.npmjs.com/package/@rdub/use-url-params

## Tests

```bash
npm run test          # Jest (frontend)
cd ../shapes && cargo test  # Rust
```

Test files: `tests/*.test.ts` (shape encoding, math functions)
