// lib/authMiddleware.js
import { verify } from 'jsonwebtoken';
import { parse } from 'cookie';

export default function authMiddleware(getServerSidePropsFunc) {
  return async (context) => {
    const { auth } = parse(context.req.headers.cookie || '');

    try {
      const decoded = verify(auth, process.env.JWT_SECRET);
      context.req.user = decoded.sub;

      return await getServerSidePropsFunc(context);
    } catch (error) {
      context.res.statusCode = 302;
      context.res.setHeader('Location', '/login'); // Redirect to the login page if not authenticated
      return { props: {} };
    }
  };
}
