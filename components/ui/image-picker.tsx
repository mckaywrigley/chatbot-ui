import { canvasPreview } from "@/lib/canvas-preview"
import { useDebounceEffect } from "@/lib/effects/use-debounce"
import Image from "next/image"
import { ChangeEvent, FC, useRef, useState } from "react"
import ReactCrop, { Crop, PixelCrop } from "react-image-crop"
import "react-image-crop/dist/ReactCrop.css"
import { toast } from "sonner"
import { Button } from "./button"
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
  const imgRef = useRef<HTMLImageElement>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const hiddenAnchorRef = useRef<HTMLAnchorElement>(null)

  const [previewSrc, setPreviewSrc] = useState<string>(src)
  const [previewImage, setPreviewImage] = useState<File | null>(image)
  const [isCropping, setIsCropping] = useState(false)
  const [crop, setCrop] = useState<Crop>({
    unit: "px",
    x: 0,
    y: 0,
    width: 100,
    height: 100
  })
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>()

  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const file = e.target.files[0]

      if (file.size > 6000000) {
        toast.error("Image must be less than 6MB!")
        return
      }

      const url = URL.createObjectURL(file)

      setPreviewSrc(url)
      setPreviewImage(file)
      setIsCropping(true)
    }
  }

  const onDownloadCropClick = () => {
    if (previewImage) {
      if (!previewCanvasRef.current) {
        throw new Error("Crop canvas does not exist")
      }

      previewCanvasRef.current.toBlob(
        blob => {
          if (!blob) {
            throw new Error("Failed to create blob")
          }

          hiddenAnchorRef.current?.click()

          const url = URL.createObjectURL(blob)

          onSrcChange(url)
          onImageChange(blob as File)
          setIsCropping(false)
          setCrop({
            unit: "px",
            x: 0,
            y: 0,
            width: 100,
            height: 100
          })
        },
        "image/jpeg",
        0.25
      )
    }
  }

  const handleCancel = () => {
    setPreviewSrc(src)
    setPreviewImage(image)
    setIsCropping(false)
    setCrop({
      unit: "px",
      x: 0,
      y: 0,
      width: 100,
      height: 100
    })
  }

  useDebounceEffect(
    async () => {
      if (
        completedCrop?.width &&
        completedCrop?.height &&
        imgRef.current &&
        previewCanvasRef.current
      ) {
        canvasPreview(imgRef.current, previewCanvasRef.current, completedCrop)
      }
    },
    100,
    [completedCrop]
  )

  return isCropping ? (
    <div>
      <ReactCrop
        crop={crop}
        onChange={setCrop}
        onComplete={setCompletedCrop}
        aspect={1}
      >
        <Image
          id="crop-image"
          ref={imgRef}
          className="rounded"
          width={width}
          height={height}
          src={previewSrc}
          alt={"Image"}
        />
      </ReactCrop>

      <div className="mt-1 flex space-x-2">
        <Button onClick={handleCancel}>Cancel</Button>
        <Button onClick={onDownloadCropClick}>Confirm</Button>
      </div>

      {!!completedCrop && (
        <>
          <div>
            <canvas
              ref={previewCanvasRef}
              style={{
                border: "1px solid black",
                objectFit: "contain",
                width: completedCrop.width,
                height: completedCrop.height,
                position: "absolute",
                top: "-200vh",
                visibility: "hidden"
              }}
            />
          </div>
          <div>
            <a
              ref={hiddenAnchorRef}
              download
              style={{
                position: "absolute",
                top: "-200vh",
                visibility: "hidden"
              }}
            >
              Hidden download
            </a>
          </div>
        </>
      )}
    </div>
  ) : (
    <div>
      {previewSrc && (
        <Image
          className="rounded"
          height={height}
          width={width}
          src={src}
          alt={"Image"}
        />
      )}

      <Input
        className="mt-1 cursor-pointer hover:opacity-50"
        type="file"
        accept="image/png, image/jpeg, image/jpg"
        onChange={handleImageSelect}
      />
    </div>
  )
}

export default ImagePicker
