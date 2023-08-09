import Form from 'antd/lib/form';
import Input from 'antd/lib/input';
import message from 'antd/lib/message';
import useAuthService, { ISignUpRequestProps } from '@/services/useAuthService';
import { signIn } from 'next-auth/react';

export const metadata = {
  title: '注册页',
  description: '',
}

import Link from 'next/link'
import { useCallback, useState } from 'react';

export default function SignUp() {
  const [form] = Form.useForm();
  const [passwordError, setPasswordError] = useState(false);
  const { signUp } = useAuthService();

  const onFinish = async (values: ISignUpRequestProps) => {
    if (!values) return;
    const res = await signUp(values);
    if (res.success) {
      message.success(res.message);
      try {
        await signIn('credentials', {
          username: values.email,
          password: values.password,
          redirect: true,
          callbackUrl: '/',
        });
      } catch (e) {
        message.error(e as any);
      }
    } else {
      message.error(res.message);
    }
  };
  const onChange = useCallback(() => {

  }, []);

  const compareToFirstPassword = (_: any, value: any) => {
    if (value && value !== form.getFieldValue('password')) {
      setPasswordError(true);
    } else {
      setPasswordError(false);
    }
    return Promise.resolve();
  };

  const passwordValidator = (_: any, value: any) => {
    const passwordRegex = /^(?=.*[a-zA-Z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(value)) {
      return Promise.reject('密码至少包含8个字符，且包含字母和数字');
    }
    return Promise.resolve();
  };

  return (
    <section className="h-screen bg-gradient-to-b from-gray-100 to-white">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="pt-32 pb-12 md:pt-40 md:pb-20">

          {/* Page header */}
          <div className="max-w-3xl mx-auto text-center pb-12 md:pb-20">
            <h1 className="h1">Welcome. We exist to make entrepreneurism easier.</h1>
          </div>

          {/* Form */}
          <div className="max-w-sm mx-auto">
            <Form form={form} onFinish={onFinish} onValuesChange={onChange} layout="vertical">
              <div className="flex flex-wrap -mx-3 mb-4">
                <div className="w-full px-3">
                  <Form.Item className='block text-gray-800 text-sm font-medium mb-1' name="name" label="名称" rules={[{ required: true, message: '请填写名称' }]}>
                    <Input
                      id="name"
                      type="text"
                      className="form-input w-full text-gray-800"
                      placeholder="请填写个人名称"
                      required />
                  </Form.Item>
                </div>
              </div>
              <div className="flex flex-wrap -mx-3 mb-4">
                <div className="w-full px-3">
                  <Form.Item className='block text-gray-800 text-sm font-medium mb-1' name="email" label="邮箱" rules={[{ required: true, message: '请填写邮箱' }]}>
                    <Input
                      id="email"
                      type="email"
                      className="form-input w-full text-gray-800"
                      placeholder="请填写邮箱地址"
                      required />
                  </Form.Item>
                </div>
              </div>
              <div className="flex flex-wrap -mx-3 mb-4">
                <div className="w-full px-3">
                  <Form.Item
                    className='block text-gray-800 text-sm font-medium mb-1'
                    name="password"
                    label="密码"
                    rules={[
                      { required: true, message: '请填写密码' },
                      { validator: passwordValidator }
                    ]}
                  >
                    <Input.Password
                      id="password"
                      type="password"
                      className="form-input w-full text-gray-800"
                      placeholder="请填写密码"
                      required />
                  </Form.Item>
                </div>
              </div>
              <div className="flex flex-wrap -mx-3 mb-4">
                <div className="w-full px-3">
                  <Form.Item
                    className='block text-gray-800 text-sm font-medium mb-1'
                    name="confirmPassword"
                    label="确认密码"
                    rules={[{ required: true, message: '请填写确认密码' }, { validator: compareToFirstPassword }]}
                    validateStatus={passwordError ? 'error' : ''}
                    help={passwordError && '两次填写不一致'}
                  >
                    <Input.Password
                      id="confirmPassword"
                      type="password"
                      className="form-input w-full text-gray-800"
                      placeholder="请再次填写密码"
                      required
                    />
                  </Form.Item>
                </div>
              </div>
              <div className="flex flex-wrap -mx-3 mt-6">
                <div className="w-full px-3">
                  <button key="submit" className="btn text-white bg-blue-600 hover:bg-blue-700 w-full">注册</button>
                </div>
              </div>
              <div className="text-sm text-gray-500 text-center mt-3">
                By creating an account, you agree to the <a className="underline" href="#0">terms & conditions</a>, and our <a className="underline" href="#0">privacy policy</a>.
              </div>
            </Form>
            <div className="text-gray-600 text-center mt-6">
              已经有账号? <Link href="/auth/signin" className="text-blue-600 hover:underline transition duration-150 ease-in-out">登陆</Link>
            </div>
          </div>

        </div>
      </div>
    </section>
  )
}
