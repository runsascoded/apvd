package cubic

object Cubic {
  def apply[D <: Numeric[D]](a: D,
                             b: D,
                             c: D,
                             d: D)(
      implicit
      cc: NumericCC[D],
      ε: Tolerance
  ): Seq[D] = {
    import cc.fromInt
    val a3 = 3 * a * a
    val ac3 = 3 * a * c
    val b3a = b / (3 * a)
    val b3a2 = b3a * b3a
    val ca = c / a
    DepressedCubic[D](
      p = ca - 3*b3a2,
      q = 2 * b3a2 * b3a - b3a*ca + d/a
    )
    .map(_ - b3a)
  }
}
