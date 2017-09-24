package apvd.react

import japgolly.scalajs.react.vdom.TagMod
import japgolly.scalajs.react.vdom.prefix_<^._
import japgolly.scalajs.react.{ BackendScope, Callback, ReactComponentB, ReactEventI }

import scala.collection.mutable.ArrayBuffer

object Page {

  case class State(ellipses: Seq[Ellipse])

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

  val component = ReactComponentB[Unit]("Area-proportional venn-diagrams dashboad")
                  .initialState(State.empty)
                  .renderBackend[Ops]
                  .build

  class Ops($: BackendScope[Unit, State]) {

//    def updateMsg(e: ReactEventI): Callback = {
//      $.zoom(_.msg)((s, msg) ⇒ s.copy(msg = msg)).setState(e.target.value)
//    }

    def render(s: State) = {
      val State(ellipses) = s

      val panels = ArrayBuffer[TagMod]()

      // Main panel
      panels += Panel.component(Panel.Props(ellipses))

      // Per-ellipse projected panels
      panels ++=
        ellipses
          .map(
            _ ⇒
              Panel.component(Panel.Props(ellipses)): TagMod
          )

      <.div(
        panels
      )
    }
  }
}
