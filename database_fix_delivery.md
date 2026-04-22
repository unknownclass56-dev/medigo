# Fix Delivery Dashboard & Admin Settings

I have fixed the issue where the Active Deliveries were instantly expiring. The system was mistakenly calculating the expiration from the time the customer *placed* the order, rather than the time the pharmacy *accepted* it.

I have also added the **Delivery Partner Acceptance Window** to your Admin Settings! 

However, since we added a new custom setting, your database needs a new column to store this number.

### Action Required

Please run the following SQL snippet in your **Supabase SQL Editor**:

```sql
-- Add the custom time setting for delivery partners
ALTER TABLE public.platform_config
ADD COLUMN IF NOT EXISTS dp_accept_window_seconds INT NOT NULL DEFAULT 120;
```

Once you run this:
1. Go to your **Admin Panel -> Global Settings** and you will see the new "Delivery Partner Acceptance Window" setting.
2. The Delivery Boys' dashboard will now give them the proper amount of time to accept an order, and the countdown will correctly start *after* the pharmacy has prepared the order.
