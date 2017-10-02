package cubic

import Numeric._
import Arithmetic._

object Cubic {
  def apply[D: Numeric: Arithmetic.I](a: D,
                                      b: D,
                                      c: D,
                                      d: D)(
      implicit
      ε: Tolerance,
      dia: Arithmetic[D, Int],
      dda: Arithmetic[D, Double]
  ): Seq[Root[D]] = {
    val a3 = 3 * a * a
    val ac3 = 3 * a * c
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


trait Arithmetic[L, R] {
  def +(l: L, r: R): L
  def -(l: L, r: R): L
  def *(l: L, r: R): L
  def /(l: L, r: R): L
}

object Arithmetic {

  type I[D] = Arithmetic[D, D]

  implicit class ArithmeticOps[L](val l: L) extends AnyVal {
    def +[R](r: R)(implicit a: Arithmetic[L, R]): L = a.+(l, r)
    def -[R](r: R)(implicit a: Arithmetic[L, R]): L = a.-(l, r)
    def *[R](r: R)(implicit a: Arithmetic[L, R]): L = a.*(l, r)
    def /[R](r: R)(implicit a: Arithmetic[L, R]): L = a./(l, r)
  }
}
