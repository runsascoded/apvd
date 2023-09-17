import 'bootstrap/dist/css/bootstrap.css'
import Head from "next/head";
import {getBasePath} from "next-utils/basePath";

function MyApp({ Component, pageProps }) {
  const basePath = getBasePath()
  return (
      <>
        <Head>
          <link rel="shortcut icon" href={`${basePath}/img/screenshots/3-circles.png`} />
        </Head>
        <Component {...pageProps} />
      </>
  )
}

export default MyApp
