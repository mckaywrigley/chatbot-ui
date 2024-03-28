import Image from "next/image"
import { ChangeEvent, FC, useState } from "react"
import { toast } from "sonner"
import { Input } from "./input"

interface ImagePickerProps {
  src: string
  image: File | null
  onSrcChange: (src: string) => void
  onImageChange: (image: File) => void
  width?: number
  height?: number
}

const ImagePicker: FC<ImagePickerProps> = ({
  src,
  image,
  onSrcChange,
  onImageChange,
  width = 200,
  height = 200
}) => {
  const [previewSrc, setPreviewSrc] = useState<string>(src)
  const [previewImage, setPreviewImage] = useState<File | null>(image)

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const file = e.target.files[0]

      if (file.size > 6000000) {
        toast.error("Image must be less than 6MB!")
        return
      }

      const url = URL.createObjectURL(file)

      const img = new window.Image()
      img.src = url

      img.onload = () => {
        const canvas = document.createElement("canvas")
        const ctx = canvas.getContext("2d")

        if (!ctx) {
          toast.error("Unable to create canvas context.")
          return
        }

        const size = Math.min(img.width, img.height)
        canvas.width = size
        canvas.height = size

        ctx.drawImage(
          img,
          (img.width - size) / 2,
          (img.height - size) / 2,
          size,
          size,
          0,
          0,
          size,
          size
        )

        const squareUrl = canvas.toDataURL()

        setPreviewSrc(squareUrl)
        setPreviewImage(file)
        onSrcChange(squareUrl)
        onImageChange(file)
      }
    }
  }

  return (
    <div>
      {previewSrc && (
        <Image
          style={{ width: `${width}px`, height: `${width}px` }}
          className="rounded-full"
          height={width}
          width={width}
          src={previewSrc}
          alt={"Image"}
        />
      )}

      <div
        role="button"
        className={`bg-pixelspace-gray-70 border-pixelspace-gray-50 focus:border-pixelspace-gray-40  text-pixelspace-gray-20 mt-1 flex h-[42px] cursor-pointer items-center rounded-sm border px-3`}
        onClick={() => document.getElementById("fileInput")?.click()}
      >
        <span className="hover:text-pixelspace-gray-3 font-['Libre Franklin'] mr-3 whitespace-nowrap text-sm font-normal leading-[25.20px]">
          Choose files
        </span>
        {!previewSrc ? (
          <span className="font-['Libre Franklin'] text-sm font-normal leading-[25.20px]">
            no filed selected
          </span>
        ) : (
          <div className="flex items-center space-x-1 overflow-hidden">
            <Image
              style={{ width: 16, height: 16 }}
              className="rounded-full  "
              height={width}
              width={width}
              src={previewSrc}
              alt={"Image"}
            />
            <div className=" flex-1">
              <span className="font-['Libre Franklin'] truncate text-sm font-normal leading-[25.20px]">
                {image?.name}
              </span>
            </div>
          </div>
        )}
      </div>
      <input
        accept="image/png, image/jpeg, image/jpg"
        type="file"
        id="fileInput"
        className={`bg-pixelspace-gray-70 border-pixelspace-gray-50 focus:border-pixelspace-gray-40 text-pixelspace-gray-20 h-[42px] border`}
        onChange={handleImageSelect}
        style={{ display: "none" }} // Hace que el cursor sea un puntero sobre el área del input
      />
    </div>
  )
}

export default ImagePicker
