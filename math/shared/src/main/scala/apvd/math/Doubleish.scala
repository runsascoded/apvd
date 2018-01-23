package apvd.math

trait Doubleish[T] {
  def apply(t: T): Double
}

object Doubleish {
  implicit val id: Doubleish[Double] =
    new Doubleish[Double] {
      override def apply(t: Double): Double = t
    }

  implicit val int: Doubleish[Int] =
    new Doubleish[Int] {
      override def apply(t: Int): Double = t
    }

  implicit val long: Doubleish[Long] =
    new Doubleish[Long] {
      override def apply(t: Long): Double = t
    }
}
