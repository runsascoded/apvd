package cubic

case class Dbl(value: Double) {
  override def toString = value.toString
}

object Dbl {
  type T = Tolerance
  type D = Dbl

  implicit def arithmeticDbl[T](implicit di: Doubleish[T]): Arithmetic[Dbl, T] =
    new Arithmetic[Dbl, T] {
      override def +(l: D, r: T) = l.value + di(r)
      override def -(l: D, r: T) = l.value - di(r)
      override def *(l: D, r: T) = l.value * di(r)
      override def /(l: D, r: T) = l.value / di(r)
    }

  implicit val dbl: Doubleish[Dbl] =
    new Doubleish[Dbl] {
      override def apply(t: Dbl): Double = t.value
    }

  implicit val numeric: Numeric[Dbl] =
    new Numeric[Dbl] {

      override def apply(d: Double) = Dbl(d)

      override def cos(t: D): D = math.cos(t.value)
      override def acos(t: D)(implicit ε: T): D =
        if (t.value > 1)
          if (t.value <= 1 + ε)
            0.0
          else
            throw new IllegalArgumentException(
              s"Can' take arccos of ${t.value}"
            )
        else if (t.value < -1)
          if (t.value >= -1 - ε)
            math.Pi
          else
            throw new IllegalArgumentException(
              s"Can' take arccos of ${t.value}"
            )
        else
          math.acos(t.value)

      override def cbrt(t: D): D = math.cbrt(t.value)
      override def sqrt(t: D)(implicit ε: T): D =
        if (t.value < 0)
          if (t.value > -ε)
            0.0
          else
            throw new IllegalArgumentException(
              s"Can't take sqrt of ${t.value}"
            )
        else
          math.sqrt(t.value)

      override def ^(t: D, p: Double): D = math.pow(t.value, p)

      override def unary_-(t: D): D = -t.value
    }

  implicit def fromDouble(d: Double): D = new Dbl(d)
  implicit def fromInt(i: Int): D = new Dbl(i)
}
