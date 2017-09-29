package apvd.lib

import cats.Eq
import shapeless.{ ::, Generic, HList, HNil }

trait Cmp[T] {
  type Out
  def apply(t1: T, t2: T): Out
}

object Cmp {

  type Aux[T, O] = Cmp[T] { type Out = O }

  implicit val hnil: Cmp.Aux[HNil, HNil] =
    new Cmp[HNil] {
      type Out = HNil
      override def apply(t1: HNil, t2: HNil): HNil = HNil
    }

  implicit def hcons[H, T <: HList, TO <: HList](implicit cmpH: Cmp.Aux[H, Option[(H, H)]], cmpT: Cmp.Aux[T, TO]): Cmp.Aux[H :: T, Option[(H, H)] :: TO] =
    new Cmp[H :: T] {
      type Out = Option[(H, H)] :: TO
      override def apply(t1: H :: T, t2: H :: T): Out =
        cmpH(t1.head, t2.head) :: cmpT(t1.tail, t2.tail)
    }

  implicit def generic[T, L <: HList, LO <: HList](implicit gen: Generic.Aux[T, L], cmp: Cmp.Aux[L, LO]): Cmp.Aux[T, LO] =
    new Cmp[T] {
      override type Out = LO
      override def apply(t1: T, t2: T): Out = cmp(gen.to(t1), gen.to(t2))
    }

  implicit def element[T](implicit eqv: Eq[T]): Cmp.Aux[T, Option[(T, T)]] =
    new Cmp[T] {
      override type Out = Option[(T, T)]
      override def apply(t1: T, t2: T): Option[(T, T)] =
        if (eqv.eqv(t1, t2))
          None
        else
          Some((t1, t2))
    }
}
