package apvd.react

import apvd.css.{ ClassName, Style }
import apvd.lib
import apvd.lib.{ Line, Point, Rectangle, Segment, Transform }
import japgolly.scalajs.react._
import japgolly.scalajs.react.vdom.HtmlAttrs.{ key, onMouseLeave, onMouseMove, onMouseUp }
import japgolly.scalajs.react.vdom.{ HtmlAttrs, SvgTags }
import japgolly.scalajs.react.vdom.svg_<^._
import org.scalajs.dom.raw.SVGSVGElement

import math.{ ceil, floor }

object Panel {

  case class Props(idx: Int,
                   ellipses: Seq[lib.Ellipse],
                   cursor: Option[Point],
                   onCursor: Option[(Point, Int)] ⇒ Callback,
                   activateEllipse: Option[Int] ⇒ Callback,
                   transform: Option[Transform] = None,
                   width: Int = 300,
                   height: Int = 400,
                   scale: Double = 50,
                   dotSize: Double = 5,
                   gridLineWidth: Int = 1,
                   cursorDotRadius: Int = 3,
                   hideCursor: Boolean = false,
                   activeEllipse: Option[Int] = None,
                   updateEllipse: (Int, lib.Ellipse) ⇒ Callback
                  ) {
    lazy val invert = transform.map(_.invert)

    lazy val rect = {
      val d = 2 * scale
      val x = width / d
      val y = height / d
      Rectangle(
        Point(-x, -y),
        Point( x,  y)
      )
    }

    lazy val segments = rect.segments
  }

  case class State(drag: Option[Drag] = None)

  import Style._

  def keyedVLine(x: Double, maxY: Double, extraClasses: Class*)(implicit props: Props) =
    x →
      <.line(
        ClassName := (gridLine :: extraClasses.toList).mkString(" "),
        key := x,
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
        key := y,
        ^.x1 := -maxX,
        ^.x2 := maxX,
        ^.y1 := y,
        ^.y2 := y,
        ^.strokeWidth := props.gridLineWidth / props.scale
      )

  val component = ScalaComponent.builder[Props]("Svg panel")
                  .initialState(State())
                  .renderBackend[Ops]
                  .build

  class Ops($: BackendScope[Props, State]) {

    private var ref: SVGSVGElement = _

    def transform(p: Point, props: Props): Point =
      Point(
        (p.x - props.width / 2.0 - ref.getBoundingClientRect().left) / props.scale,
        (props.height / 2.0 - p.y + ref.getBoundingClientRect().top) / props.scale
      )

    def client(e: ReactMouseEvent): Point =
      Point(e.clientX, e.clientY)

    def toVirtual(e: ReactMouseEvent, props: Props): Point =
      transform(client(e), props)(props.invert)

    def mouseMove(e: ReactMouseEvent): Callback =
      $.props >>=
        {
          props ⇒
            $.state >>= {
              state ⇒
                props.onCursor(
                  Some(
                    (
                      toVirtual(e, props),
                      props.idx
                    )
                  )
                ) >>= {
                  _ ⇒
                    if (e.target == ref && state.drag.isEmpty)
                      props.activateEllipse(None)
                    else
                      Callback {}
                } >>= {
                  _ ⇒ onDrag(e)
                }
            }
        }

    def setDrag(drag: Option[Drag]) = $.modState(_.copy(drag = drag))

    def mouseUp = setDrag(None)

    def onDrag(e: ReactMouseEvent): Callback =
      $.state.flatMap(
        s ⇒
          $.props.flatMap(
            props ⇒
              s
                .drag
                .map {
                  case Drag(start, ellipseIdx, onDrag) ⇒
                    val draggedVector = toVirtual(e, props) - start
                    val newEllipse = onDrag(draggedVector)
                    props.updateEllipse(ellipseIdx, newEllipse)
                }
                .getOrElse(Callback {})
          )
      )

    def render(p: Props, state: State) = {
      implicit val props = p
      val Props(_, ellipses, cursor, onCursor, activateEllipse, transform, width, height, scale, dotSize, _, cursorDotRadius, hideCursor, activeEllipse, _) = p

      // Real coordinates of the corners of this panel
      val corners = props.rect.corners.map(_(props.invert))

      // Real {min,max} ⨯ {x,y} values of this panel
      val bounds = Rectangle.bounding(corners)

      // Helper for generating a <line> node given a projected segment
      def domLine(s: Segment, key: Double) = {
        val Segment(p1, p2) = s
        val classes =
          gridLine ::
            (if (key == 0) List(axis) else Nil)

        <.line(
          ClassName := classes.mkString(" "),
          HtmlAttrs.key := key,
          ^.x1 := p1.x,
          ^.y1 := p1.y,
          ^.x2 := p2.x,
          ^.y2 := p2.y,
          ^.strokeWidth := props.gridLineWidth / props.scale
        )
      }

      import Line.{horizontal, vertical}

      val verticalLines =
        (ceil(bounds.l) to floor(bounds.r) by 1)
          .map {
            x ⇒
              val line = vertical(x)
              val segment = bounds.intersect(line)
              val projected =
                segment
                  .map(_(transform))
                  .getOrElse(
                    throw new IllegalStateException(
                      s"No intersection found for bounding rect $bounds with line $line"
                    )
                  )

              domLine(projected, x)
          }

      val horizontalLines =
        (ceil(bounds.b) to floor(bounds.t) by 1)
          .map {
            y ⇒
              val line = horizontal(y)
              val segment =
                bounds.intersect(line)

              val projected =
                segment
                  .map(_(transform))
                  .getOrElse(
                    throw new IllegalStateException(
                      s"No intersection found for bounding rect $bounds with line $line"
                    )
                  )

              domLine(projected, y)
          }

      import SvgTags._

      val projectedCursor =
        cursor
          .map(_(transform))
          .flatMap(
            cursor ⇒
              if (hideCursor)
                None
              else
                Some(
                  circle(
                    Style.cursor,
                    ^.cx := cursor.x,
                    ^.cy := cursor.y,
                    ^.r  := cursorDotRadius / scale
                  )
                )
          )
          .toList

      svg(
        panel,
        ^.width := width,
        ^.height := height,
        g(
          ^.transform := s"translate(${width / 2.0},${height / 2.0}) scale($scale,-$scale)",
          g(
            ClassName := "vertical-lines",
            verticalLines.toTagMod
          ),
          g(
            ClassName := "horizontal-lines",
            horizontalLines.toTagMod
          ),
          g(
            ClassName := "ellipses",
            ellipses
              .zipWithIndex
              .toTagMod {
                case (e, idx) ⇒
                  Ellipse.component(
                    Ellipse.Props(
                      idx,
                      e,
                      transform,
                      strokeWidth = 1.0 / scale,
                      dotSize = dotSize / scale,
                      active = activeEllipse.contains(idx),
                      activate =
                        if (!state.drag.exists(_.ellipseIdx != idx))
                          activateEllipse(Some(idx))
                        else
                          Callback {},
                      toVirtual = toVirtual(_, props),
                      startDrag = setDrag,
                      onDrag = onDrag
                    )
                  )
              }
          ),
          projectedCursor.toTagMod
        ),
        onMouseMove ==> mouseMove,
        onMouseLeave -->
          ( onCursor(None) >>= { _ ⇒ setDrag(None) } ),
        onMouseUp --> mouseUp
      )
      .ref(ref = _)
    }
  }
}

case class Drag(start: Point,
                ellipseIdx: Int,
                onDrag: Point ⇒ lib.Ellipse)
