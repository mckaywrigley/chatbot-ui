import { getAuth } from './utils/app/extensions/auth';

const auth = getAuth();

export default auth.middleware;

export const config = { matcher: ['/'] };
