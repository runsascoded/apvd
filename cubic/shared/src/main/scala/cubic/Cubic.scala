package cubic

import Arithmetic._

object Cubic {
  /**
   * Solve a cubic equation, ax³ + bx² + cx + d = 0, for a type [[D]] that conforms to various numeric type-classes
   *
   * @param a cubic term
   * @param b quadratic term
   * @param c linear term
   * @param d constant term
   * @param ε fuzzy-comparison tolerance, for calling [[Root.Double double]]- and [[Root.Triple triple]]-roots
   * @tparam D type of parameters and returned [[Root roots]]
   * @return [[Root Roots]] in increasing order
   */
  def apply[
      D: Math          // sqrt, ^, cos, acos
       : Arithmetic.I  // arithmetic between [[D]] instances
       : Doubleish     // lt/gt/eq comparisons to ints/doubles
  ](
      a: D,
      b: D,
      c: D,
      d: D
  )(
      implicit
       ε: Tolerance,             // fuzzy lt/gt/eq comparisons
      ad: Arithmetic[D, Double]  // division by 2, 3
  ):
      Seq[Root[D]] = {

    val b3a = b / ((3 * a: D))
    val b3a2 = b3a * b3a
    val ca = c / a

    DepressedCubic[D](
      p = ca - (3*b3a2: D),
      q = ((2 * b3a2):D) * b3a - b3a*ca + d/a
    )
    .map {
      _ - b3a
    }
  }
}




