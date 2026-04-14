
  create policy "Allow anonymous member select"
  on "public"."ff_room_members"
  as permissive
  for select
  to anon
using (true);



