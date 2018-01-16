package cubic

import cubic.Arithmetic._
import cubic.FuzzyCmp._
import cubic.Math._

import scala.math.Pi

object DepressedCubic {
  def apply[D : Math : Arithmetic.I : Doubleish](p: D, q: D)(
      implicit
      ε: Tolerance,
      ad: Arithmetic[D, Double]
  ): Seq[Root[D]] = {

    import Root._

    if (p === 0 && q === 0)
      /**
       * Only possible triple-rooted depressed-cubic: x³=0
       *
       * Return the average of [[p]] and [[q]] to preserve flow of any gradient information, and have an instance of
       * [[D]], instead of just returning literal [[0]].
       */
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

      if (q22 <= p33) {
        val cos = q2 / p33.sqrt
        val sqp3 = p3.sqrt
        val sqp32: D = 2 * sqp3
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
