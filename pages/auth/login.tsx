// import { useContext, useState } from 'react';

// import Image from 'next/image';

// import { getAuth } from '@/utils/app/extensions/auth';

// import { Session } from 'chatbot-ui-core/types/auth';

// import Header from '@/components/Auth/Header';

// const Signin = ({
//   providers,
// }: {
//   providers: {
//     id: string;
//     name: string;
//     icon: string;
//   }[];
// }) => {
//   const [auth, setAuth] = useState<any>(getAuth());
//   const [session, setSession] = useState<Session | null>(auth.useSession());
//   const [loading, setLoading] = useState(true);

//   const client = auth.getClient();

//   return (
//     <div style={{ overflow: 'hidden', position: 'relative' }}>
//       <Header />
//       <div className="" />
//       <div className="">
//         <div className="">
//           <Image
//             src="/katalog_full.svg"
//             width="196"
//             height="64"
//             alt="App Logo"
//             style={{ height: '85px', marginBottom: '20px' }}
//           />
//           <div className="">
//             <button className="">Submit</button>
//             <hr />
//             {providers &&
//               Object.values(providers).map((provider) => (
//                 <div key={provider.name} style={{ marginBottom: 0 }}>
//                   <button
//                     onClick={async () =>
//                       auth?.signIn(
//                         client,
//                         provider.id,
//                         `${window.location.origin}/`,
//                       )
//                     }
//                   >
//                     Sign in with {provider.name}
//                   </button>
//                 </div>
//               ))}
//           </div>
//         </div>
//       </div>
//       {/* eslint-disable-next-line @next/next/no-img-element */}
//       <img src="/login_pattern.svg" alt="Pattern Background" className="" />
//     </div>
//   );
// };

// export default Signin;

// export async function getServerSideProps() {
//   const providers = getProviders();
//   return {
//     props: {
//       providers,
//     },
//   };
// }
