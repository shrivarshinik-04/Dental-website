import Document, { Head, Html, Main, NextScript } from 'next/document';
export default class SandBox extends Document {
  render() {
    return (
      <Html lang="en">
        <Head>
          <link rel="apple-touch-icon" sizes="180x180" href="/img/favicon/apple-touch-icon.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/img/favicon/favicon-32x32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/img/favicon/favicon-16x16.png" />
          <link rel="manifest" href="/img/favicon/site.webmanifest" />
          {/* Fonts are self-hosted via @fontsource (see _app.jsx): no third-party request on load. */}
          {/* Without JavaScript the loader overlay is never removed, so hide it. */}
          <noscript>
            <style>{'.page-loader{display:none!important}'}</style>
          </noscript>
        </Head>
        <body>
          <Main />
          <NextScript />
        </body>
      </Html>
    );
  }
}

SandBox.getInitialProps = async (ctx) => {
  const originalRenderPage = ctx.renderPage;

  ctx.renderPage = () =>
    originalRenderPage({
      enhanceApp: (App) => App,
      enhanceComponent: (Component) => Component
    });

  const initialProps = await Document.getInitialProps(ctx);
  return { ...initialProps };
};
