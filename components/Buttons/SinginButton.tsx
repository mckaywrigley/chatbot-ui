import { signIn, signOut, useSession } from 'next-auth/react';
import React, { useCallback } from 'react';

const SigninButton = () => {
  const { data: session } = useSession();
  const signedIn = session && session.user;

  const onSignInBtnClick = useCallback(() => {
    if (signedIn) signOut();
    else signIn();
  }, [signedIn]);
  return (
    <div className='flex ml-2'>
      {signedIn ? <p className='text-sky-600'>{session?.user?.name}</p> : <></>}
      <button onClick={() => onSignInBtnClick()} className="ml-2 cursor-pointer hover:opacity-50">
        {signedIn ? '退出登录' : '登陆'}
      </button>
    </div>
  )
};

export default SigninButton;