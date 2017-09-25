package apvd.lib

import apvd.lib.Ellipse.toTheta
import org.hammerlab.test.Suite

class EllipseTest
  extends Suite {

  val ellipses =
    List(
      Ellipse(
        cx = -0.82,
        cy = 0.38,
        rx = 1,
        ry = 2,
        theta = 0,
        color = "red",
        name = "A"
      ),
//      Ellipse(
//        cx = -0.7,
//        cy = 0.12,
//        rx = 1.3,
//        ry = 0.4,
//        theta = toTheta(114),
//        color = "blue",
//        name = "B"
//      ),
      Ellipse(
        cx = 0.5,
        cy = 1.52,
        rx = .94,
        ry = .48,
        theta = toTheta(18),
        color = "darkgoldenrod",
        name = "C"
      )/*,
      Ellipse(
        cx = 0,
        cy = 0,
        rx = .6,
        ry = .48,
        theta = toTheta(-44),
        color = "green",
        name = "D"
      )*/
    )

  test("project") {
    val projected = ellipses(1).project(ellipses(0)).toCoords
    projected should be(
      Coords(
        1.537448761974588,
        1.2785978405898164,
        4.0580019028332694,
        1.0985667020179688,
        0.12560657615738385,
        "darkgoldenrod",
        "C"
      )
    )

/*    projected should be(
      Coeffs(
        0.2927750496371421,
        -0.7678826535948867,
        3.284899801451431,
        -0.3352330184929696,
        -2.7311806709093815,
        0.7960588434145335,
        "darkgoldenrod",
        "C"
      )
    )*/
  }

}
