package apvd.react

import apvd.lib.Ellipse.toTheta
import apvd.lib.{ Ellipse, Point }
import japgolly.scalajs.react.vdom.html_<^._
import japgolly.scalajs.react.{ BackendScope, Callback, CallbackTo, _ }
import org.scalajs.dom.html

object Page {

  case class State(ellipses: Seq[Ellipse],
                   cursor: Point = Point(0, 0),
                   activeSvg: Int = 0)

  object State {
    val empty =
      State(
        List(
          Ellipse(
            cx = -0.82,
            cy = 0.38,
            rx = 1,
            ry = 2,
            theta = 0,
            color = "red",
            name = "A"
          ),
          Ellipse(
            cx = -0.7,
            cy = 0.12,
            rx = 1.3,
            ry = 0.4,
            theta = toTheta(114),
            color = "blue",
            name = "B"
          ),
          Ellipse(
            cx = 0.5,
            cy = 1.52,
            rx = .94,
            ry = .48,
            theta = toTheta(18),
            color = "darkgoldenrod",
            name = "C"
          ),
          Ellipse(
            cx = 0,
            cy = 0,
            rx = .6,
            ry = .48,
            theta = toTheta(-44),
            color = "green",
            name = "D"
          )
        )
      )
  }

  val component = ScalaComponent.builder[Unit]("Area-proportional venn-diagrams dashboad")
                  .initialState(State.empty)
                  .renderBackend[Ops]
                  .build

  class Ops($: BackendScope[Unit, State]) {

    private var divRef: html.Element = _

    def updateCursor(cursor: Point): Callback =
      $.modState(_.copy(cursor = cursor))

    def render(s: State) = {
      val State(ellipses, cursor, activeSvg) = s

      <.div(
        Panel.component(
          Panel.Props(
            ellipses,
            cursor,
            CallbackTo(point ⇒ updateCursor(point))
          )
        ),
        ellipses
          .toTagMod(
            ellipse ⇒
              Panel.component(
                Panel.Props(
                  ellipses,
                  cursor,
                  CallbackTo(point ⇒ updateCursor(point)),
                  transformBy = Some(ellipse)
                )
              )
          )
      )
      .ref(divRef = _)
    }
  }
}
