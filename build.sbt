
enablePlugins(
  ScalaJSPlugin,
  ScalaJSBundlerPlugin
)

scalaVersion := "2.12.3"
scalaJSUseMainModuleInitializer := true

lazy val apvd = rootProject(app, libJS, libJVM)

lazy val app = project.settings(
  libraryDependencies ++= Seq(
    "com.github.japgolly.scalajs-react" %%% "core" % "1.1.0",
    "org.scala-js" %%% "scalajs-dom" % "0.9.1",
    "com.github.japgolly.scalacss" %%% "core" % "0.5.3"
  ),
  npmDependencies in Compile ++= Seq(
    "react" -> "15.6.1",
    "react-dom" -> "15.6.1"
  )
).dependsOn(
  libJS
).enablePlugins(
  ScalaJSPlugin,
  ScalaJSBundlerPlugin
)

lazy val lib = crossProject.in(file("lib")).settings().jvmSettings(
  libraryDependencies ++= Seq(
    "org.typelevel" %% "kittens" % "1.0.0-RC0" % "test",
    "org.typelevel" %% "cats-core" % "1.0.0-MF" % "test",
    "com.chuusai" %% "shapeless" % "2.3.2" % "test"
  )
)

lazy val libJS = lib.js
lazy val libJVM = lib.jvm
