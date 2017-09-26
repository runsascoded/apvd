package apvd.css

import japgolly.scalajs.react.vdom.Attr.ValueType
import japgolly.scalajs.react.vdom.TagMod

import scala.scalajs.js
import scalacss.DevDefaults._
import scalacss.internal.Attr
import scalacss.internal.ValueT.TypedAttr_Color

object Style extends StyleSheet.Standalone {
  import dsl._

  case class Class(value: String) {
    override def toString: String = value
  }

  object Class {
    implicit def toRootStringOps(cls: Class): RootStringOps = RootStringOps(s".${cls.value}")

    implicit def toJSAny(cls: Class): js.Any = cls.value.asInstanceOf[js.Any]

    implicit val valueType: ValueType[Class, Nothing] =
      ValueType((fn, v) ⇒ fn(v))

    implicit def toTagMod(cls: Class): TagMod = ClassName := cls
  }

  val gridLine = Class("grid-line")
  gridLine - svgStroke.lightgray

  val axis = Class("axis")
  axis - svgStroke.grey

  val panel = Class("panel")
  panel - (
    border(1 px, solid, black),
    margin(4 px)
  )

  "body" - margin(8 px)

  object fill extends TypedAttr_Color {
    override val attr = Attr.real("fill")
  }

  val cursor = Class("cursor")
  cursor - fill.black

  val ellipse = Class("ellipse")
  ellipse - svgFillOpacity(0.2)
}
