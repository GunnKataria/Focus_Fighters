
  create table "public"."ff_session_history" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "room_id" uuid,
    "room_name" text not null,
    "duration_minutes" integer not null,
    "actual_seconds" integer not null,
    "squad_size" integer not null default 1,
    "victory" boolean not null default false,
    "objectives_cleared" jsonb default '[]'::jsonb,
    "xp_reward" integer not null default 0,
    "coins_reward" integer not null default 0,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."ff_session_history" enable row level security;


  create table "public"."ff_shop_items" (
    "id" text not null,
    "name" text not null,
    "type" text not null,
    "emoji" text not null,
    "price" integer not null,
    "description" text not null
      );


alter table "public"."ff_shop_items" enable row level security;


  create table "public"."ff_user_inventory" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "item_id" text not null,
    "equipped" boolean default false,
    "quantity" integer default 1,
    "purchased_at" timestamp with time zone not null default now()
      );


alter table "public"."ff_user_inventory" enable row level security;

CREATE UNIQUE INDEX ff_session_history_pkey ON public.ff_session_history USING btree (id);

CREATE UNIQUE INDEX ff_shop_items_pkey ON public.ff_shop_items USING btree (id);

CREATE UNIQUE INDEX ff_user_inventory_pkey ON public.ff_user_inventory USING btree (id);

CREATE UNIQUE INDEX ff_user_inventory_user_id_item_id_key ON public.ff_user_inventory USING btree (user_id, item_id);

CREATE INDEX idx_inventory_user ON public.ff_user_inventory USING btree (user_id);

CREATE INDEX idx_session_history_created ON public.ff_session_history USING btree (created_at DESC);

CREATE INDEX idx_session_history_user ON public.ff_session_history USING btree (user_id);

alter table "public"."ff_session_history" add constraint "ff_session_history_pkey" PRIMARY KEY using index "ff_session_history_pkey";

alter table "public"."ff_shop_items" add constraint "ff_shop_items_pkey" PRIMARY KEY using index "ff_shop_items_pkey";

alter table "public"."ff_user_inventory" add constraint "ff_user_inventory_pkey" PRIMARY KEY using index "ff_user_inventory_pkey";

alter table "public"."ff_session_history" add constraint "ff_session_history_room_id_fkey" FOREIGN KEY (room_id) REFERENCES public.ff_rooms(id) ON DELETE SET NULL not valid;

alter table "public"."ff_session_history" validate constraint "ff_session_history_room_id_fkey";

alter table "public"."ff_session_history" add constraint "ff_session_history_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.ff_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."ff_session_history" validate constraint "ff_session_history_user_id_fkey";

alter table "public"."ff_shop_items" add constraint "ff_shop_items_price_check" CHECK ((price > 0)) not valid;

alter table "public"."ff_shop_items" validate constraint "ff_shop_items_price_check";

alter table "public"."ff_shop_items" add constraint "ff_shop_items_type_check" CHECK ((type = ANY (ARRAY['skin'::text, 'consumable'::text]))) not valid;

alter table "public"."ff_shop_items" validate constraint "ff_shop_items_type_check";

alter table "public"."ff_user_inventory" add constraint "ff_user_inventory_item_id_fkey" FOREIGN KEY (item_id) REFERENCES public.ff_shop_items(id) ON DELETE CASCADE not valid;

alter table "public"."ff_user_inventory" validate constraint "ff_user_inventory_item_id_fkey";

alter table "public"."ff_user_inventory" add constraint "ff_user_inventory_quantity_check" CHECK ((quantity >= 0)) not valid;

alter table "public"."ff_user_inventory" validate constraint "ff_user_inventory_quantity_check";

alter table "public"."ff_user_inventory" add constraint "ff_user_inventory_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.ff_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."ff_user_inventory" validate constraint "ff_user_inventory_user_id_fkey";

alter table "public"."ff_user_inventory" add constraint "ff_user_inventory_user_id_item_id_key" UNIQUE using index "ff_user_inventory_user_id_item_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.buy_item(p_user_id uuid, p_item_id text)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  item_price int;
  v_result json;
BEGIN
  -- Get item price
  SELECT price INTO item_price FROM ff_shop_items WHERE id = p_item_id;
  
  IF item_price IS NULL THEN
    RETURN json_build_object('error', 'Item not found');
  END IF;
  
  -- Atomic: deduct coins + insert inventory
  UPDATE ff_profiles 
  SET coins = coins - item_price 
  WHERE id = p_user_id AND coins >= item_price;
  
  IF NOT FOUND THEN
    RETURN json_build_object('error', 'Insufficient coins');
  END IF;
  
  INSERT INTO ff_user_inventory (user_id, item_id, quantity) 
  VALUES (p_user_id, p_item_id, 1)
  ON CONFLICT (user_id, item_id) DO UPDATE SET 
    quantity = ff_user_inventory.quantity + 1;
  
  PERFORM pg_notify('inventory_updated', json_build_object('user_id', p_user_id)::text);
  
  RETURN json_build_object('success', true, 'item', p_item_id, 'price', item_price);
END;
$function$
;

grant delete on table "public"."ff_session_history" to "anon";

grant insert on table "public"."ff_session_history" to "anon";

grant references on table "public"."ff_session_history" to "anon";

grant select on table "public"."ff_session_history" to "anon";

grant trigger on table "public"."ff_session_history" to "anon";

grant truncate on table "public"."ff_session_history" to "anon";

grant update on table "public"."ff_session_history" to "anon";

grant delete on table "public"."ff_session_history" to "authenticated";

grant insert on table "public"."ff_session_history" to "authenticated";

grant references on table "public"."ff_session_history" to "authenticated";

grant select on table "public"."ff_session_history" to "authenticated";

grant trigger on table "public"."ff_session_history" to "authenticated";

grant truncate on table "public"."ff_session_history" to "authenticated";

grant update on table "public"."ff_session_history" to "authenticated";

grant delete on table "public"."ff_session_history" to "service_role";

grant insert on table "public"."ff_session_history" to "service_role";

grant references on table "public"."ff_session_history" to "service_role";

grant select on table "public"."ff_session_history" to "service_role";

grant trigger on table "public"."ff_session_history" to "service_role";

grant truncate on table "public"."ff_session_history" to "service_role";

grant update on table "public"."ff_session_history" to "service_role";

grant delete on table "public"."ff_shop_items" to "anon";

grant insert on table "public"."ff_shop_items" to "anon";

grant references on table "public"."ff_shop_items" to "anon";

grant select on table "public"."ff_shop_items" to "anon";

grant trigger on table "public"."ff_shop_items" to "anon";

grant truncate on table "public"."ff_shop_items" to "anon";

grant update on table "public"."ff_shop_items" to "anon";

grant delete on table "public"."ff_shop_items" to "authenticated";

grant insert on table "public"."ff_shop_items" to "authenticated";

grant references on table "public"."ff_shop_items" to "authenticated";

grant select on table "public"."ff_shop_items" to "authenticated";

grant trigger on table "public"."ff_shop_items" to "authenticated";

grant truncate on table "public"."ff_shop_items" to "authenticated";

grant update on table "public"."ff_shop_items" to "authenticated";

grant delete on table "public"."ff_shop_items" to "service_role";

grant insert on table "public"."ff_shop_items" to "service_role";

grant references on table "public"."ff_shop_items" to "service_role";

grant select on table "public"."ff_shop_items" to "service_role";

grant trigger on table "public"."ff_shop_items" to "service_role";

grant truncate on table "public"."ff_shop_items" to "service_role";

grant update on table "public"."ff_shop_items" to "service_role";

grant delete on table "public"."ff_user_inventory" to "anon";

grant insert on table "public"."ff_user_inventory" to "anon";

grant references on table "public"."ff_user_inventory" to "anon";

grant select on table "public"."ff_user_inventory" to "anon";

grant trigger on table "public"."ff_user_inventory" to "anon";

grant truncate on table "public"."ff_user_inventory" to "anon";

grant update on table "public"."ff_user_inventory" to "anon";

grant delete on table "public"."ff_user_inventory" to "authenticated";

grant insert on table "public"."ff_user_inventory" to "authenticated";

grant references on table "public"."ff_user_inventory" to "authenticated";

grant select on table "public"."ff_user_inventory" to "authenticated";

grant trigger on table "public"."ff_user_inventory" to "authenticated";

grant truncate on table "public"."ff_user_inventory" to "authenticated";

grant update on table "public"."ff_user_inventory" to "authenticated";

grant delete on table "public"."ff_user_inventory" to "service_role";

grant insert on table "public"."ff_user_inventory" to "service_role";

grant references on table "public"."ff_user_inventory" to "service_role";

grant select on table "public"."ff_user_inventory" to "service_role";

grant trigger on table "public"."ff_user_inventory" to "service_role";

grant truncate on table "public"."ff_user_inventory" to "service_role";

grant update on table "public"."ff_user_inventory" to "service_role";


  create policy "Users insert own session history"
  on "public"."ff_session_history"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Users view own session history"
  on "public"."ff_session_history"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



  create policy "Public read shop items"
  on "public"."ff_shop_items"
  as permissive
  for select
  to public
using (true);



  create policy "Users insert own inventory"
  on "public"."ff_user_inventory"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "Users update own inventory equipped/quantity"
  on "public"."ff_user_inventory"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "Users view own inventory"
  on "public"."ff_user_inventory"
  as permissive
  for select
  to authenticated
using ((auth.uid() = user_id));



