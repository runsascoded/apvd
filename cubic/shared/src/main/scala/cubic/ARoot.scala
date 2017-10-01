package cubic

//import shapeless._

/**
 * This file is named ARoot.scala instead of Root.scala because it needs to come before "Cubic.scala" lexicographically,
 * due to [[https://github.com/scala/bug/issues/10222#issuecomment-333397589 scala/bug#10222]].
 */

sealed trait Root[D <: Numeric[D]] {
  def value: D
  def degree: Int
}

object Root {

  case class Single[D <: Numeric[D]](value: D)
    extends Root[D] {
    override def degree = 1
    override def toString = value.toString
  }

  case class Double[D <: Numeric[D]](value: D)
    extends Root[D] {
    override def degree = 2
    override def toString = s"$value·2"
  }

  case class Triple[D <: Numeric[D]](value: D)
    extends Root[D] {
    override def degree = 3
    override def toString = s"$value·3"
  }

//  def gen[D <: Numeric[D]] = Generic[R[D]]
//  implicit def singleGen[D <: Numeric[D]]: Generic.Aux[Single[D], D :: HNil] = the[Generic.Aux[Single[D], D :: HNil]]

//  implicit class Ops[D <: Numeric[D], R <: Root[D]](val root: R)(implicit gen: Generic.Aux[R, D :: HNil]) {
//    def -(o: D): R = gen.from((root.value - o) :: HNil)
//  }
}
