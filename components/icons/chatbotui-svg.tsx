import Image from "next/image"
import { FC } from "react"

interface ShadowAISVGProps {
  /**
   * Retained for API compatibility. The logo PNG is a single asset that
   * works on both themes, so dark/light is a no-op here.
   */
  theme?: "dark" | "light"
  /**
   * Multiplier against the legacy 24px base, so callsites that pass
   * `scale={32 / 24}` etc. keep their intended rendered size.
   */
  scale?: number
}

/**
 * Logo mark - renders `public/shadowai-logo.png` (helix glyph, 3:4
 * portrait) inside a square slot with `object-contain` so the asset
 * keeps its native aspect ratio at any size. Replaces the old inline
 * SVG monogram while keeping the exported API stable so every existing
 * `<ShadowAISVG scale={…} />` callsite still compiles.
 */
export const ShadowAISVG: FC<ShadowAISVGProps> = ({ scale = 1 }) => {
  const size = Math.max(8, Math.round(24 * scale))
  return (
    <span
      className="relative inline-block shrink-0"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <Image
        src="/shadowai-logo.png"
        alt=""
        fill
        sizes={`${size}px`}
        className="object-contain"
        priority
      />
    </span>
  )
}
