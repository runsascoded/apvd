package apvd

import apvd.css.Style
import apvd.react.Page
import org.scalajs.dom

import scala.scalajs.js.annotation.JSExportTopLevel
import scalacss.DevDefaults.{ cssEnv, cssStringRenderer }
import scalacss.defaults.PlatformExports._

object Main {
  @JSExportTopLevel("apvd.main")
  def main(args: Array[String]): Unit = {
    installStyle(
      createStyleElement(
        Style.render
      )
    )
    Page
      .component()
      .renderIntoDOM(dom.document.getElementById("playground"))
  }
}
