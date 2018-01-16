package cubic

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

  implicit val double: Arithmetic.I[Double] =
    new Arithmetic[Double, Double] {
      override def +(l: Double, r: Double): Double = l + r
      override def -(l: Double, r: Double): Double = l - r
      override def *(l: Double, r: Double): Double = l * r
      override def /(l: Double, r: Double): Double = l / r
    }

  implicit val doubleInt: Arithmetic[Double, Int] =
    new Arithmetic[Double, Int] {
      override def +(l: Double, r: Int): Double = l + r
      override def -(l: Double, r: Int): Double = l - r
      override def *(l: Double, r: Int): Double = l * r
      override def /(l: Double, r: Int): Double = l / r
    }
}
