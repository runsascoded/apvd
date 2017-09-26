package apvd.react

import apvd.css.Style.Class
import apvd.lib.Point
import japgolly.scalajs.react._
import japgolly.scalajs.react.vdom.HtmlAttrs.{ onMouseDown, onMouseMove, onMouseUp }
import japgolly.scalajs.react.vdom.SvgTags.circle
import japgolly.scalajs.react.vdom.svg_<^._

object Vertex {
  case class Props(p: Point,
                   cls: Class,
                   size: Double,
                   dragStart: ReactMouseEvent ⇒ Callback)

  val component = ScalaComponent.builder[Props]("Svg ellipse control point")
                  .renderBackend[Ops]
                  .build

  class Ops($: BackendScope[Props, Unit]) {

    def render(props: Props) = {
      val Props(p, cls, size, dragStart) = props

      circle(
        cls,
        onMouseDown ==> dragStart,
        ^.cx := p.x,
        ^.cy := p.y,
        ^.r := size
      )
    }
  }

}
