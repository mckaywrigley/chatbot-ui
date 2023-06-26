import { useUser } from "@/services/authService";

export const LoginButton = (
  {
    label,
    loading,
    onClick,
  } : {
    label: string,
    loading: boolean,
    onClick: () => void
  }
) => {
  return (
    <>
      {loading ?
        <p style={{color: '#fff'}}>Loading...</p> :
        <button
          className="bg-black text-white rounded-md p-2"
          onClick={onClick}
          style={{marginTop: '10px'}}
        >
          {label}
        </button>
      }
    </>
  )
}