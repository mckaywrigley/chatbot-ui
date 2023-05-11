import { PluginID } from "@/types/plugin";
import {
  addUsageEntry,
  getAdminSupabaseClient,
  getUserProfile,
} from '@/utils/server/supabase';

// Note that this function is intended to run asynchronously to avoid blocking the main thread.
// And it will fail silently if there is any error.
export const retrieveUserSessionAndLogUsages = async (
  req: Request,
  pluginId?: PluginID
) => {
  try{
    const userToken = req.headers.get('user-token');
    if(!userToken) return;

    const supabase = getAdminSupabaseClient();
    const { data, error } = await supabase.auth.getUser(userToken || '');
    if (!data || error) return;

    const user = await getUserProfile(data.user.id);
    if (!user) return;

    await addUsageEntry(pluginId || "gpt-3.5", data.user.id);
  }catch(e){
    console.log(e);
  }
}