import { getServerAuth } from '@/utils/server/extensions/auth';

const auth = getServerAuth();

export default auth.apiHandler;
