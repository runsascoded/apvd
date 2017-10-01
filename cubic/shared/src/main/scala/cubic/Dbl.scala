package cubic

trait Numeric[D <: Numeric[D]] extends Any {

  implicit def fromDouble(d: Double): D

  def value: Double

  def +(o: D): D
  def -(o: D): D
  def *(o: D): D
  def /(o: D): D

  def +(o: Double): D = value + o
  def -(o: Double): D = value - o
  def *(o: Double): D = value * o
  def /(o: Double): D = value / o

  def ^(p: Double): D

  def unary_- : D = -value

  def sqrt(implicit ε: Tolerance): D
  def cbrt: D

  def cos: D
  def acos(implicit ε: Tolerance): D

  type T = Tolerance

  def >=(o:    D)(implicit ε: T): Boolean = value + ε >= o.value
  def > (o:    D)(implicit ε: T): Boolean = value + ε >  o.value
  def <=(o:    D)(implicit ε: T): Boolean = value - ε <= o.value
  def < (o:    D)(implicit ε: T): Boolean = value - ε <  o.value
  def ==(o:    D)(implicit ε: T): Boolean = value <= o && value >= o

  def >=(o: Double)(implicit ε: T): Boolean = value + ε >= o
  def > (o: Double)(implicit ε: T): Boolean = value + ε >  o
  def <=(o: Double)(implicit ε: T): Boolean = value + ε <= o
  def < (o: Double)(implicit ε: T): Boolean = value + ε <  o
  def ==(o: Double)(implicit ε: T): Boolean = value - ε <= o && value + ε >= o

  def >=(o: Long)(implicit ε: T): Boolean = value + ε >= o
  def > (o: Long)(implicit ε: T): Boolean = value + ε >  o
  def <=(o: Long)(implicit ε: T): Boolean = value + ε <= o
  def < (o: Long)(implicit ε: T): Boolean = value + ε <  o
  def ==(o: Long)(implicit ε: T): Boolean = value - ε <= o && value + ε >= o

  def >=(o:  Int)(implicit ε: T): Boolean = value + ε >= o
  def > (o:  Int)(implicit ε: T): Boolean = value + ε >  o
  def <=(o:  Int)(implicit ε: T): Boolean = value + ε <= o
  def < (o:  Int)(implicit ε: T): Boolean = value + ε <  o
  def ==(o:  Int)(implicit ε: T): Boolean = value - ε <= o && value + ε >= o
}

trait NumericCC[D <: Numeric[D]] {
  implicit def fromDouble(d: Double): D
  implicit def fromInt(i: Int): D
}

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

//  implicit def wrap(d: Double): Dbl = new Dbl(d)
//  implicit def unwrap(d: Dbl): Double = d.value

  implicit object numeric extends NumericCC[Dbl] {
    override implicit def fromInt(i: Int): Dbl = new Dbl(i)
    override implicit def fromDouble(d: Double): Dbl = new Dbl(d)
  }
  //implicit def seqdbl

//  implicit class CmpOps(val d: Dbl) extends AnyVal {
//
//  }
}
