package apvd.css

import scalacss.DevDefaults._

object Style extends StyleSheet.Standalone {
  import dsl._

  case class Class(value: String) {
    override def toString: String = value
  }

  object Class {
    implicit def toRootStringOps(cls: Class): RootStringOps = RootStringOps(s".${cls.value}")
    //implicit def toString(cls: Class): String = cls.value
  }

  val gridLine = Class("grid-line")
  val axis = Class("axis")

  gridLine -
    svgStroke.lightgray

  axis -
    svgStroke.grey

}
