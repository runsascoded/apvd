package apvd.react

import apvd.css.{ ClassName, Style }
import apvd.lib
import apvd.lib.{ Point, Transform }
import japgolly.scalajs.react._
import japgolly.scalajs.react.vdom.HtmlAttrs.{ key, onMouseMove, onMouseLeave }
import japgolly.scalajs.react.vdom.SvgTags
import japgolly.scalajs.react.vdom.svg_<^._
import org.scalajs.dom.raw.SVGSVGElement

object Panel {

  case class Props(idx: Int,
                   ellipses: Seq[lib.Ellipse],
                   cursor: Option[Point],
                   onCursor: Option[(Point, Int)] ⇒ Callback,
                   activateEllipse: (Int, Boolean) ⇒ Callback,
                   transform: Option[Transform] = None,
                   width: Int = 300,
                   height: Int = 400,
                   scale: Double = 50,
                   dotSize: Double = 5,
                   gridLineWidth: Int = 1,
                   cursorDotRadius: Int = 3,
                   hideCursor: Boolean = false,
                   activeEllipse: Option[Int] = None
                  )

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
                  .renderBackend[Ops]
                  .build

  class Ops($: BackendScope[Props, Unit]) {

    private var ref: SVGSVGElement = _

    def transform(p: Point, props: Props): Point =
      Point(
        (p.x - props.width / 2.0 - ref.getBoundingClientRect().left) / props.scale,
        (props.height / 2.0 - p.y + ref.getBoundingClientRect().top) / props.scale
      )

    def mouseMove(event: ReactMouseEvent): Callback =
      $
        .props
        .flatMap {
          props ⇒
            val raw = Point(event.clientX, event.clientY)
            val virtual = transform(raw, props)
            val inverted = virtual(props.transform.map(_.invert))
            props.onCursor(Some((inverted, props.idx)))
        }

    def render(p: Props, state: Unit) = {
      implicit val props = p
      val Props(_, ellipses, cursor, onCursor, activateEllipse, transform, width, height, scale, dotSize, _, cursorDotRadius, hideCursor, activeEllipse) = p

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
                      e,
                      transform,
                      strokeWidth = 1.0 / scale,
                      dotSize = dotSize / scale,
                      active = activeEllipse.contains(idx),
                      activate = active ⇒ activateEllipse(idx, active)
                    )
                  )
              }
          ),
          projectedCursor.toTagMod
        ),
        onMouseMove ==> mouseMove,
        onMouseLeave --> onCursor(None)
      )
      .ref(ref = _)
    }
  }
}
