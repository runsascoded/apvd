package cubic

import scala.math.Pi

object DepressedCubic {
  def apply[D <: Numeric[D]](p: D, q: D)(
      implicit
      cc: NumericCC[D],
      ε: Tolerance
  ): Seq[D] = {

    import cc.fromInt

//    println(s"p: $p, q: $q")
    if (q == 0)
      if (p < 0)
        Seq[D](-(-p).sqrt, 0, (-p).sqrt)
      else
        Seq[D](0)
    else if (p == 0)
      Seq(-q.cbrt)
    else {
      val p3 = -p/3
      val p33 = p3 ^ 3
      val q2 = -q/2
      val q22 = q2 ^ 2

//      println(s"q22: $q22, p33: $p33")
      if (q22 <= p33) {
        val t0 = (q2 / p33.sqrt).acos / 3
        val t1 = t0 - pi23
        val t2 = t1 - pi23
        val sqp32 = 2 * p3.sqrt
        Seq(
          t2,
          t1,
          t0
        )
        .map(
          sqp32 * _.cos
        )
      } else {
        val sqr = (q22 - p33).sqrt
        Seq(
          (q2 + sqr).cbrt + (q2 - sqr).cbrt
        )
      }
    }
  }

  val pi23 = 2 * Pi / 3
}
