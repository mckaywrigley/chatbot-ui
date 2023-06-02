"use client";

import { FormEvent, useState } from "react";
import { useUserStore } from "@/store";

import { ResponseStatus } from "@/types/typing.d";
import { useRouter } from "next/navigation";
// import Locales from "@/locales";
import { toast } from "react-hot-toast";

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // 防止表单重复 提交
  const [submitting, setSubmitting] = useState(false);
  const [updateSessionToken, updateEmail] = useUserStore((state) => [
    state.updateSessionToken,
    state.updateEmail,
  ]);

  const handleLogin = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    if (!email || !password) {
      toast("请输入邮箱密码");
      setSubmitting(false);
      return;
    }

    const res = await (
      await fetch("/api/login", {
        cache: "no-store",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      })
    ).json();

    switch (res.status) {
      case ResponseStatus.Success: {
        updateSessionToken(res.sessionToken);
        updateEmail(email);
        // toast(Locales.Index.Success(Locales.Index.Login));
        toast("login success");
        router.replace("/");
        break;
      }
      case ResponseStatus.notExist: {
        // toast(Locales.Index.NotYetRegister);
        toast("not yet register");
        break;
      }
      case ResponseStatus.wrongPassword: {
        // toast(Locales.Index.PasswordError);
        toast("password error");
        break;
      }
      default: {
        // toast(Locales.UnknownError);
        toast("unknown error");
        break;
      }
    }

    setSubmitting(false);
  };

  return (
    <>
      <div className={`flex items-center justify-center h-screen w-screen text-sm text-white dark:text-white`}>
        <form className={`w-full max-w-xs bg-[#343541] p-8 rounded-lg`} onSubmit={handleLogin}>

          <h2 className={`text-center text-2xl m-3`}>Login</h2>
          <div className={`flex flex-col mb-2`}>
            <label htmlFor="email">Email</label>
            <input
              className={`my-1 p-1 text-black`}
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className={`flex flex-col mb-4`}>
            <label htmlFor="password">Password</label>
            <input
              className={`my-1 p-1 text-black`}
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            className={`w-full px-4 py-2 mt-3 border`}
            type="submit"
            disabled={submitting}
          >
            Login
          </button>
        </form>
      </div>
    </>
  );
}
