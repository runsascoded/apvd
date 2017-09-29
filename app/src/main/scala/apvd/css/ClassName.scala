package apvd.css

import japgolly.scalajs.react.vdom.Attr.ValueType
import japgolly.scalajs.react.vdom.{ Attr, TagMod }

object ClassName extends Attr[String]("class") {
  override def :=[A](a: A)(implicit t: ValueType[A, String]): TagMod =
    TagMod.fn(b => t.fn(b.addClassName, a))
}
