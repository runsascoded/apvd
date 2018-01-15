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

//  implicit def fromSpire[N](n: spire.math.Numeric[N]): Arithmetic[N, N] =
//    new Arithmetic[N, N] {
//      override def +(l: N, r: N) = n.plus(l, r)
//      override def -(l: N, r: N) = n.minus(l, r)
//      override def *(l: N, r: N) = n.times(l, r)
//      override def /(l: N, r: N) = n.divl, r)
//    }

  //  implicit val arithmeticDouble: Arithmetic[Double] = {
//
//  }
}
