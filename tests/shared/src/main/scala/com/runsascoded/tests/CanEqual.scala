package com.runsascoded.tests

import cats.Eq

trait CanEqual[T, U] {
  def eqv(t: T, u: U): Boolean
}

trait LowPri {

  def instance[T, U](implicit fn: (T, U) ⇒ Boolean): CanEqual[T, U] =
    new CanEqual[T, U] {
      override def eqv(t: T, u: U) = fn(t, u)
    }

  implicit def seqs[T, U](implicit
                          ce: CanEqual[T, U]): CanEqual[Seq[T], Seq[U]] = {
    val iters = iterators[T, U]
    instance[Seq[T], Seq[U]](
      (s1, s2) ⇒
        iters.eqv(
          s1.iterator,
          s2.iterator
        )
    )
  }

  def iterators[T, U](implicit ce: CanEqual[T, U]): CanEqual[Iterator[T], Iterator[U]] =
    new CanEqual[Iterator[T], Iterator[U]] {
      override def eqv(t: Iterator[T], u: Iterator[U]) =
        (t.hasNext, u.hasNext) match {
          case (true, true) ⇒ ce.eqv(t.next, u.next) && eqv(t, u)
          case (false, false) ⇒ true
          case _ ⇒ false
        }
    }
}

object CanEqual extends LowPri {

  implicit def fromEq[T](implicit e: Eq[T]): CanEqual[T, T] = instance(e.eqv)

  def fromExisting[T, U](implicit ce: CanEqual[T, T], conv: U ⇒ T): CanEqual[T, U] =
    instance((t, u) ⇒ ce.eqv(t, u))

//  import cats.instances.double.catsKernelStdGroupForDouble
//  import cats.instances.int.catsKernelStdGroupForInt

}
