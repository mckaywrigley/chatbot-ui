import { DocumentProps, Head, Html, Main, NextScript } from 'next/document';
// import Script from 'next/script'

import i18nextConfig from '../next-i18next.config';

type Props = DocumentProps & {
  // add custom document props
};

export default function Document(props: Props) {
  const currentLocale =
    props.__NEXT_DATA__.locale ?? i18nextConfig.i18n.defaultLocale;
  return (
    <Html lang={currentLocale}>
      <Head>
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-title" content="Chatbot UI"></meta>
        {/* <!-- Google tag (gtag.js) --> */}
        {/* <Script async src="https://www.googletagmanager.com/gtag/js?id=G-W5KW6VWGBH"></Script>
        <Script id="google-analytics">
          {
            `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
            
              gtag('config', 'G-W5KW6VWGBH');`
          }
        </Script> */}
        {/* <!-- Google Tag Manager --> */}
        {/* <Script id="google-tag-manager">
          {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
            new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
            j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
            'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
            })(window,document,'script','dataLayer','GTM-NXP873G6');
          `}</Script> */}
      </Head>
      <body>
        {/* <!-- Google Tag Manager (noscript) --> */}
        {/* <noscript>
          {`
            <iframe src="https://www.googletagmanager.com/ns.html?id=GTM-NXP873G6"
            height="0" width="0" style="display:none;visibility:hidden"></iframe>
          `}
        </noscript> */}
        {/* <!-- End Google Tag Manager (noscript) --> */}
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
