import {DocumentProps, Head, Html, Main, NextScript} from 'next/document';

import i18nextConfig from '../next-i18next.config';
import {useTranslation} from "next-i18next";

type Props = DocumentProps & {
    // add custom document props
};

export default function Document(props: Props) {
    const {t} = useTranslation('chat');
    const currentLocale =
        props.__NEXT_DATA__.locale ?? i18nextConfig.i18n.defaultLocale;
    return (
        <Html lang={currentLocale}>
            <Head>
                <meta name="apple-mobile-web-app-capable" content="yes"/>
                <meta name="apple-mobile-web-app-title" content={t("AI Assistant") || "AI Assistant"}></meta>
            </Head>
            <body>
            <Main/>
            <NextScript/>
            </body>
        </Html>
    );
}
