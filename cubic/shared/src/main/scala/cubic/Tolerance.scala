package cubic

case class Tolerance(ε: Double)
object Tolerance {
  implicit def unwrap(t: Tolerance): Double = t.ε
}
