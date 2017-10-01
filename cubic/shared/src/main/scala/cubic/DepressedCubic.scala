package cubic

import scala.math.Pi
import Numeric._

object DepressedCubic {
  def apply[D: Numeric](p: D, q: D)(
      implicit ε: Tolerance
  ): Seq[Root[D]] = {

    import Root._

//    println(s"p: $p, q: $q")
    if (q === 0)
      if (p < 0) {
        val r = (-p).sqrt
        Seq(
          Single(-r),
          Single[D](0),
          Single(r)
        )
      } else if (p === 0)
        Seq(Triple[D](0))
      else
        Seq(Single[D](0))
    else if (p === 0)
      Seq(Single(-q.cbrt))
    else {
      val p3 = -p/3
      val p33 = p3 ^ 3
      val q2 = -q/2
      val q22 = q2 ^ 2

//      println(s"q22: $q22, p33: $p33")
      if (q22 <= p33) {
        val cos = q2 / p33.sqrt
        val sqp3 = p3.sqrt
        val sqp32 = 2 * sqp3
        if (cos === 1)
          Seq(
            Double(-sqp3),
            Single(sqp32)
          )
        else if (cos === -1)
          Seq(
            Single(-sqp32),
            Double(sqp3)
          )
        else {
          val t0 = cos.acos / 3
          val t1 = t0 - pi23
          val t2 = t1 - pi23
          def root(t: D): D = sqp32 * t.cos
          Seq(
            Single(root(t2)),
            Single(root(t1)),
            Single(root(t0))
          )
        }
      } else {
        val sqr = (q22 - p33).sqrt
        Seq(
          Single(
            (q2 + sqr).cbrt +
            (q2 - sqr).cbrt
          )
        )
      }
    }
  }

  val pi23 = 2 * Pi / 3
}
