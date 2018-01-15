package cubic

import Math._
import Arithmetic._

object Cubic {
  def apply[D : Math : Arithmetic.I : Doubleish](a: D,
                                                 b: D,
                                                 c: D,
                                                 d: D)(
      implicit
      ε: Tolerance,
      dia: Arithmetic[D, Int],
      dda: Arithmetic[D, Double]
  ): Seq[Root[D]] = {
    val b3a = b / (3 * a)
    val b3a2 = b3a * b3a
    val ca = c / a

    DepressedCubic[D](
      p = ca - 3*b3a2,
      q = 2 * b3a2 * b3a - b3a*ca + d/a
    )
    .map {
      _ - b3a
    }
  }
}




