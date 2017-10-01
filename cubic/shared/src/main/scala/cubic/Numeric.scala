package cubic

import shapeless._

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

  def >= (o:      D)(implicit ε: T): Boolean = value + ε >= o.value
  def >  (o:      D)(implicit ε: T): Boolean = value + ε >  o.value
  def <= (o:      D)(implicit ε: T): Boolean = value - ε <= o.value
  def <  (o:      D)(implicit ε: T): Boolean = value - ε <  o.value
  def ===(o:      D)(implicit ε: T): Boolean = value <= o && value >= o

  def >= (o: Double)(implicit ε: T): Boolean = value + ε >= o
  def >  (o: Double)(implicit ε: T): Boolean = value + ε >  o
  def <= (o: Double)(implicit ε: T): Boolean = value + ε <= o
  def <  (o: Double)(implicit ε: T): Boolean = value + ε <  o
  def ===(o: Double)(implicit ε: T): Boolean = value - ε <= o && value + ε >= o

  def >= (o:   Long)(implicit ε: T): Boolean = value + ε >= o
  def >  (o:   Long)(implicit ε: T): Boolean = value + ε >  o
  def <= (o:   Long)(implicit ε: T): Boolean = value + ε <= o
  def <  (o:   Long)(implicit ε: T): Boolean = value + ε <  o
  def ===(o:   Long)(implicit ε: T): Boolean = value - ε <= o && value + ε >= o

  def >= (o:    Int)(implicit ε: T): Boolean = value + ε >= o
  def >  (o:    Int)(implicit ε: T): Boolean = value + ε >  o
  def <= (o:    Int)(implicit ε: T): Boolean = value + ε <= o
  def <  (o:    Int)(implicit ε: T): Boolean = value + ε <  o
  def ===(o:    Int)(implicit ε: T): Boolean = value - ε <= o && value + ε >= o
}

//object Numeric {
//  implicit def generic[T, L <: HList](implicit gen: Generic.Aux[T, L])
//}

trait NumericCC[D <: Numeric[D]] {
  implicit def fromDouble(d: Double): D
  implicit def fromInt(i: Int): D
}
