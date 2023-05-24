import { signIn, useSession } from "next-auth/react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]"

const LogIn = () => {
    const {data : session} = useSession();

    return (
      <div className="h-screen flex items-center justify-center">
        <div className="bg-white p-5 rounded-md flex flex-col items-center justify-center w-[320px]">
            <div className="flex flex-col">
                <div className="text-3xl">
                Welcome to
                </div>
                <div className="text-4xl">
                ChatbotUI!
                </div>
                <div>
                    Please login.
                </div>
            </div>
          <div className="my-5">
          <button className="w-100 my-1 w-[280px] bg-white rounded-md shadow-xl py-2" onClick={()=>signIn('google')}>Login with Google</button>
          <button className="w-100 my-1 w-[280px] bg-white rounded-md shadow-xl py-2" onClick={()=>signIn('github')}>Login with Github</button>
          </div>
        </div>
      </div>
    );
  }
export default LogIn;

export async function getServerSideProps(context: any) {
    const session = await getServerSession(
        context.req,
        context.res,
        authOptions
      );
    
    if(session){
        return {
            redirect: {
              destination: '/',
              permanent: false,
            },
          }
    } else {
        return {
            props: {
              session,
            },
          }
    }
  }