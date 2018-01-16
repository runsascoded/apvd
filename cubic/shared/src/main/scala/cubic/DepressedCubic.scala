package cubic

import scala.math.Pi
import Math._
import Arithmetic._
import FuzzyCmp._

object DepressedCubic {
  def apply[D : Math : Arithmetic.I : Doubleish](p: D, q: D)(
      implicit
      ε: Tolerance,
      dia: Arithmetic[D, Int],
      dda: Arithmetic[D, Double]
  ): Seq[Root[D]] = {

    import Root._

//    println(s"p: $p, q: $q")

    if (p === 0 && q === 0)
      Seq(
        Triple(
          (p + q) / 2
        )
      )
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
