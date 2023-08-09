import { signIn } from 'next-auth/react';
import React, { useCallback } from 'react';

import Link from 'next/link';
import { useRouter } from 'next/router';

import { message } from 'antd';
import Form from 'antd/lib/form';
import Input from 'antd/lib/input';

export const metadata = {
  title: '登陆页',
  description: '',
};

export default function SignIn() {
  const [form] = Form.useForm();
  const router = useRouter();

  const onFinish = useCallback(
    async (values) => {
      if (!values) return;
      const { email, password } = values;
      const result = await signIn('credentials', {
        username: email,
        password,
        redirect: false,
      });
      if (!result.ok) {
        message.error('请检查邮箱或密码是否填写正确');
      } else {
        message.success('登陆成功');
        router.push('/zh');
      }
      console.log('login result', result);
    },
    [router],
  );
  const onChange = useCallback(() => {}, []);

  return (
    <section className="h-screen bg-gradient-to-b from-gray-100 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="pt-32 pb-12 md:pt-40 md:pb-20">
          {/* Page header */}
          <div className="max-w-3xl mx-auto text-center pb-12 md:pb-20">
            <h1 className="h1">
              Welcome back. We exist to make entrepreneurism easier.
            </h1>
          </div>

          {/* Form */}
          <div className="max-w-sm mx-auto">
            <Form
              form={form}
              onFinish={onFinish}
              onValuesChange={onChange}
              layout="vertical"
            >
              <div className="flex flex-wrap -mx-3 mb-4">
                <div className="w-full px-3">
                  <Form.Item
                    className="block text-gray-800 text-sm font-medium mb-1"
                    name="email"
                    label="邮箱"
                    rules={[{ required: true, message: '请填写邮箱' }]}
                  >
                    <Input
                      id="email"
                      type="email"
                      className="form-input w-full text-gray-800"
                      placeholder="输入您的邮箱"
                      required
                    />
                  </Form.Item>
                </div>
              </div>
              <div className="flex flex-wrap -mx-3 mb-4">
                <div className="w-full px-3">
                  <Form.Item
                    className="block text-gray-800 text-sm font-medium mb-1"
                    name="password"
                    label="密码"
                    rules={[{ required: true, message: '请填写密码' }]}
                  >
                    {/* <Link
                        href="/reset-password"
                        className="text-sm font-medium text-blue-600 hover:underline"
                      >
                        是否无法登陆？
                      </Link> */}
                    <Input
                      id="password"
                      type="password"
                      className="form-input w-full text-gray-800"
                      placeholder="输入您的密码"
                      required
                    />
                  </Form.Item>
                </div>
              </div>
              {/* <div className="flex flex-wrap -mx-3 mb-4">
                <div className="w-full px-3">
                  <div className="flex justify-between">
                    <label className="flex items-center">
                      <input type="checkbox" className="form-checkbox" />
                      <span className="text-gray-600 ml-2">保持登陆</span>
                    </label>
                  </div>
                </div>
              </div> */}
              <div className="flex flex-wrap -mx-3 mt-6">
                <div className="w-full px-3">
                  <button className="btn text-white bg-blue-600 hover:bg-blue-700 w-full">
                    登陆
                  </button>
                </div>
              </div>
            </Form>
            {/* <div className="flex items-center my-6">
              <div
                className="border-t border-gray-300 grow mr-3"
                aria-hidden="true"
              ></div>
              <div className="text-gray-600 italic">Or</div>
              <div
                className="border-t border-gray-300 grow ml-3"
                aria-hidden="true"
              ></div>
            </div> */}
            <div className="text-gray-600 text-center mt-6">
              你还没有一个账户?{' '}
              <Link
                href="/auth/signup"
                className="text-blue-600 hover:underline transition duration-150 ease-in-out"
              >
                注册
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
