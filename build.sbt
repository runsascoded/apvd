
build(
  testDeps := Nil
)

lazy val apvd = rootProject(
  app,
      libJS,     libJVM,
    cubicJS,   cubicJVM,
  quarticJS, quarticJVM
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
    cats,
    shapeless,
    "org.hammerlab.test" ^^ "suite" ^ "1.0.0-SNAPSHOT" tests
  )
)
lazy val libJS  = lib.js
lazy val libJVM = lib.jvm

lazy val cubic = crossProject.settings(
  dep(
    shapeless,
    spire,
    "org.hammerlab.test" ^^ "suite" ^ "1.0.0-SNAPSHOT" tests,
    "org.hammerlab"      ^^ "syntax" ^ "1.0.0-SNAPSHOT"
  )
)
lazy val cubicJS  = cubic.js
lazy val cubicJVM = cubic.jvm.settings(scalajs.stubs)

lazy val quartic = crossProject.settings(
  dep(
    shapeless,
    "org.hammerlab.test" ^^ "suite" ^ "1.0.0-SNAPSHOT" tests,
    "org.hammerlab" ^^ "syntax" ^ "1.0.0-SNAPSHOT"
  )
).dependsOn(
  cubic
)
lazy val quarticJS  = quartic.js
lazy val quarticJVM = quartic.jvm
