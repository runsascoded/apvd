package apvd.react

import apvd.lib
import apvd.lib.Ellipse.toTheta
import apvd.lib.{ Line, Point, Rectangle }
import japgolly.scalajs.react._
import japgolly.scalajs.react.vdom.html_<^._
import org.scalajs.dom.html

object Page {

  case class State(ellipses: Seq[lib.Ellipse],
                   cursor: Option[Point] = None,
                   activeSvg: Option[Int] = None,
                   activeEllipse: Option[Int] = None)

  object State {
    val empty =
      State(
        List(
          lib.Ellipse(
            cx = -0.82,
            cy = 0.38,
            rx = 1,
            ry = 2,
            theta = 0,
            color = "red",
            name = "A"
          ),
          lib.Ellipse(
            cx = -0.7,
            cy = 0.12,
            rx = 1.3,
            ry = 0.4,
            theta = toTheta(114),
            color = "blue",
            name = "B"
          ),
          lib.Ellipse(
            cx = 0.5,
            cy = 1.52,
            rx = .94,
            ry = .48,
            theta = toTheta(18),
            color = "darkgoldenrod",
            name = "C"
          ),
          lib.Ellipse(
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

  val component = ScalaComponent.builder[Unit]("Area-proportional venn-diagrams dashboard")
                  .initialState(State.empty)
                  .renderBackend[Ops]
                  .build

  class Ops($: BackendScope[Unit, State]) {

    private var divRef: html.Element = _

    def updateCursor(cursor: Option[(Point, Int)]): Callback =
      $.modState(
        _.copy(
          cursor = cursor.map(_._1),
          activeSvg = cursor.map(_._2)
        )
      )

    def activateEllipse(idx: Option[Int]): Callback =
      $.modState(
        _.copy(activeEllipse = idx)
      )

    def updateEllipse(idx: Int, e: lib.Ellipse): Callback =
      $.modState(
        s ⇒
          s.copy(
            ellipses =
              s
                .ellipses
                .patch(idx, Seq(e), 1)
          )
      )

    def render(s: State) = {
      val State(ellipses, cursor, activeSvg, activeEllipse) = s

      <.div(
        Panel.component(
          Panel.Props(
            idx = 0,
            ellipses,
            cursor,
            updateCursor,
            activeEllipse = activeEllipse,
            activateEllipse = activateEllipse,
            hideCursor = activeSvg.contains(0),
            updateEllipse = updateEllipse
          )
        ),
        ellipses
          .zipWithIndex
          .toTagMod {
            case (ellipse, idx) ⇒
              Panel.component(
                Panel.Props(
                  idx + 1,
                  ellipses,
                  cursor,
                  updateCursor,
                  activeEllipse = activeEllipse,
                  activateEllipse = activateEllipse,
                  transform = Some(ellipse.projection),
                  hideCursor = activeSvg.contains(idx + 1),
                  updateEllipse = updateEllipse
                )
              )
          }
      )
      .ref(divRef = _)
    }
  }
}
