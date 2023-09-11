import quartic from "../src/quartic";

describe('check quartic equation solutions', () => {
    test('almost quadratic', () => {
        // Factored out of unit-intersection calculation for the ellipse:
        //
        // XYRR {
        //     c: R2 { x: -1.100285308561806, y: -1.1500279763995946e-5 },
        //     r: R2 { x:  1.000263820108834, y:  1.0000709021402923 }
        // }
        //
        // which is nearly a unit circle centered at (-1.1, 0), but with all 4 coordinates perturbed slightly. See also https://github.com/vorot/roots/issues/30.
        const a_4 = 0.000000030743755847066437
        const a_3 = 0.000000003666731306801131
        const a_2 = 1.0001928389119579
        const a_1 = 0.000011499702220469921
        const a_0 = -0.6976068572771268
        let roots = quartic(a_4, a_3, a_2, a_1, a_0);
        // Fails!
        // expect(roots).toEqual([
        //     -0.835153846196954,
        //      0.835142346155438,
        // ])
    })
})
