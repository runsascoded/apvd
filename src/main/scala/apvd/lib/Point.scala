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