import { Html, Head, Main, NextScript, DocumentProps } from 'next/document';

type Props = DocumentProps & {
  // add custom document props
};

export default function Document(props: Props) {
  return (
    <Html>
      <Head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Chatbot UI"></meta>
      </Head>
      <body>
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
