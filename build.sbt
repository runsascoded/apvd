
lazy val apvd = rootProject(app, lib)

lazy val app = project.settings(
  scalaVersion := "2.12.3",
  scalaJSUseMainModuleInitializer := true,
  libraryDependencies ++= Seq(
    "com.github.japgolly.scalajs-react" %%% "core" % "1.1.0",
    "org.scala-js" %%% "scalajs-dom" % "0.9.1",
    "com.github.japgolly.scalacss" %%% "core" % "0.5.3"
  ),
  npmDependencies in Compile ++= Seq(
    "react" -> "15.6.1",
    "react-dom" -> "15.6.1"
  )
).enablePlugins(
  ScalaJSPlugin,
  ScalaJSBundlerPlugin
).dependsOn(
  lib
)

lazy val lib = project.settings(
  scalaVersion := "2.12.3"
)
