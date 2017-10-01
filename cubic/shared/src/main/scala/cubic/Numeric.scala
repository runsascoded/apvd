package cubic

trait Numeric[D] extends Any {

  implicit def fromDouble(d: Double): D
  implicit def fromInt(i: Int): D

  def +(t: D, b: D): D
  def -(t: D, b: D): D
  def *(t: D, b: D): D
  def /(t: D, b: D): D

  def +(t: D, o: Double): D// = value + o
  def -(t: D, o: Double): D// = value - o
  def *(t: D, o: Double): D// = value * o
  def /(t: D, o: Double): D// = value / o

  def ^(t: D, p: Double): D

  def unary_-(t: D): D

  def sqrt(t: D)(implicit ε: Tolerance): D
  def cbrt(t: D): D

  def cos(t: D): D
  def acos(t: D)(implicit ε: Tolerance): D

  type T = Tolerance

  def >= (t: D, o:      D)(implicit ε: T): Boolean// = value + ε >= o.value
  def >  (t: D, o:      D)(implicit ε: T): Boolean// = value + ε >  o.value
  def <= (t: D, o:      D)(implicit ε: T): Boolean// = value - ε <= o.value
  def <  (t: D, o:      D)(implicit ε: T): Boolean// = value - ε <  o.value
  def ===(t: D, o:      D)(implicit ε: T): Boolean// = value <= o && value >= o

  def >= (t: D, o: Double)(implicit ε: T): Boolean// = value + ε >= o
  def >  (t: D, o: Double)(implicit ε: T): Boolean// = value + ε >  o
  def <= (t: D, o: Double)(implicit ε: T): Boolean// = value + ε <= o
  def <  (t: D, o: Double)(implicit ε: T): Boolean// = value + ε <  o
  def ===(t: D, o: Double)(implicit ε: T): Boolean// = value - ε <= o && value + ε >= o

  def >= (t: D, o:   Long)(implicit ε: T): Boolean// = value + ε >= o
  def >  (t: D, o:   Long)(implicit ε: T): Boolean// = value + ε >  o
  def <= (t: D, o:   Long)(implicit ε: T): Boolean// = value + ε <= o
  def <  (t: D, o:   Long)(implicit ε: T): Boolean// = value + ε <  o
  def ===(t: D, o:   Long)(implicit ε: T): Boolean// = value - ε <= o && value + ε >= o

  def >= (t: D, o:    Int)(implicit ε: T): Boolean// = value + ε >= o
  def >  (t: D, o:    Int)(implicit ε: T): Boolean// = value + ε >  o
  def <= (t: D, o:    Int)(implicit ε: T): Boolean// = value + ε <= o
  def <  (t: D, o:    Int)(implicit ε: T): Boolean// = value + ε <  o
  def ===(t: D, o:    Int)(implicit ε: T): Boolean// = value - ε <= o && value + ε >= o
}

object Numeric {
//  implicit def generic[T, L <: HList](implicit gen: Generic.Aux[T, L])
  //implicit val

  implicit class Ops[D](d: D)(implicit n: Numeric[D]) {
    type T = Tolerance

    def +(o: D): D = n.+(d, o)
    def -(o: D): D = n.-(d, o)
    def *(o: D): D = n.*(d, o)
    def /(o: D): D = n./(d, o)

    def +(o: Double): D = n.+(d, o)
    def -(o: Double): D = n.-(d, o)
    def *(o: Double): D = n.*(d, o)
    def /(o: Double): D = n./(d, o)

    def ^(p: Double): D = n.^(d, p)

    def unary_- : D = n.unary_-(d)

    def sqrt(implicit ε: T): D = n.sqrt(d)
    def cbrt: D = n.cbrt(d)

    def cos: D = n.cos(d)
    def acos(implicit ε: T): D = n.acos(d)

    def >= (o:      D)(implicit ε: T): Boolean = n.>= (d, o)
    def >  (o:      D)(implicit ε: T): Boolean = n.>  (d, o)
    def <= (o:      D)(implicit ε: T): Boolean = n.<= (d, o)
    def <  (o:      D)(implicit ε: T): Boolean = n.<  (d, o)
    def ===(o:      D)(implicit ε: T): Boolean = n.===(d, o)

    def >= (o: Double)(implicit ε: T): Boolean = n.>= (d, o)
    def >  (o: Double)(implicit ε: T): Boolean = n.>  (d, o)
    def <= (o: Double)(implicit ε: T): Boolean = n.<= (d, o)
    def <  (o: Double)(implicit ε: T): Boolean = n.<  (d, o)
    def ===(o: Double)(implicit ε: T): Boolean = n.===(d, o)

    def >= (o:   Long)(implicit ε: T): Boolean = n.>= (d, o)
    def >  (o:   Long)(implicit ε: T): Boolean = n.>  (d, o)
    def <= (o:   Long)(implicit ε: T): Boolean = n.<= (d, o)
    def <  (o:   Long)(implicit ε: T): Boolean = n.<  (d, o)
    def ===(o:   Long)(implicit ε: T): Boolean = n.===(d, o)

    def >= (o:    Int)(implicit ε: T): Boolean = n.>= (d, o)
    def >  (o:    Int)(implicit ε: T): Boolean = n.>  (d, o)
    def <= (o:    Int)(implicit ε: T): Boolean = n.<= (d, o)
    def <  (o:    Int)(implicit ε: T): Boolean = n.<  (d, o)
    def ===(o:    Int)(implicit ε: T): Boolean = n.===(d, o)
  }

  implicit def makeInt[T](i: Int)(implicit n: Numeric[T]): T = n.fromInt(i)

  implicit class IntOps(val i: Int) extends AnyVal {
    def *[T](t: T)(implicit n: Numeric[T]): T = n.fromInt(i) * t
  }
}

trait NumericCC[D <: Numeric[D]] {
  implicit def fromDouble(d: Double): D
  implicit def fromInt(i: Int): D
}
