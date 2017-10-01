package cubic

case class Tolerance(v: Double)
object Tolerance {
  implicit def unwrap(t: Tolerance): Double = t.v
}
