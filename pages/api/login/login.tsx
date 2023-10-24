import { signIn, useSession } from "next-auth/react";
import { getServerSession } from "next-auth/next";
import { authOptions } from "../auth/[...nextauth]"
import { /* IconBrandGoogle, IconBrandGithub,  */IconBrandOffice } from "@tabler/icons-react";
import Image from "next/image";
import mh_logo from '../../../assets/images/mh_logo.png'

const LogIn = () => {
    const {data : session} = useSession();

    return (
      <div className="h-screen flex items-center justify-center">
        <div className="bg-white p-5 rounded-md flex flex-col items-center justify-center w-[320px]">
            <div className="flex flex-col">
                {/* <div className="text-3xl">
                Welcome to
                </div>
                <div className="text-4xl">
                ChatbotUI!
                </div>
                <div>
                    Please login.
                </div> */}
                <Image
                  src={mh_logo} // Route of the image file
                  height={220} // Desired size with correct aspect ratio
                  width={220} // Desired size with correct aspect ratio
                  alt="MH Logo"
                />
            </div>
          <div className="my-5">
          {/* <button className="w-100 my-1 w-[280px] bg-white rounded-md shadow-xl py-2 flex items-center justify-center" onClick={()=>signIn('google')}><IconBrandGoogle className="mx-2"/>Login with Google </button>
          <button className="w-100 my-1 w-[280px] bg-white rounded-md shadow-xl py-2 flex items-center justify-center" onClick={()=>signIn('github')}><IconBrandGithub className="mx-2"/>Login with Github </button> */}
          <button className="w-100 my-1 w-[280px] bg-white rounded-md shadow-xl py-2 flex items-center justify-center" onClick={()=>signIn('azure-ad')}><IconBrandOffice className="mx-2"/>Login with Office 365 </button>
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