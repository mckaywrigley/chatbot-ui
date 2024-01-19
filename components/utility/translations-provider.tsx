"use client"

import initTranslations from "@/lib/i18n"
import { createInstance } from "i18next"
import { I18nextProvider } from "react-i18next"

export default function TranslationsProvider({
  children,
  locale,
  namespaces,
  resources
}: any) {
  const i18n = createInstance()

  initTranslations(locale, namespaces, i18n, resources)

  return <I18nextProvider i18n={i18n}>{children}</I18nextProvider>
}
