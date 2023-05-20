import { useContext, useEffect, useState } from 'react';
import HomeContext from '@/pages/api/home/home.context';
import { LoginToken } from '@/types/token';

const FORM_BUTTON_STATUS = {
  DEFAULT: 'Log in',
  LOADING: 'Loading...',
}

const FormInput = ({labelText, inputType, inputName, maxLength, onChangeHandler}: 
  {labelText: string, inputType: string, inputName: string, maxLength: number, onChangeHandler: any}) => {

  return (
    <div className="flex flex-col my-1">
      <label className="text-gray-800 dark:text-gray-100">
        {labelText}:
      </label>
      <input 
        className="rounded-lg border bg-white border-neutral-200 bg-transparent p-2 my-1 text-black"
        type={inputType} 
        // name={inputName} 
        maxLength={maxLength}
        onChange={e => onChangeHandler(e.target.value)}
      />
    </div>
  )
}

const LoginForm = ({ children }: {children: React.ReactNode }): JSX.Element => {

  const {
    state: { loginToken },
    dispatch: homeDispatch,
    handleUpdateToken
  } = useContext(HomeContext)

  const [userName, setUserName] = useState('')
  const [password, setPassword] = useState('')
  const [formStatus, setFormStatus] = useState(FORM_BUTTON_STATUS.DEFAULT)
  const [loginError, setLoginError] = useState(false)

  // handlers

  // useEffect

  const handleSubmitLogin = async () => {

    setFormStatus(FORM_BUTTON_STATUS.LOADING)
    
    const url = 'http://0.0.0.0:8000/token'
    
    const form = new FormData()
    form.append('username', userName)
    form.append('password', password)

    const requestData = {
      method: 'POST',
      body: form,
    }

    try {
      const response = await fetch(url, requestData)

      if (response.status !== 200) {
        const errorCodeString = alert(`Error logging in (${response.status})`)
        setFormStatus(FORM_BUTTON_STATUS.DEFAULT)
        setLoginError(true)
      }

      const reader = response?.body?.getReader();

      if (!reader) {
        throw new Error('API Response body has no reader')
      }

      const stream = new ReadableStream({
        start(controller) {
          function push() {
            reader?.read().then(({ done, value}) => {
              if (done) {
                controller.close();
                return;
              }
              controller.enqueue(value);
              push();
            });
          }

          push();
        },
      })

      const responseBody = new Response(stream)
      console.log("rb", responseBody)
      const res = await responseBody.json()
      console.log("res", res)

      console.log(res)

      const fetchedToken: LoginToken = {
        access_token: res?.access_token,
        expiration: res?.expiration_delta + Date.now(),
        token_type: res?.token_type
      }
      console.log(fetchedToken, Date.now())

      handleUpdateToken(fetchedToken)
      setFormStatus(FORM_BUTTON_STATUS.DEFAULT)

    } catch (error) {
      console.error(error)
      setFormStatus(FORM_BUTTON_STATUS.DEFAULT)
      setLoginError(true)
    }
  }

  const showLoginPage = () => {
    if (loginToken) {
      return loginToken.expiration < Date.now()
    }
    return true
  }

  return (
    <div>
      {showLoginPage() && (
        <div className="absolute inset-0 m-10 mx-auto z-10 flex justify-center drop-shadow-xl items-center">
          <div className="w-40">
            {loginError && (
              <p className="text-red-500 py-3 text-lg">
                Invalid login.
              </p>
            )}
            <FormInput 
              labelText={"Username"}
              inputType={"text"}
              inputName={"username"}
              maxLength={50}
              onChangeHandler={setUserName}
            />
            <FormInput 
              labelText={"Password"}
              inputType={"password"}
              inputName={"password"}
              maxLength={50}
              onChangeHandler={setPassword}
            />
            <button
              className="h-[40px] rounded-md bg-blue-500 px-2 py-1 my-4 text-sm font-medium text-white enabled:hover:bg-blue-600 disabled:opacity-50"
              onClick={() => {
                handleSubmitLogin()
              }}
            >
              {formStatus}
            </button>
          </div>
        </div>
      )}

      <div className={showLoginPage() ? "blur-lg" : ""}>
        {children}
      </div>

    </div>
  );
};

export default LoginForm;
