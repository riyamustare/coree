ALTER TABLE public.subscriptions RENAME COLUMN dodo_subscription_id TO polar_subscription_id;
ALTER TABLE public.subscriptions RENAME COLUMN dodo_customer_id TO polar_customer_id;
ALTER TABLE public.subscriptions DROP COLUMN IF EXISTS dodo_payment_id;