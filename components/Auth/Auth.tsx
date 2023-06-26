import { useState } from "react";
import { LoginButton, LoginInput } from "./components";
import { useUser } from "@/services/authService";
import { Auth } from "aws-amplify";

const AuthScreen = ({ user }: { user: any }) => {
  const [page, setPage] = useState<string>('Log in')
  const [username, setUsername] = useState<string>('')
  const [password, setPassword] = useState<string>('')
  const [newPassword, setNewPassword] = useState<string>('')
  const [confirmationCode, setConfirmationCode] = useState<string>('')
  const [loading, setLoading] = useState<boolean>(false)
  const [error, setError] = useState<string>('')

  const { login } = useUser();

  const handleLogin = async () => {
    try {
      setLoading(true);
      await login(username, password);
      setLoading(false);
    } catch (e: any) {
      setError(e.message);
      setLoading(false);
    }
  }

  return (
    <div style={{
      width: '100%',
      height: '100%',
      position: 'absolute',
      top: 0,
      bottom: 0,
      left: 0,
      right: 0,
      margin: 'auto'
      }}
    >
      <div style={{
        width: '100%',
        height: '100%',
        alignSelf: 'center',
        paddingLeft: '20%',
        paddingRight: '20%',
        paddingTop: '20%',
        paddingBottom: '20%',
        alignContent: 'center',
        alignItems: 'center',
        }}
      >
        <h1 style={{color: '#fff', textAlign: 'center'}}>{page}</h1>
        {page === 'Log in' && (
          <div style={{display: 'flex', flexDirection: 'column'}}>
            <LoginInput
              label="Username"
              value={username}
              onChange={(e: any) => setUsername(e.target.value)}
              type="text"
            />
            <LoginInput
              label="Password"
              value={password}
              onChange={(e: any) => setPassword(e.target.value)}
              type="password"
            />
            <LoginButton
              label="Log in"
              loading={loading}
              onClick={handleLogin}
            />
            {/* TODO: RESET PASSWORD */}
            {/* <button
              className="bg-black text-white rounded-md p-2"
              onClick={() => setPage('Password reset')}
              style={{marginTop: '10px'}}
            >
              Reset Password
            </button> */}
          </div>
        )}
        {page === 'Password reset' && (
          <div style={{display: 'flex', flexDirection: 'column'}}>
            <LoginInput
              label="Username"
              value={username}
              onChange={(e: any) => setUsername(e.target.value)}
              type="text"
            />
            <LoginInput
              label="New Password"
              value={newPassword}
              onChange={(e: any) => setNewPassword(e.target.value)}
              type="password"
            />
            <LoginInput
              label="Confirmation Code"
              value={confirmationCode}
              onChange={(e: any) => setConfirmationCode(e.target.value)}
              type="text"
            />
            <LoginButton
              label="Reset password"
              loading={loading}
              onClick={() => {}}
            />
            <button
              className="bg-black text-white rounded-md p-2"
              onClick={() => setPage('Log in')}
              style={{marginTop: '10px'}}
            >
              Back to Log in
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default AuthScreen;