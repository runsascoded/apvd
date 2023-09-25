# ∧p∨d
Area-Proportional Venn Diagram generator (WIP)

<!-- toc -->
- [Demos](#demo)
    - [Gradient descent toward target region sizes](#demo-apvd)
    - [Draggable ellipses](#demo-ellipses)
- [Motivation](#motivation)
    - [Approach](#approach)
    - [Status](#status)
- [Further inspiration](#inspo)
    - [combinatorics.org Survey](#survey)
        - [5 symmetric triangles](#5-triangles)
        - [6 triangles](#6-triangles)
        - [Polyominoes](#polyominoes)
    - [Other references](#misc)
- [Related libraries](#libs)
    - [Rust](#rust)
    - [JS](#js)
    - [Scala](#scala)
<!-- /toc -->

## Demos <a id="demo"></a>

### Gradient descent toward target region sizes <a id="demo-apvd"></a>

https://github.com/runsascoded/apvd/assets/465045/87b3c520-3413-41a1-9ea6-c2281c2fc68c

- Live: [runsascoded.com/apvd]
- Uses [runsascoded/shapes] to compute intersections + areas, in terms of circle's center/radius gradients, and gradient-descend to target proportions
- "Targets" and initial layout can be configured via the "Examples" and "Layouts" drop-downs

### Draggable ellipses <a id="demo-ellipses"></a>

https://github.com/runsascoded/apvd/assets/465045/108e974d-f103-4005-9762-732c25f8cb7b

- Live: [runsascoded.com/apvd/ellipses]
- Implemented in JS, in an earlier (pre-[shapes][runsascoded/shapes]) version of this project; see [pages/ellipses.tsx]
- Computes intersections/regions, but isn't differentiable

## Motivation <a id="motivation"></a>
Years ago, I saw this plot in [a genomics paper](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3753564/pdf/btt375.pdf):

<img alt="Venn Diagram comprised of 4 ellipses" src="public/img/4-ellipses.png" width="500" />

I thought:
1. It's neat that 4 ellipses can intersect to form all 15 ($2^4-1$) possible regions (that's impossible with 4 circles)
2. It's weird that the areas are wildly disproportionate to the numbers they represent (e.g. there's a "1" that's larger than an adjacent "112")

After reading up on it, it seemed like generating "area-proportional Venn diagrams" was essentially an open problem. [Ben Frederickson] made a [circle-based generator][benfred generator] in 2013 that seemed to be the state of the art:

<img alt="Venn Diagram comprised of 3 circles, with region areas displayed" src="public/img/3-circles.png" width="500" />

However, many (most!) possible inputs are impossible to model, even for just 3 sets, let alone more:

![benfred movies example](https://github.com/runsascoded/apvd/assets/465045/9f4e22ce-5932-430a-a28a-78571a67da7f)

I also saw further variations [in the wild](https://www.hindawi.com/journals/bmri/2015/456479/):

<img alt="Venn Diagram comprised of 5 nonconvex blobs" src="public/img/5-blobs.png" width="500" />

### Approach <a id="approach"></a>
I've worked on generating area-proportional Venn diagrams for years since, on and off. My approach has been to:
1. model a "scene" with various intersecting shapes
2. compute intersection points
3. infer regions and sizes for each subset of the set of shapes
4. compute error (desired size - actual size, for all regions)
5. gradient-descend the shapes' coordinates (center x/y, radius x/y) in the direction of decreasing error

Several of these turn out to be nontrivial, especially:
- computing intersection points between 2 ellipses (involves solving a quartic equation, as ellipses can intersect in up to 4 points)
- propagating useful gradients through all calculations (requires an autodiff abstraction, which programming languages vary in their level of support for, and also adds to overall computation and complexity required)

### Status <a id="status"></a>
The demo at [runsascoded.com/apvd] supports up to 4 ellipses (including allowing them to rotate relative to the axes), and arbitrary initial layouts and target region-sizes. It can gradient-descend for 10,000's of steps and converge, or reach negligible error levels, on a few toy examples I've tested it on.

Future work could involve:
- command-line / server-based version (evolving models from multiple initial layouts in parallel)
- more shapes (rectangles, polygons, splines)
- more ability to configure examples, and save and share state

## Further inspiration <a id="inspo"></a>

### combinatorics.org Survey <a id="survey"></a>
https://www.combinatorics.org/files/Surveys/ds5/ds5v3-2005/VennEJC.html

#### 5 symmetric triangles <a id="5-triangles"></a>
![Venn Diagram comprised of 5 symmetric triangles](public/img/5-triangles.gif)

https://www.combinatorics.org/files/Surveys/ds5/ds5v3-2005/VennSymmExamples.html

#### 6 triangles <a id="6-triangles"></a>
![Venn Diagram comprised of 6 differently-shaped triangles](public/img/6-triangles.gif)
https://www.combinatorics.org/files/Surveys/ds5/ds5v3-2005/VennTriangleEJC.html

#### Polyominoes <a id="polyominoes"></a>
https://www.combinatorics.org/files/Surveys/ds5/ds5v3-2005/VennPoly67EJC.html

> Shown below is a 6-Venn diagram formed entirely from curves drawn from axis-aligned edges. It is a minimum-area diagram; that is, each region is composed of a single square of unit area. Note that many edges overlap, so the diagram is [infinitely intersecting](https://www.combinatorics.org/files/Surveys/ds5/ds5v3-2005/VennOtherEJC.html#infinite). As with many other diagrams in these pages, regions are coloured by weight. The diagrams on this page are from \[[CR05](https://www.combinatorics.org/files/Surveys/ds5/ds5v3-2005/VennRefs.html#CR05)\].
> ![](public/img/polyvenn6-diag.png)
>
> The six component curves of the diagram, overlaid on a grayed-out version of the entire diagram:
> ![](public/img/polyvenn6-curves.png)
>
> This is a 7-Venn diagram formed entirely from curves drawn from axis-aligned edges. Like the above it is minimum-area and infinitely intersecting.
>
> ![](public/img/polyvenn7-diag.png)
>
> The seven component curves:
>
> ![](public/img/polyvenn7-curves.png)

### Other references <a id="misc"></a>
- [venneuler R package](https://www.rforge.net/venneuler/) ([paper](https://www.cs.uic.edu/~wilkinson/Publications/venneuler.pdf))
- [UpSet plots](https://en.wikipedia.org/wiki/UpSet_Plot)

## Related libraries <a id="libs"></a>

### Rust <a id="rust"></a>
Dual / Autodiff libraries:
- https://github.com/itt-ustutt/num-dual ([r/rust](https://www.reddit.com/r/rust/comments/ybi9yx/automatic_differentiation_and_thermodynamics_with/))
- https://crates.io/crates/hyperdual/
- https://github.com/elrnv/autodiff
- https://github.com/djmaxus/autodj
- https://github.com/raskr/rust-autograd includes reverse-mode
- ~https://docs.rs/dual_num/latest/dual_num/~ (archived)
- https://crates.io/crates/fwd_ad 3yrs stale
- https://gist.github.com/emilk/c027311e5d0e8b69953c83a3ec283b74
- https://docs.rs/roots/latest/roots/ real roots only

### JS <a id="js"></a>
[quartic.js](https://www.npmjs.com/package/quartic) (last release 2008)
Core code is from a [web solver](http://www.akiti.ca/Quad4Deg.html) written by [David Binner](http://www.akiti.ca/ContactPage.html)

### Scala <a id="scala"></a>
Partial Scala.js implementation in [this repo's @scala branch](https://github.com/runsascoded/apvd/tree/scala), including [cubic](https://github.com/runsascoded/apvd/tree/scala/cubic/shared/src/main/scala/cubic) and [quartic](https://github.com/runsascoded/apvd/tree/scala/quartic/shared/src/main/scala/quartic) equation solvers.

[runsascoded/shapes]: https://github.com/runsascoded/shapes
[Ben Frederickson]: https://github.com/benfred
[benfred generator]: https://www.benfrederickson.com/venn-diagrams-with-d3.js/
[pages/ellipses.tsx]: https://github.com/runsascoded/apvd/blob/main/pages/ellipses.tsx
[runsascoded.com/apvd/ellipses]: https://runsascoded.com/apvd/ellipses
[runsascoded.com/apvd]: https://runsascoded.com/apvd
