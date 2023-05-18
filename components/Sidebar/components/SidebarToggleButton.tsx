interface Props {
  onClick: any;
  side: 'left' | 'right';
  className?: string;
  isOpen: boolean;
}

export const SidebarToggleButton = ({
  onClick,
  side,
  className = '',
  isOpen,
}: Props) => {
  const size = '20px';
  return (
    <>
      <button
        className={`absolute ${
          side === 'right'
            ? 'left-0 translate-x-[-100%] tablet:!right-0 tablet:left-[unset]'
            : 'right-0 translate-x-[100%] tablet:!left-0 tablet:right-[unset]'
        } z-50 top-0 transition-all ease-linear h-9 tablet:h-10 w-10  text-neutral-700 ${className} 
          tablet:fixed tablet:top-1 tablet:!translate-x-0 flex justify-center items-center 
        `}
        onClick={onClick}
      >
        <div className={` block relative w-[20px] h-[20px] `}>
          <div
            className={` before:content-[''] before:absolute before:w-full before:h-[12%] before:bg-neutral-700 before:tablet:bg-neutral-100 before:dark:bg-white before:rounded-[20px] before:transition-all before:top-[10%] before:right-0 after:content-[''] after:absolute after:w-full after:h-[12%] after:bg-neutral-700 after:tablet:bg-neutral-100 after:dark:bg-white after:rounded-[20px] after:transition-all after:bottom-[10%] after:left-0 ${
              isOpen ? 'before:!w-0 after:!w-0' : ''
            }`}
          >
            <div
              className={` absolute flex items-center h-[20px] w-[20px] before:content-[''] before:absolute before:w-full before:h-[12%] before:bg-neutral-700 before:tablet:bg-neutral-100 before:dark:bg-white before:rounded-[20px] before:transition-all after:content-[''] after:absolute after:w-full after:h-[12%] after:bg-neutral-700 after:tablet:bg-neutral-100 after:dark:bg-white after:rounded-[20px] after:transition-all ${
                isOpen ? 'before:rotate-[135deg] after:rotate-[45deg]' : ''
              } `}
            ></div>
          </div>
        </div>
      </button>
    </>
  );
};
