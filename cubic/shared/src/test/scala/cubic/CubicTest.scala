package cubic

import com.runsascoded.tests.Suite
import cubic.Numeric._
import Arithmetic._
import cubic.Root.{ Double, Single, Triple }

class CubicTest
  extends Suite {

  implicit val ε = cubic.Tolerance(1e-10)
  import Dbl.fromInt

  val scales = Seq(1, 2, 3)

//  def check(triple: Dbl) = check(Tripl(triple))
  def check(dbl: Dbl, other: Dbl): Unit = check(Double(dbl), Single(other))

  def check(r1: Dbl, r2: Dbl, r3: Dbl): Unit = check(Single(r1), Single(r2), Single(r3))

  def check(roots: Root[Dbl]*): Unit = {
    val Seq(r1, r2, r3) = roots.flatMap(r ⇒ Array.fill(r.degree)(r.value))
    val b = -r1 - r2 - r3
    val c = r1*r2 + r1*r3 + r2*r3
    val d = -r1 * r2 * r3
    scales foreach {
      a ⇒
        ===(
          Cubic[Dbl](a, b * a, c * a, d * a),
          roots.sortBy(_.value.value)
        )
    }
  }

  test("distinct roots") {

    def checkAll(r1: Dbl,
                 r2: Dbl,
                 r3: Dbl) = {
      check( r1,  r2,  r3)
      check( r1,  r2, -r3)
      check( r1, -r2,  r3)
      check( r1, -r2, -r3)
      check(-r1,  r2,  r3)
      check(-r1,  r2, -r3)
      check(-r1, -r2,  r3)
      check(-r1, -r2, -r3)
    }

    checkAll(  1,  2,  3)
    checkAll(0.1,  1, 10)
  }

  test("double root") {

    def checkSigns(dbl: Dbl, other: Dbl) = {
      check(Double( dbl), Single( other))
      check(Double(-dbl), Single( other))
      check(Double( dbl), Single(-other))
      check(Double(-dbl), Single(-other))
    }

    checkSigns(1,  2)
    checkSigns(1,  3)
    checkSigns(1, 10)

    checkSigns( 2, 1)
    checkSigns( 3, 1)
    checkSigns(10, 1)
  }

  test("triple root") {
    check(Triple(  1))
    check(Triple( -1))
    check(Triple( 10))
    check(Triple(-10))
  }

  test("single root") {

  }

}
