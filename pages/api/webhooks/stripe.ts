import { NextApiRequest, NextApiResponse } from 'next';

import { createClient } from '@supabase/supabase-js';
import getRawBody from 'raw-body';
import Stripe from 'stripe';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServerRoleKey = process.env.SUPABASE_SERVER_ROLE_KEY || '';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2022-11-15',
});

const updateUserAccount = async (
  userId: string | null,
  stripeSubscriptionId: string,
  upgrade: boolean,
) => {
  const supabase = createClient(supabaseUrl, supabaseServerRoleKey);

  let error = null;

  if (upgrade) {
    // Update user account
    const { error: updatedUserError } = await supabase
      .from('profiles')
      .update({
        plan: 'pro',
        stripe_subscription_id: stripeSubscriptionId,
      })
      .eq('id', userId);
    error = updatedUserError;
  } else {
    // Downgrade user account
    const { error: updatedUserError } = await supabase
      .from('profiles')
      .update({
        plan: 'free',
      })
      .eq('stripe_subscription_id', stripeSubscriptionId);
    error = updatedUserError;
  }

  if (error) throw error;

  if(upgrade){
    console.log(`User ${userId} updated to pro`);
  }else{
    console.log(`User subscription ${stripeSubscriptionId} downgrade back to free`);
  }
};

const handler = async (req: NextApiRequest, res: NextApiResponse) => {
  if (req.method === 'POST') {
    const sig = req.headers['stripe-signature'] as string;
    let event: Stripe.Event;

    // Read the raw body
    const rawBody = await getRawBody(req);

    try {
      event = stripe.webhooks.constructEvent(
        rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!,
      );
    } catch (err) {
      console.error(`Webhook signature verification failed.`, err.message);
      return res.status(400).send(`Webhook signature verification failed.`);
    }

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.client_reference_id;
      const stripeSubscriptionId = session.subscription as string;

      if (!userId || !stripeSubscriptionId) {
        throw new Error(
          'User id or subscription id not found from Stripe webhook',
        );
      }

      await updateUserAccount(userId, stripeSubscriptionId, true);
    }

    if (event.type === 'customer.subscription.deleted') {
      const session = event.data.object as Stripe.Subscription;
      const stripeSubscriptionId = session.id;

      if (!stripeSubscriptionId) {
        console.error(session);
        throw new Error('Subscription id not found from Stripe webhook');
      }

      await updateUserAccount(null, stripeSubscriptionId, false);
    }

    // Return a response to acknowledge receipt of the event
    res.json({ received: true });
  } else {
    res.setHeader('Allow', 'POST');
    res.status(405).end('Method Not Allowed');
  }
};

export const config = {
  api: {
    bodyParser: false,
  },
};

export default handler;
