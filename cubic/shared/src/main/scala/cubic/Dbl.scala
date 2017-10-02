package cubic

case class Dbl(value: Double) {
  override def toString = value.toString
}

object Dbl {
  type T = Tolerance
  type D = Dbl

  implicit val arithmeticDblDbl: Arithmetic[Dbl, Dbl] =
    new Arithmetic[Dbl, Dbl] {
      override def +(l: D, r: D) = l.value + r.value
      override def -(l: D, r: D) = l.value - r.value
      override def *(l: D, r: D) = l.value * r.value
      override def /(l: D, r: D) = l.value / r.value
    }

  implicit val arithmeticDblInt: Arithmetic[Dbl, Int] =
    new Arithmetic[Dbl, Int] {
      override def +(l: D, r: Int) = l.value + r
      override def -(l: D, r: Int) = l.value - r
      override def *(l: D, r: Int) = l.value * r
      override def /(l: D, r: Int) = l.value / r
    }

  implicit val arithmeticDblDouble: Arithmetic[Dbl, Double] =
    new Arithmetic[Dbl, Double] {
      override def +(l: D, r: Double) = l.value + r
      override def -(l: D, r: Double) = l.value - r
      override def *(l: D, r: Double) = l.value * r
      override def /(l: D, r: Double) = l.value / r
    }

  implicit val numeric: Numeric[Dbl] =
    new Numeric[Dbl] {

      override def apply(d: Double) = Dbl(d)

      def >= (t: D, o:      D)(implicit ε: T): Boolean = t.value + ε >= o.value
      def >  (t: D, o:      D)(implicit ε: T): Boolean = t.value + ε >  o.value
      def <= (t: D, o:      D)(implicit ε: T): Boolean = t.value - ε <= o.value
      def <  (t: D, o:      D)(implicit ε: T): Boolean = t.value - ε <  o.value
      def ===(t: D, o:      D)(implicit ε: T): Boolean = t.value <= o.value && t.value >= o.value

      def >= (t: D, o: Double)(implicit ε: T): Boolean = t.value + ε >= o
      def >  (t: D, o: Double)(implicit ε: T): Boolean = t.value + ε >  o
      def <= (t: D, o: Double)(implicit ε: T): Boolean = t.value + ε <= o
      def <  (t: D, o: Double)(implicit ε: T): Boolean = t.value + ε <  o
      def ===(t: D, o: Double)(implicit ε: T): Boolean = t.value - ε <= o && t.value + ε >= o

      def >= (t: D, o:   Long)(implicit ε: T): Boolean = t.value + ε >= o
      def >  (t: D, o:   Long)(implicit ε: T): Boolean = t.value + ε >  o
      def <= (t: D, o:   Long)(implicit ε: T): Boolean = t.value + ε <= o
      def <  (t: D, o:   Long)(implicit ε: T): Boolean = t.value + ε <  o
      def ===(t: D, o:   Long)(implicit ε: T): Boolean = t.value - ε <= o && t.value + ε >= o

      def >= (t: D, o:    Int)(implicit ε: T): Boolean = t.value + ε >= o
      def >  (t: D, o:    Int)(implicit ε: T): Boolean = t.value + ε >  o
      def <= (t: D, o:    Int)(implicit ε: T): Boolean = t.value + ε <= o
      def <  (t: D, o:    Int)(implicit ε: T): Boolean = t.value + ε <  o
      def ===(t: D, o:    Int)(implicit ε: T): Boolean = t.value - ε <= o && t.value + ε >= o

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
