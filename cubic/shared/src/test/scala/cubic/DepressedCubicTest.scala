package cubic

import com.runsascoded.tests.Suite

import scala.math.{ cbrt, sqrt }

class DepressedCubicTest
  extends Suite {

  implicit val ε = cubic.Tolerance(1e-6)
  import Dbl.numeric._

  def chk(p: Dbl, q: Dbl)(expected: Dbl*): Unit = {
    ===(DepressedCubic(p, q), expected)
  }

  test("p == 0") {
    chk(0,  0)( 0)
    chk(0,  1)(-1)
    chk(0, -1)( 1)
    chk(0, -2)(cbrt(2))
    chk(0,  2)(-cbrt(2))
    chk(0, -8)( 2)
    chk(0,  8)(-2)
  }

  test("q == 0") {
    chk( 1, 0)( 0)
    chk( 2, 0)( 0)
    chk(-1, 0)(-1, 0, 1)
    chk(-2, 0)(-sqrt(2), 0, sqrt(2))
  }

  test("3 roots") {

    def check(a: Double, b: Double, c: Double) = {
      val p = a*b + a*c + b*c
      val q = -a * b * c

      chk(
        p, q
      )(
        a, b, c
      )

      chk(
        p, -q
      )(
        -c, -b, -a
      )
    }

    check(-2, -1, 3)
    check(-6,  3, 3)
    check(-3, -1, 4)
  }

  test("1 root") {
    /**
     * Test root-finding of a depressed cubic with roots { a+ci, a-ci, and -2a } (i.e. where p == c²-3a² and
     * q == 2a(c² + a²).
     */
    def check(a: Double, c: Double) = {
      chk(
        c*c - 3*a*a,
        2*a*(c*c + a*a)
      )(
        -2 * a
      )
    }

    def checkSigns(a: Double, c: Double) = {
      check( a,  c)
      check(-a,  c)
      check( a, -c)
      check(-a, -c)
    }

    for {
      a ← 1 to 3
      c ← 1 to 3
    } {
      checkSigns(a, c)
    }
  }
}
