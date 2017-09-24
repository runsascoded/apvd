package apvd.lib

case class Point(x: Double, y: Double) {
  def rotate(theta: Double): Point = {
    val cos = Math.cos(theta)
    val sin = Math.sin(theta)
    Point(
      x * cos - y * sin,
      x * sin + y * cos
    )
  }
}
