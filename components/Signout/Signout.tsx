import { signOut } from 'next-auth/react';

import { SidebarButton } from '../Sidebar/SidebarButton';

const Signout = () => {
  const signoutIcon = (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      stroke-width="1.5"
      stroke="currentColor"
      className="w-5 h-6"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75"
      />
    </svg>
  );

  return (
    <SidebarButton
      icon={signoutIcon}
      text="Sign out"
      onClick={() => signOut()}
    />
  );
};

export default Signout;
{
  /* <button
className="m-2 rounded border border-neutral-200 bg-transparent pr-2  light:text-neutral-900 dark:border-neutral-600 dark:text-white hover:bg-gray-500/10  tranistion-colors duration-200"
onClick={() => signOut()}
>
Sign out
</button> */
}
