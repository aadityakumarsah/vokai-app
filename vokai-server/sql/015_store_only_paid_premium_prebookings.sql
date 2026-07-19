-- Older versions created a pre-booking before payment. Keep the table limited
-- to Dodo-confirmed payments: failed or abandoned checkout rows are removed.
delete from public.vokai_premium_prebookings
where status in ('checkout_created', 'checkout_error');

create unique index if not exists vokai_premium_prebookings_unique_payment
  on public.vokai_premium_prebookings (dodo_payment_id)
  where dodo_payment_id is not null;
