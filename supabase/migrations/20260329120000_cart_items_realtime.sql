alter table public.cart_items replica identity full;

alter publication supabase_realtime add table public.cart_items;

create index if not exists cart_items_cart_id_idx on public.cart_items (cart_id);
create index if not exists cart_items_product_id_idx on public.cart_items (product_id);
create index if not exists carts_user_id_idx on public.carts (user_id);

alter table public.cart_items enable row level security;

do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cart_items'
      and policyname = 'Users can select their own cart items'
  ) then
    create policy "Users can select their own cart items"
      on public.cart_items
      for select
      using (
        exists (
          select 1
          from public.carts
          where carts.id = cart_items.cart_id
            and carts.user_id = auth.uid()
        )
      );
  end if;
end
$$;
