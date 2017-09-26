package apvd.react

import apvd.css.Style
import apvd.lib
import apvd.lib.Transform
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

    def mouseEnter(e: ReactMouseEvent): Callback =
      $.props.flatMap(_.activate(true))

    def mouseLeave(e: ReactMouseEvent): Callback =
      $.props.flatMap(_.activate(false))

    def render(p: Props, state: State) = {
      val Props(originalEllipse, transformBy, strokeWidth, dotSize, active, activate) = p
      val e = originalEllipse(transformBy)

      val points =
        if (active) {
          List(
            circle(
              ^.r := dotSize,
              ^.fill := "black"
            )
          )
        } else
          Nil

      g(
        key := e.name,
        ^.transform := s"translate(${e.cx},${e.cy}) rotate(${e.degrees})",
        onMouseEnter ==> mouseEnter,
        onMouseLeave ==> mouseLeave,
        onMouseMove ==> mouseEnter,
        points.toTagMod,
        ellipse(
          Style.ellipse,
          ^.rx := e.rx,
          ^.ry := e.ry,
          ^.fill := e.color,
          ^.strokeWidth := strokeWidth
        )
      )
    }
  }
}
