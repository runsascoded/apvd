# ∧p∨d
Area-Proportional Venn Diagram generator (WIP)
[runsascoded.com/apvd](https://runsascoded/apvd)

![](recording.mp4)

## Status
- [x] compute ellipse intersections / areas
- [ ] autodiff computations + gradient-descend to optimal solution
  - see [runsascoded/shapes](https://github.com/runsascoded/shapes)

## Inspiration

### Non-area-proportional Venn Diagrams in papers

https://www.hindawi.com/journals/bmri/2015/456479/
![](5-blobs.png)

https://www.ncbi.nlm.nih.gov/pmc/articles/PMC3753564/pdf/btt375.pdf
![](4-ellipses.png)

### Area-proportional Venn Diagrams (circles only)
![](3-circles.png)

[Blog (2013)](https://www.benfrederickson.com/venn-diagrams-with-d3.js/), [follow-up (2013)](https://www.benfrederickson.com/calculating-the-intersection-of-3-or-more-circles/), [benfred/venn.js](https://github.com/benfred/venn.js), [upsetjs/venn.js](https://github.com/upsetjs/venn.js)

### combinatorics.org Survey
https://www.combinatorics.org/files/Surveys/ds5/ds5v3-2005/VennEJC.html

#### 5 symmetric triangles:
![](5-triangles.gif)

https://www.combinatorics.org/files/Surveys/ds5/ds5v3-2005/VennSymmExamples.html

#### 6 triangles:
![](6-triangles.gif)
https://www.combinatorics.org/files/Surveys/ds5/ds5v3-2005/VennTriangleEJC.html

#### Polyominoes
https://www.combinatorics.org/files/Surveys/ds5/ds5v3-2005/VennPoly67EJC.html

> Shown below is a 6-Venn diagram formed entirely from curves drawn from axis-aligned edges. It is a minimum-area diagram; that is, each region is composed of a single square of unit area. Note that many edges overlap, so the diagram is [infinitely intersecting](https://www.combinatorics.org/files/Surveys/ds5/ds5v3-2005/VennOtherEJC.html#infinite). As with many other diagrams in these pages, regions are coloured by weight. The diagrams on this page are from \[[CR05](https://www.combinatorics.org/files/Surveys/ds5/ds5v3-2005/VennRefs.html#CR05)\].
> ![](polyvenn6-diag.png)
>
> The six component curves of the diagram, overlaid on a grayed-out version of the entire diagram:
> ![](polyvenn6-curves.png)
>
> This is a 7-Venn diagram formed entirely from curves drawn from axis-aligned edges. Like the above it is minimum-area and infinitely intersecting.
>
> ![](polyvenn7-diag.png)
>
> The seven component curves:
>
> ![](polyvenn7-curves.png)

## Other misc references

### Rust
https://github.com/itt-ustutt/num-dual ([r/rust](https://www.reddit.com/r/rust/comments/ybi9yx/automatic_differentiation_and_thermodynamics_with/))

https://crates.io/crates/hyperdual/
https://github.com/elrnv/autodiff
https://github.com/djmaxus/autodj
https://github.com/raskr/rust-autograd includes reverse-mode

~https://docs.rs/dual_num/latest/dual_num/~ (archived)
https://crates.io/crates/fwd_ad 3ya
https://gist.github.com/emilk/c027311e5d0e8b69953c83a3ec283b74

https://docs.rs/roots/latest/roots/ real roots only

### JS
[quartic.js](https://www.npmjs.com/package/quartic) (last release 2008)
Core code is from a [web solver](http://www.akiti.ca/Quad4Deg.html) written by [David Binner](http://www.akiti.ca/ContactPage.html)
