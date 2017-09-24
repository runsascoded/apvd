package apvd.react

import apvd.css.Style
import apvd.react.Page.Ellipse
import japgolly.scalajs.react.ReactComponentB
import japgolly.scalajs.react.vdom.ReactAttr
import japgolly.scalajs.react.vdom.ReactAttr.ClassName
import japgolly.scalajs.react.vdom.svg.prefix_<^._

object Panel {

  case class Props(ellipses: Seq[Ellipse],
                   cursor: Point,
                   width: Int = 300,
                   height: Int = 400,
                   scale: Double = 50,
                   gridLineWidth: Int = 1,
                   cursorDotRadius: Int = 3
                  )

  import Style._

  def keyedVLine(x: Double, maxY: Double, extraClasses: Class*)(implicit props: Props) =
    x →
      <.line(
        ClassName := (gridLine :: extraClasses.toList).mkString(" "),
        ^.x1 := x,
        ^.x2 := x,
        ^.y1 := -maxY,
        ^.y2 := maxY,
        ^.strokeWidth := props.gridLineWidth / props.scale
      )

  def keyedHLine(y: Double, maxX: Double, extraClasses: Class*)(implicit props: Props) =
    y →
      <.line(
        ClassName := (gridLine :: extraClasses.toList).mkString(" "),
        ^.x1 := -maxX,
        ^.x2 := maxX,
        ^.y1 := y,
        ^.y2 := y,
        ^.strokeWidth := props.gridLineWidth / props.scale
      )

  val component = ReactComponentB[Props]("Svg panel")
                  .renderPS(
                    (c, p, s) ⇒ {
                      implicit val props = p
                      val Props(ellipses, cursor, width, height, scale, gridLineWidth, cursorDotRadius) = p

                      val maxX = width / scale / 2
                      val maxY = height / scale / 2

                      val verticalLines =
                        (
                          (1.0 until maxX by 1)
                            .flatMap {
                              x ⇒
                                Vector(
                                  keyedVLine( x, maxY),
                                  keyedVLine(-x, maxY)
                                )
                            } :+
                            keyedVLine(0, maxY, axis)
                        )
                        .sortBy(_._1)
                        .map(_._2)

                      val horizontalLines =
                        (
                          (1.0 until maxY by 1)
                            .flatMap {
                              y ⇒
                                Vector(
                                  keyedHLine( y, maxX),
                                  keyedHLine(-y, maxX)
                                )
                            } :+
                            keyedHLine(0, maxX, axis)
                        )
                        .sortBy(_._1)
                        .map(_._2)

                      <.svg(
                        ClassName := panel,
                        ^.width := width,
                        ^.height := height,
                        <.g(
                          ^.transform := s"translate(${width / 2.0},${height / 2.0}) scale($scale,-$scale)",
                          <.g(
                            ClassName := "vertical-lines",
                            verticalLines
                          ),
                          <.g(
                            ClassName := "horizontal-lines",
                            horizontalLines
                          ),
                          <.circle(
                            ClassName := Style.cursor,
                            ^.cx := cursor.x,
                            ^.cy := cursor.y,
                            ^.r := cursorDotRadius / scale
                          )
                        ),
                        ellipses.map {
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
