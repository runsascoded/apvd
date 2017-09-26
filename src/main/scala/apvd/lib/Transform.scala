package apvd.lib

sealed trait Transform {
  def invert: Transform
}
case class Translate(x: Double, y: Double) extends Transform {
  override def invert = Translate(-x, -y)
}
case class Rotate(theta: Double) extends Transform {
  override def invert = Rotate(-theta)
}
case class Scale(x: Double, y: Double) extends Transform {
  override def invert = Scale(1/x, 1/y)
}

case class Transforms(transforms: Seq[Transform]) extends Transform {
  override def invert = copy(transforms.reverse.map(_.invert))
}
