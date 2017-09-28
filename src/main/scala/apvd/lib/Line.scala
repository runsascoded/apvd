package apvd.lib

import scala.math.{ cos, sin }

/**
 * Representation of a line in the form Ax + By + C = 0
 */
case class Line(A: Double, B: Double, C: Double) {
  def apply(transform: Option[Transform]): Line = transform.map(apply).getOrElse(this)
  def apply(transform: Transform): Line =
    transform match {
      case Translate(x, y) ⇒ copy(C = A*x + B*y + C)
      case Rotate(theta) ⇒
        val (c, s) = (cos(theta), sin(theta))
        Line(
          A*c + B*s,
          A*s - B*c,
          C
        )
      case Scale(x, y) ⇒ Line(A * y, B * x, C * x * y)
      case Transforms(transforms) ⇒ transforms.foldLeft(this)(_ apply _)
    }

  def intersect(o: Line): Option[Point] = {
    val d = A * o.B - B * o.A
    if (d == 0)
      None
    else
      Some(
        Point(
          (C * o.B - B * o.C) / -d,
          (A * o.C - C * o.A) / -d
        )
      )
  }
}

object Line {
  def horizontal(y: Double): Line = Line(0, 1, -y)
  def vertical(x: Double): Line = Line(1, 0, -x)
}
