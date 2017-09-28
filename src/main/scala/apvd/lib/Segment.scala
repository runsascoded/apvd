package apvd.lib

case class Segment(p1: Point, p2: Point) {
  lazy val Point(dx, dy) = p2 - p1
  lazy val line =
    if (dx == 0)
      Line(
        1,
        0,
        -p1.x
      )
    else {
      val m = dy / dx
      Line(
        m,
        -1,
        p1.y - m*p1.x
      )
    }

  lazy val (pm, pM) =
    if (p1.x < p2.x || (p1.x == p2.x && p1.y < p2.y))
      (p1, p2)
    else
      (p2, p1)

  val cmp = implicitly[Ordering[Double]].compare _

  def intersect(o: Line): Option[Point] = {
    val i = line.intersect(o)
    i filter {
      case p @ Point(x, y)
        if cmp(p1.x, x) * cmp(x, p2.x) >= 0 &&
           cmp(p1.y, y) * cmp(y, p2.y) >= 0 ⇒
        true
      case _ ⇒
        false
    }
  }

  def intersect(o: Segment): Option[Point] =
    (intersect(o.line), o.intersect(line)) match {
      case (Some(i1), Some(i2)) ⇒
        if (i1 != i2)
          throw new IllegalStateException(
            s"Asymmetric segment intersection: $this ⨯ $o, $i1 vs $i2"
          )

        Some(i1)
      case _ ⇒
        None
    }

  def apply(transform: Option[Transform]): Segment = transform.map(apply).getOrElse(this)
  def apply(transform: Transform): Segment = Segment(p1(transform), p2(transform))
}
