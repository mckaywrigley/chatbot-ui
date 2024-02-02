# Local Development

## WebHook Testing

Most secure and simple way to test webhooks is to use the Stripe CLI. It will forward the webhook to your local server.

```bash
# after this command, you will see a webhook secret. set it as STRIPE_WEBHOOK_SIGNING_SECRET in your .env file
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

If you are using tailscale, you can use the `funnel` command to publish your local server to the internet temporarily.
You need to register an endpoint as a webhook url in the Stripe dashboard.

```bash
tailscale funnel 3000
```
