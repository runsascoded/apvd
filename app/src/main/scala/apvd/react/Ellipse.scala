package apvd.react

import apvd.css.Style
import apvd.lib
import apvd.lib.{ Point, Transform }
import japgolly.scalajs.react._
import japgolly.scalajs.react.vdom.HtmlAttrs.{ key, onMouseEnter, onMouseMove, onMouseDown  }
import japgolly.scalajs.react.vdom.SvgTags.{ ellipse, g }
import japgolly.scalajs.react.vdom.svg_<^._

object Ellipse {

  case class Props(idx: Int,
                   e: lib.Ellipse,
                   transform: Option[Transform],
                   strokeWidth: Double,
                   dotSize: Double,
                   active: Boolean,
                   activate: Callback,
                   toVirtual: ReactMouseEvent ⇒ Point,
                   startDrag: Option[Drag] ⇒ Callback,
                   onDrag: ReactMouseEvent ⇒ Callback)

  case class State(mouseEntered: Boolean = false)

  val component = ScalaComponent.builder[Props]("Svg ellipse")
                  .initialState(State())
                  .renderBackend[Ops]
                  .build

  class Ops($: BackendScope[Props, State]) {

    def mouseEnter: Callback = $.props.flatMap(_.activate)

    def mouseDown(e: ReactMouseEvent) =
      $.props >>= {
        props ⇒
          props.startDrag(
            Some(
              Drag(
                props.toVirtual(e),
                props.idx,
                d ⇒ props.e.moveCenter(d.x, d.y)
              )
            )
          )
      }

    def dragStart(p: Point,
                  ellipseIdx: Int,
                  onDrag: Point ⇒ lib.Ellipse,
                  negate: Boolean): Callback =
      $.props.flatMap(
        _.startDrag(
          Some(
            Drag(
              p,
              ellipseIdx,
              onDrag =
                if (negate)
                  p ⇒ onDrag(-p)
                else
                  onDrag
            )
          )
        )
      )

    def render(p: Props, state: State) = {
      val Props(idx, originalEllipse, transform, strokeWidth, dotSize, active, _, toVirtual, _, _) = p
      val e = originalEllipse(transform)

      import Style.{ Class, focus, vertex }

      def controlPoint(cls: Class,
                       vertexFn: lib.Ellipse ⇒ Point,
                       negate: Boolean,
                       move: lib.Ellipse ⇒ (Double, Double) ⇒ lib.Ellipse) =
        Vertex.component(
          Vertex.Props(
            vertexFn(originalEllipse)(transform),
            cls,
            dotSize,
            dragStart =
              e ⇒
                dragStart(
                  toVirtual(e),
                  idx,
                  d ⇒ move(originalEllipse)(d.x, d.y),
                  negate = negate
                )
          )
        )

      val points =
        if (active) {
          List(
            controlPoint(vertex, _.vx1,    negate = false, _.moveVx),
            controlPoint(vertex, _.vx2,    negate =  true, _.moveVx),
            controlPoint(vertex, _.vy1,    negate = false, _.moveVy),
            controlPoint(vertex, _.vy2,    negate =  true, _.moveVy),
            controlPoint(vertex, _.center, negate = false, _.moveCenter),
            controlPoint( focus, _.f1,     negate = false, _.moveFocus),
            controlPoint( focus, _.f2,     negate =  true, _.moveFocus)
          )
        } else
          Nil

      g(
        key := e.name,
        g(
          ^.transform := s"translate(${e.cx},${e.cy}) rotate(${e.degrees})",
          onMouseEnter --> mouseEnter,
          onMouseMove  --> mouseEnter,
          onMouseDown ==> mouseDown,
          ellipse(
            Style.ellipse,
            ^.rx := e.rx,
            ^.ry := e.ry,
            ^.fill := e.color,
            ^.strokeWidth := strokeWidth
          )
        ),
        points.toTagMod
      )
    }
  }
}
