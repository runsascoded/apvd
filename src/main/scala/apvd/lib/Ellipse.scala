package apvd.lib

import apvd.lib.Ellipse.toDegrees

import scala.math.{ Pi, atan, cos, sin, sqrt }

sealed trait Ellipse {
  def color: String
  def name: String

  def cx: Double
  def cy: Double
  def rx: Double
  def ry: Double
  def theta: Double

  // Coefficients of this ellipse when represented as the locus of points satisfying Ax² + Bxy + Cy² + Dx + Ey + F = 0
  def A: Double
  def B: Double
  def C: Double
  def D: Double
  def E: Double
  def F: Double

  def center = Point(cx, cy)

  lazy val degrees = toDegrees(theta)

  /**
   * Express this ellipse in "coordinate" form (center x/y, radius x/y, CCW rotation)
   */
  def toCoords: Coords =
    Coords(
      cx = cx,
      cy = cy,
      rx = rx,
      ry = ry,
      theta = theta,
      color = color,
      name = name
    )

  /**
   * Express this ellipse in "coefficient" form (Ax² + Bxy + Cy² + Dx + Ey + F = 0)
   */
  def toCoeffs: Coeffs =
    Coeffs(
      A = A,
      B = B,
      C = C,
      D = D,
      E = E,
      F = F,
      color = color,
      name = name
    )

  /**
   * Project this ellipse according to a transform that would turn the argument ellipse into the unit circle
   */
  def project(e: Ellipse): Ellipse =
    affine(
      1 / e.rx,
      1 / e.ry,
      -e.theta,
      -e.cx,
      -e.cy
    )

  def project(p: Point): Point =
    p.-(cx, cy).rotate(-theta).*(1 / rx, 1 / ry)

  /**
   * Translate, rotate, and scale this ellipse
   */
  def affine(sx: Double,
             sy: Double,
             theta: Double,
             tx: Double,
             ty: Double): Ellipse =
    translate(tx, ty)
      .rotate(theta)
      .scale(sx, sy)

  def translate(tx: Double, ty: Double): Ellipse
  def rotate(theta: Double): Ellipse
  def scale(sx: Double, sy: Double): Ellipse
}

case class Coords(cx: Double,
                  cy: Double,
                  rx: Double,
                  ry: Double,
                  theta: Double,
                  color: String,
                  name: String)
  extends Ellipse {

  lazy val rx2 = rx * rx
  lazy val ry2 = ry * ry
  lazy val c = cos(theta)
  lazy val s = sin(theta)
  lazy val c2 = c*c
  lazy val s2 = s*s
  lazy val cs = c*s

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

  override def translate(tx: Double, ty: Double): Ellipse =
    copy(
      cx = cx + tx,
      cy = cy + ty
    )

  override def rotate(theta: Double): Ellipse = {
    val Point(cx, cy) = center.rotate(theta)
    copy(
      cx = cx,
      cy = cy,
      theta = this.theta + theta
    )
  }

  override def scale(sx: Double, sy: Double): Ellipse = toCoeffs.scale(sx, sy)
}

case class Coeffs(A: Double,
                  B: Double,
                  C: Double,
                  D: Double,
                  E: Double,
                  F: Double,
                  color: String,
                  name: String)
  extends Ellipse {
  lazy val theta = if (B == 0) 0 else atan(B / (A - C)) / 2
  lazy val (c, s) = (cos(theta), sin(theta))
  lazy val c2 = c * c
  lazy val s2 = s * s
  lazy val cs = c * s

  lazy val leveled = this.rotate(-theta)

  lazy val Coeffs(nA, nB, nC, nD, nE, _, _, _) = leveled

  lazy val Point(cx, cy) = Point(-nD / nA / 2, -nE / nC / 2).rotate(theta)

  lazy val (rx, ry) = {
    val discrim = nD * nD / nA / 4 + nE * nE / nC / 4 - F
    (sqrt(discrim / nA), sqrt(discrim / nC))
  }

  override def translate(tx: Double, ty: Double): Coeffs =
    copy(
      D = D - 2*A*tx - B*ty,
      E = E - 2*C*ty - B*tx,
      F = F + A*tx*tx + B*tx*ty + C*ty*ty - D*tx - E*ty
    )

  override def rotate(theta: Double): Coeffs = {
    val (c, s) = (cos(theta), sin(theta))
    val (c2, cs, s2) = (c*c, c*s, s*s)
    copy(
      A = A*c2 - B*cs + C*s2,
      B = 2*cs*(A - C) + B*(c2 - s2),
      C = A*s2 + B*cs + C*c2,
      D = D*c - E*s,
      E = D*s + E*c
    )
  }

  override def scale(sx: Double, sy: Double): Coeffs =
    copy(
      A = A / sx / sx,
      B = B / sx / sy,
      C = C / sy / sy,
      D = D / sx,
      E = E / sy
    )
}

object Ellipse {
  def toDegrees(theta: Double): Double = theta * 180 / Pi
  def toTheta(degrees: Double): Double = degrees * Pi / 180

  def apply(cx: Double,
            cy: Double,
            rx: Double,
            ry: Double,
            theta: Double,
            color: String,
            name: String): Ellipse =
    Coords(cx, cy, rx, ry, theta, color, name)
}
