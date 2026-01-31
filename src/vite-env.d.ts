/// <reference types="vite/client" />

declare module '*.module.scss' {
  const classes: { [key: string]: string }
  export default classes
}

declare module '*.scss' {
  const content: string
  export default content
}

// Worker URL imports with Vite bundling
declare module '*?worker&url' {
  const url: string
  export default url
}

declare module '*?worker' {
  const workerConstructor: new () => Worker
  export default workerConstructor
}
