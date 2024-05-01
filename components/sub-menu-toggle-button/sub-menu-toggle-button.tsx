/* eslint-disable @next/next/no-img-element  -- N/A */
export type SubMenuToggleButtonColorType = "black" | "white"

export interface SubMenuToggleButtonProps {
  color: SubMenuToggleButtonColorType
  toggled: boolean
}

export function SubMenuToggleButton(
  props: SubMenuToggleButtonProps
): JSX.Element {
  const { toggled, color } = props

  const renderIcon = toggled
    ? `/icons/arrow-up-${color}.svg`
    : `/icons/arrow-down-${color}.svg`

  return (
    <div>
      <img
        alt="Home"
        className="size-[24px] text-[#d9d9d9] 2xl:size-[24px]"
        src={renderIcon}
      />
    </div>
  )
}
