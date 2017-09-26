package apvd.react

import apvd.css.{ ClassName, Style }
import apvd.lib
import apvd.lib.{ Point, Transform }
import apvd.react.Ellipse.Drag
import japgolly.scalajs.react._
import japgolly.scalajs.react.vdom.HtmlAttrs.{ key, onMouseLeave, onMouseMove, onMouseUp }
import japgolly.scalajs.react.vdom.SvgTags
import japgolly.scalajs.react.vdom.svg_<^._
import org.scalajs.dom.raw.SVGSVGElement

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
      $
        .props
        .flatMap {
          props ⇒
            println(s"panel move (${e.target == ref}):", e.target, ref)
            props.onCursor(
              Some(
                (
                  toVirtual(e, props),
                  props.idx
                )
              )
            )
            .flatMap(_ ⇒
              if (e.target == ref) {
                println("deactivating ellipse")
                props.activateEllipse(None)
              }
              else {
                println("leaving activation")
                Callback {}
              }
            )
        }
        .flatMap {
          _ ⇒ onDrag(e)
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

      val maxX = width / scale / 2
      val maxY = height / scale / 2

      val verticalLines =
        (
          (1.0 until maxX by 1)
            .toVector
            .flatMap {
              x ⇒
                Vector(
                  keyedVLine( x, maxY),
                  keyedVLine(-x, maxY)
                )
            } :+
            keyedVLine(0, maxY, axis)
        )
        .sortBy(_._1)
        .map(_._2)

      val horizontalLines =
        (
          (1.0 until maxY by 1)
            .flatMap {
              y ⇒
                Vector(
                  keyedHLine( y, maxX),
                  keyedHLine(-y, maxX)
                )
            } :+
            keyedHLine(0, maxX, axis)
        )
        .sortBy(_._1)
        .map(_._2)

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
                      activate = activateEllipse(Some(idx)),
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
        onMouseLeave --> {
          onCursor(None).flatMap(_ ⇒ setDrag(None))
        },
        onMouseUp --> mouseUp
      )
      .ref(ref = _)
    }
  }
}
