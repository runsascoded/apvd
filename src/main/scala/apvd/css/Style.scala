package apvd.css

import japgolly.scalajs.react.vdom.ReactAttr.ValueType

import scala.scalajs.js
import scalacss.DevDefaults._

object Style extends StyleSheet.Standalone {
  import dsl._

  case class Class(value: String) {
    override def toString: String = value
  }

  object Class {
    implicit def toRootStringOps(cls: Class): RootStringOps = RootStringOps(s".${cls.value}")

    implicit def toJSAny(cls: Class): js.Any = cls.value.asInstanceOf[js.Any]

    implicit val valueType: ValueType[Class] =
      ValueType((fn, v) ⇒ fn(v))
  }

  val gridLine = Class("grid-line")
  gridLine -
    svgStroke.lightgray

  val axis = Class("axis")
  axis -
    svgStroke.grey

  val panel = Class("panel")
  panel - (
    border(1 px, solid, black),
    margin(4 px)
  )

  "body" - margin(8 px)
}
