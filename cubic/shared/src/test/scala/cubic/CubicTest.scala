package cubic

import com.runsascoded.tests.Suite

class CubicTest
  extends Suite {

  implicit val ε = cubic.Tolerance(1e-6)
  import Dbl.numeric._

  def check(r1: Dbl,
            r2: Dbl,
            r3: Dbl,
            scales: Int*) = {
    val b = -r1 - r2 - r3
    val c = r1*r2 + r1*r3 + r2*r3
    val d = -r1 * r2 * r3
    1 :: scales.toList foreach {
      a ⇒
        ===(
          Cubic[Dbl](a, b * a, c * a, d * a),
          Seq(r1, r2, r3).sortBy(_.value)
        )
    }
  }

  def checkAll(r1: Dbl,
               r2: Dbl,
               r3: Dbl,
               scales: Int*) = {
    check( r1,  r2,  r3, scales: _*)
    check( r1,  r2, -r3, scales: _*)
    check( r1, -r2,  r3, scales: _*)
    check( r1, -r2, -r3, scales: _*)
    check(-r1,  r2,  r3, scales: _*)
    check(-r1,  r2, -r3, scales: _*)
    check(-r1, -r2,  r3, scales: _*)
    check(-r1, -r2, -r3, scales: _*)
  }

  test("distinct roots") {
    checkAll(
      1, 2, 3,
      2, 3
    )
  }

  test("double root") {

    def checkSigns(dbl: Double, other: Double) = {
      check( dbl,  dbl,  other, 2, 3)
      check(-dbl, -dbl,  other, 2, 3)
      check( dbl,  dbl, -other, 2, 3)
      check(-dbl, -dbl, -other, 2, 3)
    }

    checkSigns(1, 3)
    checkSigns(1, 2)
  }

}
