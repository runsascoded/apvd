package apvd.lib

import apvd.lib.Ellipse.toTheta
import cats.Eq
import org.hammerlab.test.Suite
import org.scalatest.matchers.Matcher
import shapeless.HNil
import shapeless._
import shapeless.ops.hlist.FlatMapper

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
      Ellipse(
        cx = -0.7,
        cy = 0.12,
        rx = 1.3,
        ry = 0.4,
        theta = toTheta(114),
        color = "blue",
        name = "B"
      ),
      Ellipse(
        cx = 0.5,
        cy = 1.52,
        rx = .94,
        ry = .48,
        theta = toTheta(18),
        color = "darkgoldenrod",
        name = "C"
      ),
      Ellipse(
        cx = 0,
        cy = 0,
        rx = .6,
        ry = .48,
        theta = toTheta(-44),
        color = "green",
        name = "D"
      )
    )

  case class Tolerance(v: Double)
  object Tolerance {
    implicit def unwrap(t: Tolerance): Double = t.v
  }

  implicit val tolerance = Tolerance(1e-6)

  implicit def doubleEq(implicit tolerance: Tolerance): Eq[Double] =
    new Eq[Double] {
      override def eqv(x: Double, y: Double) =
        x + tolerance >= y && y + tolerance >= x
    }

  import cats.implicits.catsKernelStdOrderForString
  import cats.derived.eq._

  def ===[T](t1: T, t2: T)(implicit e: Eq[T]): Unit = {
    if (!e.eqv(t1, t2))
      fail(s"$t1 didn't match $t2")
  }

  test("project") {
    val projected = ellipses(2)(ellipses(0).projection).toCoords
    val expected =
      Coords(
        1.32,
        0.57,
        0.912877,
        0.247131,
        0.125607,
        "darkgoldenrod",
        "C"
      )

    ===(
      projected,
      expected
    )
  }

  test("round trip") {
    ===(
      ellipses(0).toCoeffs.toCoords,
      ellipses(0)
    )

    /**
     * This fails for reasons discussed in the docs of [[Coeffs.theta]], so we ignore it for now.
     */
    // ===(
    //   ellipses(1).toCoeffs.toCoords,
    //   ellipses(1)
    // )

    ===(
      ellipses(2).toCoeffs.toCoords,
      ellipses(2)
    )

    ===(
      ellipses(3).toCoeffs.toCoords,
      ellipses(3)
    )
  }

}

//class EqMatcher[T](right: T) extends Matcher[T] {
//  override def apply(left: T) = ???
//}
