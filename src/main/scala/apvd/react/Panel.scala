package apvd.react

import apvd.css.Style
import apvd.react.Page.Ellipse
import japgolly.scalajs.react.ReactComponentB
import japgolly.scalajs.react.vdom.ReactAttr
import japgolly.scalajs.react.vdom.svg.prefix_<^._

object Panel {

  case class Props(ellipses: Seq[Ellipse],
                   width: Int = 300,
                   height: Int = 400,
                   scale: Double = 50,
                   gridLineWidth: Int = 1
                  )

  import Style._

  def keyedVLine(x: Double, extraClasses: Class*)(implicit props: Props) =
    x →
      <.line(
        ReactAttr.ClassName := (gridLine :: extraClasses.toList).mkString(" "),
        ^.x1 := x,
        ^.x2 := x,
        ^.y1 := 0,
        ^.y2 := props.height
      )

  def keyedHLine(y: Double, extraClasses: Class*)(implicit props: Props) =
    y →
      <.line(
        ReactAttr.ClassName := (gridLine :: extraClasses.toList).mkString(" "),
        ^.x1 := 0,
        ^.x2 := props.width,
        ^.y1 := y,
        ^.y2 := y
      )

  val component = ReactComponentB[Props]("Svg panel")
                  .renderPS(
                    (c, p, s) ⇒ {
                      implicit val props = p
                      val Props(ellipses, width, height, scale, gridLineWidth) = p

                      val verticalLines =
                        (
                          (scale until width by scale)
                            .flatMap {
                              x ⇒
                                Vector(
                                  keyedVLine( x),
                                  keyedVLine(-x)
                                )
                            } :+
                            keyedVLine(0, axis)
                        )
                        .sortBy(_._1)
                        .map(_._2)

                      val horizontalLines =
                        (
                          (scale until height by scale)
                            .flatMap {
                              y ⇒
                                Vector(
                                  keyedHLine( y),
                                  keyedHLine(-y)
                                )
                            } :+
                            keyedHLine(0, axis)
                        )
                        .sortBy(_._1)
                        .map(_._2)

                      <.svg(
                        ^.width := p.width,
                        ^.height := p.height,
                        verticalLines,
                        horizontalLines,
                        p.ellipses.map {
                          e ⇒
                            <.ellipse(
                              ^.cx := e.cx,
                              ^.cy := e.cy,
                              ^.rx := e.rx,
                              ^.ry := e.ry,
                              ^.fill := e.color
                            )
                        }
                      )
                    }
                  )
                  .build
}
