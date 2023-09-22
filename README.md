# ∧p∨d
Area-Proportional Venn Diagram generator (WIP)

<!-- toc -->
- [Demo](#demo)
    - [Gradient descent toward target region sizes: runsascoded.com/apvd](#demo)
    - [Draggable ellipses + intersections: runsascoded.com/apvd/ellipses](#ellipses)
- [Status](#status)
- [Inspiration](#inspo)
    - [Non-area-proportional Venn Diagrams in papers](#papers)
    - [Area-proportional Venn Diagrams (circles only)](#circles)
    - [combinatorics.org Survey](#survey)
        - [5 symmetric triangles](#5-triangles)
        - [6 triangles](#6-triangles)
        - [Polyominoes](#polyominoes)
- [Other misc references](#misc)
    - [Rust](#rust)
    - [JS](#js)
    - [Scala](#scala)
<!-- /toc -->

## Demo <a id="demo"></a>

### Gradient descent toward target region sizes: [runsascoded.com/apvd](https://runsascoded.com/apvd) <a id="demo"></a>

https://github.com/runsascoded/apvd/assets/465045/87b3c520-3413-41a1-9ea6-c2281c2fc68c

(*uses [runsascoded/shapes] to compute intersections + areas, in terms of circle's center/radius gradients, and gradient-descend to target proportions*)

## Status <a id="status"></a>
- [x] Compute ellipse intersections / areas
- Autodiff computations + gradient-descend to optimal solution (see [runsascoded/shapes])
  - [x] circles
  - [x] "aligned" ellipses (rx/ry parallel to x/y axes)
  - [ ] "unaligned" ellipses (arbitrary rotations)
  - [ ] rectangles / polygons

## Inspiration <a id="inspo"></a>

### Non-area-proportional Venn Diagrams in academic papers <a id="papers"></a>

https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3753564/pdf/btt375.pdf

![Venn Diagram comprised of 4 ellipses](public/img/4-ellipses.png)

https://www.hindawi.com/journals/bmri/2015/456479/

<img alt="Venn Diagram comprised of 5 nonconvex blobs" src="public/img/5-blobs.png" width="500" />

### Area-proportional Venn Diagrams (circles only) <a id="circles"></a>

![Venn Diagram comprised of 3 circles, with region areas displayed](public/img/3-circles.png)

[Blog (2013)](https://www.benfrederickson.com/venn-diagrams-with-d3.js/), [follow-up (2013)](https://www.benfrederickson.com/calculating-the-intersection-of-3-or-more-circles/), [benfred/venn.js](https://github.com/benfred/venn.js), [upsetjs/venn.js](https://github.com/upsetjs/venn.js)

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

## Other references <a id="misc"></a>
- [venneuler R package](https://www.rforge.net/venneuler/) ([paper](https://www.cs.uic.edu/~wilkinson/Publications/venneuler.pdf))
- [UpSet plots](https://en.wikipedia.org/wiki/UpSet_Plot)

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
