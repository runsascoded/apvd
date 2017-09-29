package apvd.lib

import scala.math.{ max, min }

case class Rectangle(ll: Point, ur: Point) {
  def l = ll.x
  def r = ur.x
  def t = ur.y
  def b = ll.y

  lazy val ul = Point(l, t)
  lazy val lr = Point(r, b)

  def corners = Vector(ll, ul, ur, lr)

  lazy val left = Segment(ll, ul)
  lazy val top = Segment(ul, ur)
  lazy val right = Segment(ur, lr)
  lazy val bottom = Segment(lr, ll)

  def segments = Vector(left, top, right, bottom)

  def intersect(line: Line): Option[Segment] =
    segments.flatMap(_.intersect(line)) match {
      case Vector() ⇒ None
      case Vector(corner) ⇒
        if (!corners.contains(corner))
          throw new IllegalStateException(
            s"Single intersection for line $line with rect $this: $corner"
          )
        None
      case Vector(p1, p2) ⇒
        Some(Segment(p1, p2))
      case other ⇒
        throw new IllegalStateException(
          s"More than two intersections of line $line with rect $this: ${other.mkString(", ")}"
        )
    }
}

object Rectangle {
  def bounding(points: Seq[Point]): Rectangle = {
    val ps = points.iterator
    val Point(x, y) = ps.next
    val (xm, xM, ym, yM) =
      ps.foldLeft(
        (x, x, y, y)
      ) {
        case (
          (xm, xM, ym, yM),
          Point(x, y)
        ) ⇒
          (
            min(xm, x),
            max(xM, x),
            min(ym, y),
            max(yM, y)
          )
      }

    Rectangle(
      Point(xm, ym),
      Point(xM, yM)
    )
  }

}
