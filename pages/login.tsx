import { signIn } from 'next-auth/react';
import { useTranslation } from 'react-i18next';

import Image from 'next/image';

import LoginButton from '@/components/Buttons/LoginButton';
import { GetServerSideProps } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './api/auth/[...nextauth]';

export default function Unauthorized() {
  const { t } = useTranslation();
  return (
    <div className="flex justify-center items-center flex-col space-y-4 w-full min-h-screen">
      <Image
        width="200"
        height="200"
        src="https://res.cloudinary.com/pgahq/image/upload/v1645527712/logo_pga.png"
        alt="logo"
      />
      <p>Welcome to PGA GPT. Login with your Okta account below.</p>
      <LoginButton handleClick={() => signIn()}>
        <div>{t('Login')}</div>
      </LoginButton>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async (props) => {
  const { req, res } = props;
  const session = await getServerSession(req, res, authOptions)
    if (session) {
      return {
        redirect: { destination: '/', permanent: false }
      }
    }

    return {
      props: {
        ...props
      }
    }
}