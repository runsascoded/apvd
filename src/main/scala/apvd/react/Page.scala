package apvd.react

import japgolly.scalajs.react._
import japgolly.scalajs.react.vdom.html_<^._

import japgolly.scalajs.react.vdom.TagMod
import japgolly.scalajs.react.{ BackendScope, Callback, CallbackTo }
import org.scalajs.dom.html

import scala.collection.mutable.ArrayBuffer

case class Point(x: Double, y: Double)

object Page {

  case class State(ellipses: Seq[Ellipse],
                   cursor: Point = Point(0, 0),
                   activeSvg: Int = 0)

  case class Ellipse(cx: Double,
                     cy: Double,
                     rx: Double,
                     ry: Double,
                     degrees: Double,
                     color: String,
                     name: String
                    )

  object State {
    val empty =
      State(
        List(
          Ellipse(
            cx = -0.82,
            cy = 0.38,
            rx = 1,
            ry = 2,
            degrees = 0,
            color = "red",
            name = "A"
          ),
          Ellipse(
            cx = -0.7,
            cy = 0.12,
            rx = 1.3,
            ry = 0.4,
            degrees = 114,
            color = "blue",
            name = "B"
          ),
          Ellipse(
            cx = 0.5,
            cy = 1.52,
            rx = .94,
            ry = .48,
            degrees = 18,
            color = "darkgoldenrod",
            name = "C"
          ),
          Ellipse(
            cx = 0,
            cy = 0,
            rx = .6,
            ry = .48,
            degrees = -44,
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
            _ ⇒
              Panel.component(
                Panel.Props(
                  ellipses,
                  cursor,
                  CallbackTo(point ⇒ updateCursor(point))
                )
              )
          )
      )
      .ref(divRef = _)
    }
  }
}
