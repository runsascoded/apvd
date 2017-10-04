package cubic

/**
 * This file is named ARoot.scala instead of Root.scala because it needs to come before "Cubic.scala" lexicographically,
 * due to [[https://github.com/scala/bug/issues/10222#issuecomment-333397589 scala/bug#10222]].
 */

sealed trait Root[D] {
  def value: D
  def degree: Int
}

object Root {

  case class Single[D](value: D)
    extends Root[D] {
    override def degree = 1
    override def toString = value.toString
  }

  case class Double[D](value: D)
    extends Root[D] {
    override def degree = 2
    override def toString = s"$value·2"
  }

  case class Triple[D](value: D)
    extends Root[D] {
    override def degree = 3
    override def toString = s"$value·3"
  }

  def map[D](f: D ⇒ D): Root[D] ⇒ Root[D] = {
    case Single(v) ⇒ Single(f(v))
    case Double(v) ⇒ Double(f(v))
    case Triple(v) ⇒ Triple(f(v))
  }

  implicit def arithmeticRootDbl[D](implicit a: Arithmetic[D, D]): Arithmetic[Root[D], D] =
    new Arithmetic[Root[D], D] {
      import Arithmetic._
      override def +(l: Root[D], r: D) = map[D](_ + r)(l)
      override def -(l: Root[D], r: D) = map[D](_ - r)(l)
      override def *(l: Root[D], r: D) = map[D](_ * r)(l)
      override def /(l: Root[D], r: D) = map[D](_ / r)(l)
    }
}