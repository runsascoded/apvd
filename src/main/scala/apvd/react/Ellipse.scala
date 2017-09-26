package apvd.react

import apvd.css.Style
import apvd.lib
import japgolly.scalajs.react._
import japgolly.scalajs.react.vdom.HtmlAttrs.key
import japgolly.scalajs.react.vdom.SvgTags.{ ellipse, g }
import japgolly.scalajs.react.vdom.svg_<^._

object Ellipse {

  case class Props(e: lib.Ellipse,
                   transformBy: Option[lib.Ellipse],
                   strokeWidth: Double,
                   active: Boolean)

  val component = ScalaComponent.builder[Props]("Svg panel")
                  .renderBackend[Ops]
                  .build

  class Ops($: BackendScope[Props, Unit]) {
    def render(p: Props, state: Unit) = {
      val Props(originalEllipse, transformBy, strokeWidth, active) = p
      val e = originalEllipse.project(transformBy)
      g(
        key := e.name,
        ^.transform := s"translate(${e.cx},${e.cy}) rotate(${e.degrees})",
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
