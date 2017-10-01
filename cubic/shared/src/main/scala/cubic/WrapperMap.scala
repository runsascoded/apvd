package cubic

import shapeless._

/**
 * Type-class for types [[T]] that wrap a single value of type [[V]], allowing for "mapping" over the contained values
 * while preserving the containing type.
 */
trait WrapperMap[T] {
  type V
  def map(t: T, fn: V ⇒ V): T
}

object WrapperMap {

  type Aux[T, V0] = WrapperMap[T] { type V = V0 }

  implicit def cnil[V0]: WrapperMap.Aux[CNil, V0] =
    new WrapperMap[CNil] {
      type V = V0
      override def map(t: CNil, fn: V ⇒ V) = t
    }

  implicit def ccons[H, V0, T <: Coproduct](implicit
                                           wm: WrapperMap.Aux[T, V0],
                                           gen: Generic.Aux[H, V0 :: HNil]
                                          ): WrapperMap.Aux[H :+: T, V0] =
    new WrapperMap[H :+: T] {
      type V = V0
      override def map(t: :+:[H, T], fn: V0 ⇒ V0) =
        t match {
          case Inl(h) ⇒ Inl(gen.from(fn(gen.to(h).head) :: HNil))
          case Inr(t) ⇒ Inr(wm.map(t, fn))
        }
    }

  implicit def gen[T, V0, G <: Coproduct](implicit
                                         gen: Generic.Aux[T, G],
                                         wm: WrapperMap.Aux[G, V0]): WrapperMap.Aux[T, V0] =
    new WrapperMap[T] {
      type V = V0
      override def map(t: T, fn: V0 ⇒ V0) =
        gen.from(
          wm.map(
            gen.to(t),
            fn
          )
        )
    }

  trait RootSyntax[R] {
    type V
    def map(fn: V ⇒ V): R
  }

  object RootSyntax {
    type Aux[R, V0] = RootSyntax[R] { type V = V0 }
    //implicit val root: Aux[Root, V]
  }

  implicit def wrap[T, V](t: T)(implicit wm: WrapperMap.Aux[T, V]): Ops[T, V] = new Ops(t)

  class Ops[T, V](t: T)(implicit wm: WrapperMap.Aux[T, V]) {
    def map(fn: V ⇒ V): T = wm.map(t, fn)
  }
}
