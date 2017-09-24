package apvd.react

import apvd.css.Style
import apvd.react.Page.Ellipse
import japgolly.scalajs.react.vdom.Attr.ValueType
import japgolly.scalajs.react.vdom.HtmlAttrs.{ key, onMouseMove }
import japgolly.scalajs.react.vdom.svg_<^._
import japgolly.scalajs.react.vdom.{ Attr, SvgTags, TagMod }
import japgolly.scalajs.react.{ Callback, _ }
import org.scalajs.dom.raw.SVGSVGElement

object ClassName extends Attr[String]("class") {
  override def :=[A](a: A)(implicit t: ValueType[A, String]): TagMod =
    TagMod.fn(b => t.fn(b.addClassName, a))
}

object Panel {

  case class Props(ellipses: Seq[Ellipse],
                   cursor: Point,
                   onCursor: CallbackTo[Point ⇒ Callback],
                   width: Int = 300,
                   height: Int = 400,
                   scale: Double = 50,
                   gridLineWidth: Int = 1,
                   cursorDotRadius: Int = 3
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
            props.onCursor.flatMap(_(virtual))
        }

    def render(p: Props, state: Unit) = {
      implicit val props = p
      val Props(ellipses, cursor, onCursor, width, height, scale, gridLineWidth, cursorDotRadius) = p

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

      svg(
        panel,
        ^.width := width,
        ^.height := height,
        g(
          ^.transform := s"translate(${width / 2.0},${height / 2.0}) scale($scale,-$scale)",
          g(
            verticalLines :+ (ClassName := "vertical-lines"): _*
          ),
          g(
            horizontalLines :+ (ClassName := "horizontal-lines"): _*
          ),
          circle(
            Style.cursor,
            ^.cx := cursor.x,
            ^.cy := cursor.y,
            ^.r := cursorDotRadius / scale
          )
        ),
        onMouseMove ==> mouseMove,
        ellipses.toVdomArray {
          e ⇒
            ellipse(
              key := e.name,
              ^.cx := e.cx,
              ^.cy := e.cy,
              ^.rx := e.rx,
              ^.ry := e.ry,
              ^.fill := e.color
            )
        }
      )
      .ref(ref = _)
    }
  }
}
