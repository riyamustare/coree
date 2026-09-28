ALTER TABLE public.subscriptions
  DROP COLUMN IF EXISTS razorpay_order_id,
  DROP COLUMN IF EXISTS razorpay_payment_id,
  DROP COLUMN IF EXISTS razorpay_signature,
  ADD COLUMN IF NOT EXISTS dodo_subscription_id text UNIQUE,
  ADD COLUMN IF NOT EXISTS dodo_customer_id text,
  ADD COLUMN IF NOT EXISTS dodo_payment_id text;
GRANT ALL ON public.subscriptions TO service_role;