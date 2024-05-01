import { faChevronRight } from "@fortawesome/pro-regular-svg-icons"
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome"

const SideMenuButton = ({ onClick, isCollapsed }: any) => {
  return (
    <button
      className={`${isCollapsed ? "side-menu-button-collapsed" : "side-menu-button "}`}
      type="button"
      onClick={onClick}
    >
      <FontAwesomeIcon
        icon={faChevronRight}
        className="hover:text-pixelspace-gray-40 text-[20px]"
      />
    </button>
  )
}

export default SideMenuButton
