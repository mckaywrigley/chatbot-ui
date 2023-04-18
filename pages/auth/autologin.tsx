import { getCsrfToken } from 'next-auth/react';
import { useEffect, useRef } from 'react';

import type {
  GetServerSidePropsContext,
  InferGetServerSidePropsType,
} from 'next';

import { v4 } from 'uuid';

const key = 'psuedo_uid';
const loginInfoKey = 'psuedo_login_info';
interface LoginInfo {
  count: number;
  lastTime: number;
}
export default function SignIn({
  csrfToken,
}: InferGetServerSidePropsType<typeof getServerSideProps>) {
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (ref.current) {
      const uuid = localStorage.getItem(key) || v4() + '@example.com';
      const info = JSON.parse(
        localStorage.getItem(loginInfoKey) || '{"count":0, "lastTime":0}',
      ) as LoginInfo;
      const now = Math.floor(Date.now() / 1000);
      if (info.lastTime < now - 60) {
        info.count = 0;
        info.lastTime = now;
      }
      if (info.count > 5) {
        alert('Please check if NEXTAUTH_EMAIL_PATTERN permit .+@example.com');
        return;
      }
      localStorage.setItem(key, uuid);
      localStorage.setItem(loginInfoKey, JSON.stringify(info));
      const emailInput = ref.current.querySelector(
        'input[name="email"]',
      ) as HTMLInputElement;
      emailInput.value = uuid;
      ref.current.submit();
    }
  }, [ref]);
  return (
    <form ref={ref} method="post" action="/api/auth/callback/credentials">
      <input name="csrfToken" type="hidden" defaultValue={csrfToken} />
      <input name="email" type="hidden" defaultValue="" />
    </form>
  );
}

export async function getServerSideProps(context: GetServerSidePropsContext) {
  return {
    props: {
      csrfToken: await getCsrfToken(context),
    },
  };
}
