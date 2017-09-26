package apvd.lib

import scala.math.sqrt

case class Point(x: Double, y: Double) {
  def rotate(theta: Double): Point = {
    val cos = Math.cos(theta)
    val sin = Math.sin(theta)
    Point(
      x * cos - y * sin,
      x * sin + y * cos
    )
  }

  def translate(x: Double, y: Double): Point = Point(this.x + x, this.y + y)
  def scale(x: Double, y: Double): Point = Point(this.x + x, this.y + y)

  def apply(transform: Option[Transform]): Point = transform.map(apply).getOrElse(this)
  def apply(transform: Transform): Point =
    transform match {
      case Translate(x, y) ⇒ this + (x, y)
      case Rotate(theta) ⇒ rotate(theta)
      case Scale(x, y) ⇒ this * (x, y)
      case Transforms(transforms) ⇒ transforms.foldLeft(this)(_ apply _)
    }

  def +(o: Point): Point = Point(x + o.x, y + o.y)
  def +(sx: Double, sy: Double): Point = Point(x + sx, y + sy)

  def ±(o: Point): (Point, Point) = (this + o, this - o)
  def ±(tx: Double, ty: Double): (Point, Point) = (this + (tx, ty), this - (tx, ty))

  def -(o: Point): Point = Point(x - o.x, y - o.y)
  def -(sx: Double, sy: Double): Point = Point(x - sx, y - sy)

  def *(o: Point): Point = Point(x * o.x, y * o.y)
  def *(s: Double): Point = Point(x * s, y * s)
  def *(sx: Double, sy: Double): Point = Point(x * sx, y * sy)

  def r: Double = sqrt(x*x + y*y)
}
