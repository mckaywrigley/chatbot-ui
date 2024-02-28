import { FC, useMemo } from "react"
import { AIMaskSVG } from "../icons/ai-mask-svg"
import { Button } from "../ui/button"
import { AIMaskClient } from "@ai-mask/sdk"

export const AIMaskStep: FC = () => {
  const installed = useMemo(() => AIMaskClient.isExtensionAvailable(), [])
  return (
    <div>
      <div className="flex space-x-4">
        <AIMaskSVG height={40} width={40} className="bg-white" />
        <a
          href="https://chromewebstore.google.com/detail/lkfaajachdpegnlpikpdajccldcgfdde"
          target="_blank"
          className=""
        >
          <Button disabled={installed}>
            {installed ? "Already installed" : "Install AI-Mask extension"}
          </Button>
        </a>
      </div>
      <p className="mt-4">
        AI-Mask is an extension which allows you to execute AI models right in
        your browser. Fully local, private and free!
      </p>
    </div>
  )
}
