
build(testDeps := Nil)

scalaVersion := "2.12.4"
scalaJSUseMainModuleInitializer := true

lazy val apvd = rootProject(app, libJS, libJVM, cubicJS, cubicJVM, testsJS, testsJVM)

lazy val app = project.settings(
  libraryDependencies ++= Seq(
    "com.github.japgolly.scalajs-react" %%% "core" % "1.1.0",
    "org.scala-js" %%% "scalajs-dom" % "0.9.1",
    "com.github.japgolly.scalacss" %%% "core" % "0.5.3"
  ),
  npmDependencies in Compile ++= Seq(
    "react" → "15.6.1",
    "react-dom" → "15.6.1"
  )
).dependsOn(
  libJS
).enablePlugins(
  ScalaJSPlugin,
  ScalaJSBundlerPlugin
)

lazy val lib = crossProject.settings(
  libraryDependencies ++= Seq(
    "org.typelevel" %%% "kittens" % "1.0.0-RC0" % "test",
    "org.typelevel" %%% "cats-core" % "1.0.0-MF" % "test",
    "com.chuusai" %%% "shapeless" % "2.3.2" % "test"
  )
)

lazy val libJS = lib.js
lazy val libJVM = lib.jvm

lazy val cubic = crossProject.settings(
  libraryDependencies ++= Seq(
    "com.chuusai" %%% "shapeless" % "2.3.2",
    "org.spire-math" %%% "spire" % "0.13.0"
  )
).dependsOn(
  tests % "test"
)

lazy val cubicJS = cubic.js
lazy val cubicJVM = cubic.jvm.settings(
  libraryDependencies += "org.scala-js" %% "scalajs-stubs" % scalaJSVersion % "provided"
)

/*
lazy val quartic = crossProject.in(file("quartic")).settings(
  libraryDependencies += "com.chuusai" %%% "shapeless" % "2.3.2"
).dependsOn(
  tests % "test"
)
lazy val quarticJS = quartic.js
lazy val quarticJVM = quartic.jvm
*/

lazy val tests = crossProject.settings(
  libraryDependencies ++= Seq(
    "org.typelevel" %%% "kittens" % "1.0.0-RC0",
    "org.typelevel" %%% "cats-core" % "1.0.0-MF",
    "com.chuusai" %%% "shapeless" % "2.3.2",
    "org.scalatest" %%% "scalatest" % "3.0.4"
  ),
  testDeps := Nil
)

lazy val testsJS = tests.js
lazy val testsJVM = tests.jvm
