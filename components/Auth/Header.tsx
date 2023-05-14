// import { useState } from 'react';

// import { getAuth } from '@/utils/app/extensions/auth';

// import { Session } from 'chatbot-ui-core/types/auth';

// // The approach used in this component shows how to build a sign in and sign out
// // component that works on pages which support both client and server side
// // rendering, and avoids any flash incorrect content on initial page load.
// export default function Header() {
//   const [auth, setAuth] = useState<any>(getAuth());
//   const [session, setSession] = useState<Session | null>(auth.useSession());
//   const [loading, setLoading] = useState(true);

//   const client = auth.getClient();

//   return (
//     <header className="">
//       <div className="">
//         <p className={`nojs-show ${!session && loading ? '' : ''}`}>
//           {session?.user && (
//             <>
//               {session.user.image && (
//                 <span
//                   style={{ backgroundImage: `url('${session.user.image}')` }}
//                   className=""
//                 />
//               )}
//               <span className="">
//                 <small>Signed in as</small>
//                 <br />
//                 <strong>{session.user.email ?? session.user.name}</strong>
//               </span>
//               <a
//                 href={`/api/auth/signout`}
//                 className=""
//                 onClick={async (e) => {
//                   e.preventDefault();
//                   await auth?.signOut(client);
//                 }}
//               >
//                 Sign out
//               </a>
//             </>
//           )}
//         </p>
//       </div>
//     </header>
//   );
// }
