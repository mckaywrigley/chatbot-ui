import { ShadowAISVG } from "@/components/icons/chatbotui-svg"

interface LoaderProps {
  text: String // Optional callback for New Project button click
}

export const Loader: React.FC<LoaderProps> = ({ text }) => {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-y-4 pt-12">
      {/* Inline monogram (same one used in <Brand>) - was loading the
          legacy PNG which made the spinner blink in/out on slow links. */}
      <div className="size-8 animate-spin">
        <ShadowAISVG scale={32 / 24} />
      </div>
      <p className="text-foreground text-sm font-semibold">{text}</p>
    </div>
  )
}
