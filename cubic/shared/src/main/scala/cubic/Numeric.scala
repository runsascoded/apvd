package cubic

trait Numeric[D] extends Any {

  def apply(d: Double): D

  def ^(t: D, p: Double): D

  def unary_-(t: D): D

  def sqrt(t: D)(implicit ε: Tolerance): D
  def cbrt(t: D): D

  def cos(t: D): D
  def acos(t: D)(implicit ε: Tolerance): D

  type T = Tolerance
}

object Numeric {

  def apply[T](implicit n: Numeric[T]): Numeric[T] = n

  implicit class Ops[D](d: D)(implicit n: Numeric[D]) {
    type T = Tolerance

    def ^(p: Double): D = n.^(d, p)

    def unary_- : D = n.unary_-(d)

    def sqrt(implicit ε: T): D = n.sqrt(d)
    def cbrt: D = n.cbrt(d)

    def cos: D = n.cos(d)
    def acos(implicit ε: T): D = n.acos(d)

  }

  implicit class IntOps(val i: Int) extends AnyVal {
    import Arithmetic._
    def *[T: Arithmetic.I](t: T)(implicit n: Numeric[T]): T = n(i) * t
  }
}
