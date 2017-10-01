package cubic

import shapeless._

trait WrapperMap[T, V] {
  def map(t: T, fn: V ⇒ V): T
}

object WrapperMap {
  implicit def cnil[V]: WrapperMap[CNil, V] =
    new WrapperMap[CNil, V] {
      override def map(t: CNil, fn: V ⇒ V) = t
    }

  implicit def ccons[V, H, T <: Coproduct](implicit
                                           wm: WrapperMap[T, V],
                                           gen: Generic.Aux[H, V :: HNil]
                                          ): WrapperMap[H :+: T, V] =
    new WrapperMap[H :+: T, V] {
      override def map(t: :+:[H, T], fn: V ⇒ V) =
        t match {
          case Inl(h) ⇒ Inl(gen.from(fn(gen.to(h).head) :: HNil))
          case Inr(t) ⇒ Inr(wm.map(t, fn))
        }
    }

  implicit def gen[T, V, G <: Coproduct](implicit
                                         gen: Generic.Aux[T, G],
                                         wm: WrapperMap[G, V]): WrapperMap[T, V] =
    new WrapperMap[T, V] {
      override def map(t: T, fn: V ⇒ V) =
        gen.from(
          wm.map(
            gen.to(t),
            fn
          )
        )
    }
}

sealed trait R[D <: Numeric[D]]

object R {
  case class Si[D <: Numeric[D]](value: D) extends R[D]
  case class Db[D <: Numeric[D]](value: D) extends R[D]
  case class Tr[D <: Numeric[D]](value: D) extends R[D]
}

object Cubic {
  def apply[D <: Numeric[D]](a: D,
                             b: D,
                             c: D,
                             d: D)(
      implicit
      cc: NumericCC[D],
      ε: Tolerance
  ): Seq[Root[D]] = {
    import cc.fromInt
    val a3 = 3 * a * a
    val ac3 = 3 * a * c
    val b3a = b / (3 * a)
    val b3a2 = b3a * b3a
    val ca = c / a

//    import R._
//    Generic[R[D]]
/*
    implicitly[Generic.Aux[R[D], Si[D] :+: Db[D] :+: Tr[D] :+: CNil]]
    implicitly[Generic.Aux[R[D], Db[D] :+: Si[D] :+: Tr[D] :+: CNil]]
    implicitly[Generic.Aux[R[D], Si[D] :+: Tr[D] :+: Db[D] :+: CNil]]
    implicitly[Generic.Aux[R[D], Db[D] :+: Tr[D] :+: Si[D] :+: CNil]]
    implicitly[Generic.Aux[R[D], Tr[D] :+: Si[D] :+: Db[D] :+: CNil]]
    implicitly[Generic.Aux[R[D], Tr[D] :+: Db[D] :+: Si[D] :+: CNil]]
*/

    import Root._

    Generic[Root[D]]
//    implicitly[Generic.Aux[Root[D], Singl[D] :+: Doubl[D] :+: Tripl[D] :+: CNil]]
    implicitly[Generic.Aux[Root[D], Double[D] :+: Single[D] :+: Triple[D] :+: CNil]]
//    implicitly[Generic.Aux[Root[D], Doubl[D] :+: Tripl[D] :+: Singl[D] :+: CNil]]
//    implicitly[Generic.Aux[Root[D], Singl[D] :+: Tripl[D] :+: Doubl[D] :+: CNil]]
//    implicitly[Generic.Aux[Root[D], Tripl[D] :+: Singl[D] :+: Doubl[D] :+: CNil]]
//    implicitly[Generic.Aux[Root[D], Tripl[D] :+: Doubl[D] :+: Singl[D] :+: CNil]]

//    Generic[R1]

//    implicitly[Generic.Aux[Singl[D], D :: HNil]]
//    implicitly[Generic.Aux[Doubl[D], D :: HNil]]
//    implicitly[Generic.Aux[Tripl[D], D :: HNil]]


    //    val genAnimal = Generic[R[D]]

//    val gen = Generic[Root[D]]

    val wm = implicitly[WrapperMap[Root[D], D]]

    DepressedCubic[D](
      p = ca - 3*b3a2,
      q = 2 * b3a2 * b3a - b3a*ca + d/a
    )
    .map {
      r ⇒ wm.map(r, _ - b3a)
    }
  }
}
