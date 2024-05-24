import { FilePreview } from "@/components/ui/file-preview"
import { forwardRef, ImgHTMLAttributes, useState } from "react"

const ImageWithPreview = forwardRef<
  HTMLImageElement,
  ImgHTMLAttributes<HTMLImageElement>
>(({ src, ...props }) => {
  const [showImagePreview, setShowImagePreview] = useState(false)

  return (
    <>
      <img
        onClick={() => setShowImagePreview(true)}
        className="w-1/2 rounded-md"
        src={src}
        {...props}
      />
      {showImagePreview && (
        <FilePreview
          type="image"
          item={{
            messageId: "",
            path: "",
            base64: "",
            url: src as string,
            file: null
          }}
          isOpen={showImagePreview}
          onOpenChange={(isOpen: boolean) => {
            setShowImagePreview(isOpen)
          }}
        />
      )}
    </>
  )
})

ImageWithPreview.displayName = "ImageWithPreview"

export { ImageWithPreview }
