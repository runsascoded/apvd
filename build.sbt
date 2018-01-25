
build(
  testDeps := Nil
)

lazy val apvd = rootProject(
  app,
      libJS,     libJVM,
    cubicJS,   cubicJVM,
     mathJS,    mathJVM,
  quarticJS, quarticJVM,
    testsJS,   testsJVM
)

lazy val app = project.settings(
  scalajs.react
).dependsOn(
  libJS
).enablePlugins(
  JS
)

lazy val lib = crossProject.settings(
  testDeps ++= Seq(
    cats_core,
    shapeless
  )
).dependsOn(
  tests % "test"
)
lazy val libJS  = lib.js
lazy val libJVM = lib.jvm

lazy val math    = crossProject.settings()
lazy val mathJS  = math.js
lazy val mathJVM = math.jvm

lazy val cubic = crossProject.settings(
  dep(
    shapeless,
    spire
  )
).dependsOn(
  math,
  tests % "test"
)
lazy val cubicJS  = cubic.js
lazy val cubicJVM = cubic.jvm.settings(scalajs.stubs)

lazy val quartic = crossProject.settings(
  dep(shapeless)
).dependsOn(
  cubic,
  math,
  tests % "test"
)
lazy val quarticJS  = quartic.js
lazy val quarticJVM = quartic.jvm

lazy val tests = crossProject.settings(
  dep(
    cats_core,
    scalatest,
    shapeless
  )
).dependsOn(
  math
)
lazy val testsJS  = tests.js
lazy val testsJVM = tests.jvm
