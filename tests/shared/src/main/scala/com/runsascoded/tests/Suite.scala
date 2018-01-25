package com.runsascoded.tests

import apvd.math.Tolerance
import cats.Eq
import cats.instances.{ LongInstances, StringInstances }
import cats.kernel.instances.ListInstances2
import com.runsascoded.tests.CanEqual.fromExisting
import org.scalatest.{ FunSuite, Matchers }

abstract class Suite
  extends FunSuite
    with Matchers
    with MkEqDerivation
    with StringInstances
    with ListInstances2
    with LongInstances {

  implicit var ε = Tolerance(1e-6)

  def tolerance(d: Double): Unit = {
    ε = d
  }

  implicit val int2double : CanEqual[Double, Int] = fromExisting[Double, Int]
  implicit val int2long   : CanEqual[  Long, Int] = fromExisting[  Long, Int]

  implicit def doubleEq(implicit tolerance: Tolerance): Eq[Double] =
    new Eq[Double] {
      override def eqv(x: Double, y: Double) =
        x + tolerance >= y &&
          y + tolerance >= x
    }

  def ===[T, U](t1: T, t2: U)(implicit canEqual: CanEqual[T, U]): Unit = {
    if (!canEqual.eqv(t1, t2))
      fail(s"$t1 didn't match $t2")
  }

}
