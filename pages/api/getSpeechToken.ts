import {
  getAdminSupabaseClient,
  getUserProfile,
} from '@/utils/server/supabase';

const supabase = getAdminSupabaseClient();

export const config = {
  runtime: 'edge',
};

const unauthorizedResponse = new Response('Unauthorized', { status: 401 });

const handler = async (req: Request): Promise<Response> => {
  const userToken = req.headers.get('user-token');

  const { data, error } = await supabase.auth.getUser(userToken || '');
  if (!data || error) return unauthorizedResponse;

  const user = await getUserProfile(data.user.id);
  if (!user || user.plan === 'free') return unauthorizedResponse;

  const res = new Response();
  res.headers.set('Content-Type', 'application/json');
  const speechKey = process.env.AZURE_SPEECH_KEY;
  const speechRegion = process.env.AZURE_SPEECH_REGION;

  if (!speechKey || !speechRegion) {
    return new Response('No speech key or region is provided', {
      status: 400,
    });
  } else {
    const headers = {
      'Ocp-Apim-Subscription-Key': speechKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    };

    try {
      const tokenResponse = await fetch(
        `https://${speechRegion}.api.cognitive.microsoft.com/sts/v1.0/issuetoken`,
        {
          method: 'POST',
          headers: headers,
        },
      );

      if (tokenResponse.ok) {
        const token = await tokenResponse.text();
        return new Response(JSON.stringify({ token, region: speechRegion }));
      } else {
        return new Response('There was an error authorizing your speech key.', {
          status: 401,
        });
      }
    } catch (err) {
      console.error(err);
      return new Response('Unable to fetch speech token', {
        status: 401,
      });
    }
  }
};

export default handler;
