drop extension if exists "pg_net";


  create table "public"."ff_friends" (
    "id" uuid not null default gen_random_uuid(),
    "requester_id" uuid not null,
    "addressee_id" uuid not null,
    "status" text not null default 'pending'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."ff_friends" enable row level security;


  create table "public"."ff_invites" (
    "id" uuid not null default gen_random_uuid(),
    "room_id" uuid not null,
    "from_id" uuid not null,
    "to_id" uuid not null,
    "room_code" text not null,
    "room_name" text,
    "status" text not null default 'pending'::text,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."ff_invites" enable row level security;


  create table "public"."ff_phone_sessions" (
    "id" uuid not null default gen_random_uuid(),
    "room_id" uuid not null,
    "user_id" uuid not null,
    "session_token" text not null,
    "device_id" text not null,
    "qr_code_data" text not null,
    "status" text default 'active'::text,
    "phone_locked_in" boolean default false,
    "last_heartbeat" timestamp with time zone default now(),
    "created_at" timestamp with time zone default now(),
    "expires_at" timestamp with time zone default (now() + '01:00:00'::interval)
      );


alter table "public"."ff_phone_sessions" enable row level security;


  create table "public"."ff_profiles" (
    "id" uuid not null,
    "display_name" text not null default 'Warrior'::text,
    "avatar_emoji" text default '🧙'::text,
    "photo_url" text,
    "email" text,
    "is_guest" boolean not null default false,
    "xp" integer not null default 0,
    "coins" integer not null default 0,
    "level" integer not null default 1,
    "xp_to_next" integer not null default 100,
    "created_at" timestamp with time zone not null default now(),
    "updated_at" timestamp with time zone not null default now()
      );


alter table "public"."ff_profiles" enable row level security;


  create table "public"."ff_room_members" (
    "id" uuid not null default gen_random_uuid(),
    "room_id" uuid not null,
    "user_id" uuid not null,
    "display_name" text not null default 'Warrior'::text,
    "avatar_emoji" text default '🧙'::text,
    "photo_url" text,
    "device" text default 'desktop'::text,
    "status" text not null default 'focused'::text,
    "joined_at" timestamp with time zone not null default now(),
    "phone_locked_in" boolean,
    "phone_app_switch_count" integer default 0,
    "last_phone_update" timestamp with time zone
      );


alter table "public"."ff_room_members" enable row level security;


  create table "public"."ff_rooms" (
    "id" uuid not null default gen_random_uuid(),
    "code" text not null,
    "name" text not null default 'Study Session'::text,
    "host_id" uuid not null,
    "boss" text default '🐲'::text,
    "duration" integer not null default 25,
    "status" text not null default 'waiting'::text,
    "started_at" timestamp with time zone,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."ff_rooms" enable row level security;

CREATE INDEX ff_friends_addr_idx ON public.ff_friends USING btree (addressee_id);

CREATE UNIQUE INDEX ff_friends_pkey ON public.ff_friends USING btree (id);

CREATE INDEX ff_friends_req_idx ON public.ff_friends USING btree (requester_id);

CREATE UNIQUE INDEX ff_friends_requester_id_addressee_id_key ON public.ff_friends USING btree (requester_id, addressee_id);

CREATE INDEX ff_invites_from_idx ON public.ff_invites USING btree (from_id);

CREATE UNIQUE INDEX ff_invites_pkey ON public.ff_invites USING btree (id);

CREATE INDEX ff_invites_room_idx ON public.ff_invites USING btree (room_id);

CREATE INDEX ff_invites_to_idx ON public.ff_invites USING btree (to_id, status);

CREATE UNIQUE INDEX ff_phone_sessions_pkey ON public.ff_phone_sessions USING btree (id);

CREATE UNIQUE INDEX ff_phone_sessions_room_id_user_id_key ON public.ff_phone_sessions USING btree (room_id, user_id);

CREATE UNIQUE INDEX ff_phone_sessions_session_token_key ON public.ff_phone_sessions USING btree (session_token);

CREATE INDEX ff_profiles_email_idx ON public.ff_profiles USING btree (lower(email));

CREATE UNIQUE INDEX ff_profiles_pkey ON public.ff_profiles USING btree (id);

CREATE UNIQUE INDEX ff_room_members_pkey ON public.ff_room_members USING btree (id);

CREATE UNIQUE INDEX ff_room_members_room_id_user_id_key ON public.ff_room_members USING btree (room_id, user_id);

CREATE INDEX ff_room_members_room_idx ON public.ff_room_members USING btree (room_id);

CREATE INDEX ff_room_members_user_idx ON public.ff_room_members USING btree (user_id);

CREATE INDEX ff_rooms_code_idx ON public.ff_rooms USING btree (code);

CREATE UNIQUE INDEX ff_rooms_code_key ON public.ff_rooms USING btree (code);

CREATE INDEX ff_rooms_host_idx ON public.ff_rooms USING btree (host_id);

CREATE UNIQUE INDEX ff_rooms_pkey ON public.ff_rooms USING btree (id);

CREATE INDEX idx_phone_sessions_expires_at ON public.ff_phone_sessions USING btree (expires_at);

CREATE INDEX idx_phone_sessions_room_id ON public.ff_phone_sessions USING btree (room_id);

CREATE INDEX idx_phone_sessions_token ON public.ff_phone_sessions USING btree (session_token);

CREATE INDEX idx_phone_sessions_user_id ON public.ff_phone_sessions USING btree (user_id);

alter table "public"."ff_friends" add constraint "ff_friends_pkey" PRIMARY KEY using index "ff_friends_pkey";

alter table "public"."ff_invites" add constraint "ff_invites_pkey" PRIMARY KEY using index "ff_invites_pkey";

alter table "public"."ff_phone_sessions" add constraint "ff_phone_sessions_pkey" PRIMARY KEY using index "ff_phone_sessions_pkey";

alter table "public"."ff_profiles" add constraint "ff_profiles_pkey" PRIMARY KEY using index "ff_profiles_pkey";

alter table "public"."ff_room_members" add constraint "ff_room_members_pkey" PRIMARY KEY using index "ff_room_members_pkey";

alter table "public"."ff_rooms" add constraint "ff_rooms_pkey" PRIMARY KEY using index "ff_rooms_pkey";

alter table "public"."ff_friends" add constraint "ff_friends_addressee_id_fkey" FOREIGN KEY (addressee_id) REFERENCES public.ff_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."ff_friends" validate constraint "ff_friends_addressee_id_fkey";

alter table "public"."ff_friends" add constraint "ff_friends_check" CHECK ((requester_id <> addressee_id)) not valid;

alter table "public"."ff_friends" validate constraint "ff_friends_check";

alter table "public"."ff_friends" add constraint "ff_friends_requester_id_addressee_id_key" UNIQUE using index "ff_friends_requester_id_addressee_id_key";

alter table "public"."ff_friends" add constraint "ff_friends_requester_id_fkey" FOREIGN KEY (requester_id) REFERENCES public.ff_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."ff_friends" validate constraint "ff_friends_requester_id_fkey";

alter table "public"."ff_friends" add constraint "ff_friends_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'blocked'::text]))) not valid;

alter table "public"."ff_friends" validate constraint "ff_friends_status_check";

alter table "public"."ff_invites" add constraint "ff_invites_from_id_fkey" FOREIGN KEY (from_id) REFERENCES public.ff_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."ff_invites" validate constraint "ff_invites_from_id_fkey";

alter table "public"."ff_invites" add constraint "ff_invites_room_id_fkey" FOREIGN KEY (room_id) REFERENCES public.ff_rooms(id) ON DELETE CASCADE not valid;

alter table "public"."ff_invites" validate constraint "ff_invites_room_id_fkey";

alter table "public"."ff_invites" add constraint "ff_invites_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'accepted'::text, 'declined'::text]))) not valid;

alter table "public"."ff_invites" validate constraint "ff_invites_status_check";

alter table "public"."ff_invites" add constraint "ff_invites_to_id_fkey" FOREIGN KEY (to_id) REFERENCES public.ff_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."ff_invites" validate constraint "ff_invites_to_id_fkey";

alter table "public"."ff_phone_sessions" add constraint "ff_phone_sessions_room_id_fkey" FOREIGN KEY (room_id) REFERENCES public.ff_rooms(id) ON DELETE CASCADE not valid;

alter table "public"."ff_phone_sessions" validate constraint "ff_phone_sessions_room_id_fkey";

alter table "public"."ff_phone_sessions" add constraint "ff_phone_sessions_room_id_user_id_key" UNIQUE using index "ff_phone_sessions_room_id_user_id_key";

alter table "public"."ff_phone_sessions" add constraint "ff_phone_sessions_session_token_key" UNIQUE using index "ff_phone_sessions_session_token_key";

alter table "public"."ff_phone_sessions" add constraint "ff_phone_sessions_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'disconnected'::text, 'expired'::text]))) not valid;

alter table "public"."ff_phone_sessions" validate constraint "ff_phone_sessions_status_check";

alter table "public"."ff_phone_sessions" add constraint "ff_phone_sessions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.ff_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."ff_phone_sessions" validate constraint "ff_phone_sessions_user_id_fkey";

alter table "public"."ff_profiles" add constraint "ff_profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."ff_profiles" validate constraint "ff_profiles_id_fkey";

alter table "public"."ff_room_members" add constraint "ff_room_members_room_id_fkey" FOREIGN KEY (room_id) REFERENCES public.ff_rooms(id) ON DELETE CASCADE not valid;

alter table "public"."ff_room_members" validate constraint "ff_room_members_room_id_fkey";

alter table "public"."ff_room_members" add constraint "ff_room_members_room_id_user_id_key" UNIQUE using index "ff_room_members_room_id_user_id_key";

alter table "public"."ff_room_members" add constraint "ff_room_members_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.ff_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."ff_room_members" validate constraint "ff_room_members_user_id_fkey";

alter table "public"."ff_rooms" add constraint "ff_rooms_code_key" UNIQUE using index "ff_rooms_code_key";

alter table "public"."ff_rooms" add constraint "ff_rooms_host_id_fkey" FOREIGN KEY (host_id) REFERENCES public.ff_profiles(id) ON DELETE CASCADE not valid;

alter table "public"."ff_rooms" validate constraint "ff_rooms_host_id_fkey";

alter table "public"."ff_rooms" add constraint "ff_rooms_status_check" CHECK ((status = ANY (ARRAY['waiting'::text, 'active'::text, 'finished'::text]))) not valid;

alter table "public"."ff_rooms" validate constraint "ff_rooms_status_check";

grant delete on table "public"."ff_friends" to "anon";

grant insert on table "public"."ff_friends" to "anon";

grant references on table "public"."ff_friends" to "anon";

grant select on table "public"."ff_friends" to "anon";

grant trigger on table "public"."ff_friends" to "anon";

grant truncate on table "public"."ff_friends" to "anon";

grant update on table "public"."ff_friends" to "anon";

grant delete on table "public"."ff_friends" to "authenticated";

grant insert on table "public"."ff_friends" to "authenticated";

grant references on table "public"."ff_friends" to "authenticated";

grant select on table "public"."ff_friends" to "authenticated";

grant trigger on table "public"."ff_friends" to "authenticated";

grant truncate on table "public"."ff_friends" to "authenticated";

grant update on table "public"."ff_friends" to "authenticated";

grant delete on table "public"."ff_friends" to "service_role";

grant insert on table "public"."ff_friends" to "service_role";

grant references on table "public"."ff_friends" to "service_role";

grant select on table "public"."ff_friends" to "service_role";

grant trigger on table "public"."ff_friends" to "service_role";

grant truncate on table "public"."ff_friends" to "service_role";

grant update on table "public"."ff_friends" to "service_role";

grant delete on table "public"."ff_invites" to "anon";

grant insert on table "public"."ff_invites" to "anon";

grant references on table "public"."ff_invites" to "anon";

grant select on table "public"."ff_invites" to "anon";

grant trigger on table "public"."ff_invites" to "anon";

grant truncate on table "public"."ff_invites" to "anon";

grant update on table "public"."ff_invites" to "anon";

grant delete on table "public"."ff_invites" to "authenticated";

grant insert on table "public"."ff_invites" to "authenticated";

grant references on table "public"."ff_invites" to "authenticated";

grant select on table "public"."ff_invites" to "authenticated";

grant trigger on table "public"."ff_invites" to "authenticated";

grant truncate on table "public"."ff_invites" to "authenticated";

grant update on table "public"."ff_invites" to "authenticated";

grant delete on table "public"."ff_invites" to "service_role";

grant insert on table "public"."ff_invites" to "service_role";

grant references on table "public"."ff_invites" to "service_role";

grant select on table "public"."ff_invites" to "service_role";

grant trigger on table "public"."ff_invites" to "service_role";

grant truncate on table "public"."ff_invites" to "service_role";

grant update on table "public"."ff_invites" to "service_role";

grant delete on table "public"."ff_phone_sessions" to "anon";

grant insert on table "public"."ff_phone_sessions" to "anon";

grant references on table "public"."ff_phone_sessions" to "anon";

grant select on table "public"."ff_phone_sessions" to "anon";

grant trigger on table "public"."ff_phone_sessions" to "anon";

grant truncate on table "public"."ff_phone_sessions" to "anon";

grant update on table "public"."ff_phone_sessions" to "anon";

grant delete on table "public"."ff_phone_sessions" to "authenticated";

grant insert on table "public"."ff_phone_sessions" to "authenticated";

grant references on table "public"."ff_phone_sessions" to "authenticated";

grant select on table "public"."ff_phone_sessions" to "authenticated";

grant trigger on table "public"."ff_phone_sessions" to "authenticated";

grant truncate on table "public"."ff_phone_sessions" to "authenticated";

grant update on table "public"."ff_phone_sessions" to "authenticated";

grant delete on table "public"."ff_phone_sessions" to "service_role";

grant insert on table "public"."ff_phone_sessions" to "service_role";

grant references on table "public"."ff_phone_sessions" to "service_role";

grant select on table "public"."ff_phone_sessions" to "service_role";

grant trigger on table "public"."ff_phone_sessions" to "service_role";

grant truncate on table "public"."ff_phone_sessions" to "service_role";

grant update on table "public"."ff_phone_sessions" to "service_role";

grant delete on table "public"."ff_profiles" to "anon";

grant insert on table "public"."ff_profiles" to "anon";

grant references on table "public"."ff_profiles" to "anon";

grant select on table "public"."ff_profiles" to "anon";

grant trigger on table "public"."ff_profiles" to "anon";

grant truncate on table "public"."ff_profiles" to "anon";

grant update on table "public"."ff_profiles" to "anon";

grant delete on table "public"."ff_profiles" to "authenticated";

grant insert on table "public"."ff_profiles" to "authenticated";

grant references on table "public"."ff_profiles" to "authenticated";

grant select on table "public"."ff_profiles" to "authenticated";

grant trigger on table "public"."ff_profiles" to "authenticated";

grant truncate on table "public"."ff_profiles" to "authenticated";

grant update on table "public"."ff_profiles" to "authenticated";

grant delete on table "public"."ff_profiles" to "service_role";

grant insert on table "public"."ff_profiles" to "service_role";

grant references on table "public"."ff_profiles" to "service_role";

grant select on table "public"."ff_profiles" to "service_role";

grant trigger on table "public"."ff_profiles" to "service_role";

grant truncate on table "public"."ff_profiles" to "service_role";

grant update on table "public"."ff_profiles" to "service_role";

grant delete on table "public"."ff_room_members" to "anon";

grant insert on table "public"."ff_room_members" to "anon";

grant references on table "public"."ff_room_members" to "anon";

grant select on table "public"."ff_room_members" to "anon";

grant trigger on table "public"."ff_room_members" to "anon";

grant truncate on table "public"."ff_room_members" to "anon";

grant update on table "public"."ff_room_members" to "anon";

grant delete on table "public"."ff_room_members" to "authenticated";

grant insert on table "public"."ff_room_members" to "authenticated";

grant references on table "public"."ff_room_members" to "authenticated";

grant select on table "public"."ff_room_members" to "authenticated";

grant trigger on table "public"."ff_room_members" to "authenticated";

grant truncate on table "public"."ff_room_members" to "authenticated";

grant update on table "public"."ff_room_members" to "authenticated";

grant delete on table "public"."ff_room_members" to "service_role";

grant insert on table "public"."ff_room_members" to "service_role";

grant references on table "public"."ff_room_members" to "service_role";

grant select on table "public"."ff_room_members" to "service_role";

grant trigger on table "public"."ff_room_members" to "service_role";

grant truncate on table "public"."ff_room_members" to "service_role";

grant update on table "public"."ff_room_members" to "service_role";

grant delete on table "public"."ff_rooms" to "anon";

grant insert on table "public"."ff_rooms" to "anon";

grant references on table "public"."ff_rooms" to "anon";

grant select on table "public"."ff_rooms" to "anon";

grant trigger on table "public"."ff_rooms" to "anon";

grant truncate on table "public"."ff_rooms" to "anon";

grant update on table "public"."ff_rooms" to "anon";

grant delete on table "public"."ff_rooms" to "authenticated";

grant insert on table "public"."ff_rooms" to "authenticated";

grant references on table "public"."ff_rooms" to "authenticated";

grant select on table "public"."ff_rooms" to "authenticated";

grant trigger on table "public"."ff_rooms" to "authenticated";

grant truncate on table "public"."ff_rooms" to "authenticated";

grant update on table "public"."ff_rooms" to "authenticated";

grant delete on table "public"."ff_rooms" to "service_role";

grant insert on table "public"."ff_rooms" to "service_role";

grant references on table "public"."ff_rooms" to "service_role";

grant select on table "public"."ff_rooms" to "service_role";

grant trigger on table "public"."ff_rooms" to "service_role";

grant truncate on table "public"."ff_rooms" to "service_role";

grant update on table "public"."ff_rooms" to "service_role";


  create policy "ff_friends_delete_involved"
  on "public"."ff_friends"
  as permissive
  for delete
  to authenticated
using (((auth.uid() = requester_id) OR (auth.uid() = addressee_id)));



  create policy "ff_friends_insert_self"
  on "public"."ff_friends"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = requester_id));



  create policy "ff_friends_select_involved"
  on "public"."ff_friends"
  as permissive
  for select
  to authenticated
using (((auth.uid() = requester_id) OR (auth.uid() = addressee_id)));



  create policy "ff_friends_update_involved"
  on "public"."ff_friends"
  as permissive
  for update
  to authenticated
using (((auth.uid() = requester_id) OR (auth.uid() = addressee_id)))
with check (((auth.uid() = requester_id) OR (auth.uid() = addressee_id)));



  create policy "ff_invites_delete_involved"
  on "public"."ff_invites"
  as permissive
  for delete
  to authenticated
using (((auth.uid() = from_id) OR (auth.uid() = to_id)));



  create policy "ff_invites_insert_from"
  on "public"."ff_invites"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = from_id));



  create policy "ff_invites_select_involved"
  on "public"."ff_invites"
  as permissive
  for select
  to authenticated
using (((auth.uid() = from_id) OR (auth.uid() = to_id)));



  create policy "ff_invites_update_involved"
  on "public"."ff_invites"
  as permissive
  for update
  to authenticated
using (((auth.uid() = from_id) OR (auth.uid() = to_id)))
with check (((auth.uid() = from_id) OR (auth.uid() = to_id)));



  create policy "Allow anonymous phone select"
  on "public"."ff_phone_sessions"
  as permissive
  for select
  to anon
using (true);



  create policy "Allow anonymous phone updates"
  on "public"."ff_phone_sessions"
  as permissive
  for update
  to anon
using (true);



  create policy "Users can delete their own phone sessions"
  on "public"."ff_phone_sessions"
  as permissive
  for delete
  to public
using ((user_id = auth.uid()));



  create policy "Users can insert their own phone sessions"
  on "public"."ff_phone_sessions"
  as permissive
  for insert
  to public
with check ((user_id = auth.uid()));



  create policy "Users can update their own phone sessions"
  on "public"."ff_phone_sessions"
  as permissive
  for update
  to public
using ((user_id = auth.uid()));



  create policy "Users can view their own phone sessions"
  on "public"."ff_phone_sessions"
  as permissive
  for select
  to public
using ((user_id = auth.uid()));



  create policy "ff_profiles_delete_self"
  on "public"."ff_profiles"
  as permissive
  for delete
  to authenticated
using ((auth.uid() = id));



  create policy "ff_profiles_insert_self"
  on "public"."ff_profiles"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = id));



  create policy "ff_profiles_select_all"
  on "public"."ff_profiles"
  as permissive
  for select
  to authenticated
using (true);



  create policy "ff_profiles_update_self"
  on "public"."ff_profiles"
  as permissive
  for update
  to authenticated
using ((auth.uid() = id))
with check ((auth.uid() = id));



  create policy "Allow anonymous member updates"
  on "public"."ff_room_members"
  as permissive
  for update
  to anon
using (true);



  create policy "ff_room_members_delete_self"
  on "public"."ff_room_members"
  as permissive
  for delete
  to authenticated
using (((auth.uid() = user_id) OR (EXISTS ( SELECT 1
   FROM public.ff_rooms r
  WHERE ((r.id = ff_room_members.room_id) AND (r.host_id = auth.uid()))))));



  create policy "ff_room_members_insert_self"
  on "public"."ff_room_members"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = user_id));



  create policy "ff_room_members_select_all"
  on "public"."ff_room_members"
  as permissive
  for select
  to authenticated
using (true);



  create policy "ff_room_members_update_self"
  on "public"."ff_room_members"
  as permissive
  for update
  to authenticated
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



  create policy "ff_rooms_delete_host"
  on "public"."ff_rooms"
  as permissive
  for delete
  to authenticated
using ((auth.uid() = host_id));



  create policy "ff_rooms_insert_host"
  on "public"."ff_rooms"
  as permissive
  for insert
  to authenticated
with check ((auth.uid() = host_id));



  create policy "ff_rooms_select_all"
  on "public"."ff_rooms"
  as permissive
  for select
  to authenticated
using (true);



  create policy "ff_rooms_update_host"
  on "public"."ff_rooms"
  as permissive
  for update
  to authenticated
using ((auth.uid() = host_id))
with check ((auth.uid() = host_id));



  create policy "avatars_delete_own"
  on "storage"."objects"
  as permissive
  for delete
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "avatars_read_public"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'avatars'::text));



  create policy "avatars_update_own"
  on "storage"."objects"
  as permissive
  for update
  to authenticated
using (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



  create policy "avatars_write_own"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'avatars'::text) AND ((storage.foldername(name))[1] = (auth.uid())::text)));



