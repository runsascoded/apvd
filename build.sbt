
lazy val apvd = rootProject(
  app,
  libJS,
  libJVM
)

lazy val app = project.settings(
  scalajs.react,
  clearTestDeps
).dependsOn(
  libJS
).enablePlugins(
  JS
)

lazy val lib = crossProject.settings(
  dep(
    hammerlab("math", "quartic") % "1.0.0"
  ),
  testDeps ++= Seq(
    cats,
    shapeless,
    spire
  )
)
lazy val libJS  = lib.js
lazy val libJVM = lib.jvm
