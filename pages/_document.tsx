import { Html, Head, Main, NextScript, DocumentProps } from 'next/document';
import i18nextConfig from '../next-i18next.config';

type Props = DocumentProps & {
  // add custom document props
};

export default function Document(props: Props) {
  const currentLocale =
    props.__NEXT_DATA__.locale ?? i18nextConfig.i18n.defaultLocale;

  const Inter = 'family=Inter:wght@400;700&display=swap';
  const Lexend = 'family=Lexend:wght@400;700&display=swap';
  const OpenSans = 'family=Open+Sans:wght@400;700&display=swap';
  const Roboto = 'family=Roboto:wght@400;700&display=swap';
  const Ubuntu = 'family=Ubuntu:wght@400;700&display=swap';
  return (
    <Html lang={currentLocale}>
      <Head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Chatbot UI"></meta>

        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href={`https://fonts.googleapis.com/css2?${Inter}&${Lexend}&${OpenSans}&${Roboto}&${Ubuntu}`}
          rel="stylesheet"
        />
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
