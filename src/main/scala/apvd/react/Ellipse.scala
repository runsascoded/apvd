package apvd.react

import apvd.css.Style
import apvd.lib
import apvd.lib.{ Point, Transform }
import japgolly.scalajs.react._
import japgolly.scalajs.react.vdom.HtmlAttrs.{ key, onMouseEnter, onMouseLeave, onMouseMove }
import japgolly.scalajs.react.vdom.SvgTags.{ circle, ellipse, g }
import japgolly.scalajs.react.vdom.svg_<^._

object Ellipse {

  case class Props(e: lib.Ellipse,
                   transformBy: Option[Transform],
                   strokeWidth: Double,
                   dotSize: Double,
                   active: Boolean,
                   activate: Boolean ⇒ Callback)

  case class State(mouseEntered: Boolean)

  val component = ScalaComponent.builder[Props]("Svg panel")
                  .initialState(State(false))
                  .renderBackend[Ops]
                  .build

  class Ops($: BackendScope[Props, State]) {

    def mouseEnter: Callback =
      $.props.flatMap(_.activate(true))

    def mouseLeave: Callback =
      $.props.flatMap(_.activate(false))

    def render(p: Props, state: State) = {
      val Props(originalEllipse, transformBy, strokeWidth, dotSize, active, activate) = p
      val e = originalEllipse(transformBy)

      val (frx, fry) =
        if (e.rx > e.ry)
          (e.fd, 0.0)
        else
          (0.0, e.fd)

      import Style.{ focus, vertex }

      val points =
        if (active) {
          List(
            vertex → originalEllipse.vx1,
            vertex → originalEllipse.vx2,
            vertex → originalEllipse.vy1,
            vertex → originalEllipse.vy2,
             focus → originalEllipse.f1,
             focus → originalEllipse.f2
          )
          .map { case (cls, p) ⇒ cls → p(transformBy) }
          .toTagMod {
            case (cls, Point(x, y)) ⇒
              circle(
                cls,
                ^.cx := x,
                ^.cy := y,
                ^.r := dotSize,
                ^.fill := "black"
              )
          }
        } else
          Nil.toTagMod

      g(
        key := e.name,
        points,
        g(
          ^.transform := s"translate(${e.cx},${e.cy}) rotate(${e.degrees})",
          onMouseEnter --> mouseEnter,
          onMouseMove  --> mouseEnter,
          onMouseLeave --> mouseLeave,
          ellipse(
            Style.ellipse,
            ^.rx := e.rx,
            ^.ry := e.ry,
            ^.fill := e.color,
            ^.strokeWidth := strokeWidth
          )
        )
      )
    }
  }
}
