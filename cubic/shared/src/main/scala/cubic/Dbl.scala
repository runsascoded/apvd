package cubic

class Dbl(val value: Double)
  extends AnyVal
    with Numeric[Dbl] {

  type D = Dbl

  override def toString = value.toString

  override implicit def fromDouble(d: Double): Dbl = Dbl.numeric.fromDouble(d)

  def +(o: Dbl): Dbl = value + o.value
  def -(o: Dbl): Dbl = value - o.value
  def *(o: Dbl): Dbl = value * o.value
  def /(o: Dbl): Dbl = value / o.value

  override def ^(p: Double) = math.pow(value, p)

  def sqrt(implicit ε: Tolerance): Dbl =
    if (value < 0)
      if (value > -ε)
        0.0
      else
        throw new IllegalArgumentException(
          s"Can't take sqrt of $value"
        )
    else
      math.sqrt(value)

  def cbrt: D = math.cbrt(value)

  override def cos = math.cos(value)
  override def acos(implicit ε: Tolerance) =
    if (value > 1)
      if (value <= 1 + ε)
        0.0
      else
        throw new IllegalArgumentException(
          s"Can' take arccos of $value"
        )
    else if (value < -1)
      if (value >= -1 - ε)
        math.Pi
      else
        throw new IllegalArgumentException(
          s"Can' take arccos of $value"
        )
    else
      math.acos(value)
}

case class Tolerance(v: Double)
object Tolerance {
  implicit def unwrap(t: Tolerance): Double = t.v
}

object Dbl {
  implicit object numeric extends NumericCC[Dbl] {
    override implicit def fromInt(i: Int): Dbl = new Dbl(i)
    override implicit def fromDouble(d: Double): Dbl = new Dbl(d)
  }
}
