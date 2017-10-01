package com.runsascoded.tests

import cats.Eq
import cats.derived.MkEqDerivation
import cats.instances.{StringInstances, LongInstances}
import cats.kernel.instances.ListInstances2
import org.scalatest.{ FunSuite, Matchers }

abstract class Suite
  extends FunSuite
    with Matchers
    with MkEqDerivation
    with StringInstances
    with ListInstances2
    with LongInstances {

//  implicit def seqEq[T](implicit e: Eq[T]): Eq[Seq[T]] =
//    new Eq[Seq[T]] {
//      override def eqv(x: Seq[T], y: Seq[T]) = catsKernelStdEqForList[T].eqv(x.toList, y.toList)
//    }

  case class Tolerance(v: Double)
  object Tolerance {
    implicit def unwrap(t: Tolerance): Double = t.v
  }

  implicit val tolerance = Tolerance(1e-6)

  implicit def doubleEq(implicit tolerance: Tolerance): Eq[Double] =
    new Eq[Double] {
      override def eqv(x: Double, y: Double) =
        x + tolerance >= y &&
          y + tolerance >= x
    }

  trait CanEqual[T, U] {
    def eqv(t: T, u: U): Boolean
  }

  trait LowPri {

    def instance[T, U](implicit fn: (T, U) ⇒ Boolean): CanEqual[T, U] =
      new CanEqual[T, U] {
        override def eqv(t: T, u: U) = fn(t, u)
      }

    implicit def seqs[T, U/*, S1 <: Seq[T], S2 <: Seq[U]*/](implicit
                                                        ce: CanEqual[T, U]/*,
                                                        s1ev: S1 <:< Seq[T],
                                                        s2ev: S2 <:< Seq[U]*/): CanEqual[Seq[T], Seq[U]] = {
      val iters = iterators[T, U]
      instance[Seq[T], Seq[U]](
        (s1, s2) ⇒
          iters.eqv(
//            s1ev(s1).iterator,
//            s2ev(s2).iterator
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

    implicit val int2double: CanEqual[Double, Int] = fromExisting[Double, Int]
    implicit val int2long: CanEqual[Long, Int] = fromExisting[Long, Int]
  }

  def ===[T, U](t1: T, t2: U)(implicit canEqual: CanEqual[T, U]): Unit = {
    if (!canEqual.eqv(t1, t2))
      fail(s"$t1 didn't match $t2")
  }

}
