package apvd.lib

import java.lang.Math.PI

import apvd.lib.Ellipse.toDegrees

case class Ellipse(cx: Double,
                   cy: Double,
                   rx: Double,
                   ry: Double,
                   theta: Double,
                   color: String,
                   name: String
                  ) {

  lazy val degrees = toDegrees(theta)
  lazy val cos = Math.cos(theta)
  lazy val sin = Math.sin(theta)

  lazy val rx2 = rx * rx
  lazy val ry2 = ry * ry
  lazy val c = cos
  lazy val s = sin
  lazy val c2 = c*c
  lazy val s2 = s*s

  lazy val d1 = ry * (cx * c + cy * s)
  lazy val d2 = rx * (cy * c - cx * s)
  lazy val d = rx2 * ry2 - d1 * d1 - d2 * d2

  lazy val a1 = c2 * ry2 + s2 * rx2
  lazy val c1 = c2 * rx2 + s2 * ry2

  lazy val r1 = ry2 - rx2

  lazy val A = a1
  lazy val B = 2*c*s*r1
  lazy val C = c1
  lazy val D = -2 * (cx*a1 + cy*c*s*r1)
  lazy val E = -2 * (cy*c1 + cx*c*s*r1)
  lazy val F = -d

  def center = Point(cx, cy)

  def project(e: Ellipse): Ellipse =
    affine(
      1/e.rx,
      1/e.ry,
      -e.theta,
      -e.cx,
      -e.cy
    )

  def affine(sx: Double, sy: Double, theta: Double, tx: Double, ty: Double): Ellipse =
    translate(tx, ty)
      .rotate(theta)
      .scale(sx, sy)

  def translate(tx: Double, ty: Double): Ellipse =
    copy(
      cx = cx + tx,
      cy = cy + ty
    )

  def rotate(theta: Double): Ellipse = {
    val Point(cx, cy) = center.rotate(theta)
    copy(
      cx = cx,
      cy = cy,
      theta = this.theta + theta
    )
  }

  def scale(sx: Double, sy: Double): Ellipse =
    copy(
      cx = cx * sx,
      cy = cy * sy,
      rx = rx * sx,
      ry = ry * sy
    )

}

object Ellipse {
  def toDegrees(theta: Double): Double = theta * 180 / PI
  def toTheta(degrees: Double): Double = degrees * PI / 180
}
