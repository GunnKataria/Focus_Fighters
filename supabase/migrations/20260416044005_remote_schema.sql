
  create table "public"."ff_annotations" (
    "id" uuid not null default gen_random_uuid(),
    "presentation_id" uuid not null,
    "strokes" jsonb not null default '[]'::jsonb,
    "user_id" uuid,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."ff_annotations" enable row level security;


  create table "public"."ff_flashcard_decks" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "room_id" uuid,
    "name" text not null,
    "created_at" timestamp with time zone not null default now()
      );


alter table "public"."ff_flashcard_decks" enable row level security;


  create table "public"."ff_flashcards" (
    "id" uuid not null default gen_random_uuid(),
    "deck_id" uuid not null,
    "question" text not null,
    "answer" text not null,
    "options" jsonb not null,
    "correct_idx" integer not null
      );


alter table "public"."ff_flashcards" enable row level security;


  create table "public"."ff_library_files" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "room_id" uuid,
    "file_name" text not null,
    "file_url" text not null,
    "file_type" text not null,
    "size_bytes" bigint,
    "uploaded_at" timestamp with time zone not null default now()
      );


alter table "public"."ff_library_files" enable row level security;


  create table "public"."ff_presentations" (
    "id" uuid not null default gen_random_uuid(),
    "room_id" uuid not null,
    "file_id" uuid not null,
    "current_page" integer default 0,
    "presenter_id" uuid,
    "started_at" timestamp with time zone
      );


alter table "public"."ff_presentations" enable row level security;

CREATE UNIQUE INDEX ff_flashcard_decks_pkey ON public.ff_flashcard_decks USING btree (id);

CREATE UNIQUE INDEX ff_library_files_pkey ON public.ff_library_files USING btree (id);

CREATE UNIQUE INDEX ff_presentations_pkey ON public.ff_presentations USING btree (id);

CREATE INDEX idx_annotations_pres ON public.ff_annotations USING btree (presentation_id);

CREATE INDEX idx_decks_room ON public.ff_flashcard_decks USING btree (room_id);

CREATE INDEX idx_decks_user ON public.ff_flashcard_decks USING btree (user_id);

CREATE INDEX idx_flashcards_deck ON public.ff_flashcards USING btree (deck_id);

CREATE INDEX idx_library_files_room ON public.ff_library_files USING btree (room_id);

CREATE INDEX idx_library_files_user ON public.ff_library_files USING btree (user_id);

CREATE INDEX idx_presentations_room ON public.ff_presentations USING btree (room_id);

alter table "public"."ff_flashcard_decks" add constraint "ff_flashcard_decks_pkey" PRIMARY KEY using index "ff_flashcard_decks_pkey";

alter table "public"."ff_library_files" add constraint "ff_library_files_pkey" PRIMARY KEY using index "ff_library_files_pkey";

alter table "public"."ff_presentations" add constraint "ff_presentations_pkey" PRIMARY KEY using index "ff_presentations_pkey";

alter table "public"."ff_annotations" add constraint "ff_annotations_presentation_id_fkey" FOREIGN KEY (presentation_id) REFERENCES public.ff_presentations(id) ON DELETE CASCADE not valid;

alter table "public"."ff_annotations" validate constraint "ff_annotations_presentation_id_fkey";

alter table "public"."ff_flashcards" add constraint "ff_flashcards_correct_idx_check" CHECK (((correct_idx >= 0) AND (correct_idx < 4))) not valid;

alter table "public"."ff_flashcards" validate constraint "ff_flashcards_correct_idx_check";

alter table "public"."ff_flashcards" add constraint "ff_flashcards_deck_id_fkey" FOREIGN KEY (deck_id) REFERENCES public.ff_flashcard_decks(id) ON DELETE CASCADE not valid;

alter table "public"."ff_flashcards" validate constraint "ff_flashcards_deck_id_fkey";

alter table "public"."ff_presentations" add constraint "ff_presentations_file_id_fkey" FOREIGN KEY (file_id) REFERENCES public.ff_library_files(id) not valid;

alter table "public"."ff_presentations" validate constraint "ff_presentations_file_id_fkey";

grant delete on table "public"."ff_annotations" to "anon";

grant insert on table "public"."ff_annotations" to "anon";

grant references on table "public"."ff_annotations" to "anon";

grant select on table "public"."ff_annotations" to "anon";

grant trigger on table "public"."ff_annotations" to "anon";

grant truncate on table "public"."ff_annotations" to "anon";

grant update on table "public"."ff_annotations" to "anon";

grant delete on table "public"."ff_annotations" to "authenticated";

grant insert on table "public"."ff_annotations" to "authenticated";

grant references on table "public"."ff_annotations" to "authenticated";

grant select on table "public"."ff_annotations" to "authenticated";

grant trigger on table "public"."ff_annotations" to "authenticated";

grant truncate on table "public"."ff_annotations" to "authenticated";

grant update on table "public"."ff_annotations" to "authenticated";

grant delete on table "public"."ff_annotations" to "service_role";

grant insert on table "public"."ff_annotations" to "service_role";

grant references on table "public"."ff_annotations" to "service_role";

grant select on table "public"."ff_annotations" to "service_role";

grant trigger on table "public"."ff_annotations" to "service_role";

grant truncate on table "public"."ff_annotations" to "service_role";

grant update on table "public"."ff_annotations" to "service_role";

grant delete on table "public"."ff_flashcard_decks" to "anon";

grant insert on table "public"."ff_flashcard_decks" to "anon";

grant references on table "public"."ff_flashcard_decks" to "anon";

grant select on table "public"."ff_flashcard_decks" to "anon";

grant trigger on table "public"."ff_flashcard_decks" to "anon";

grant truncate on table "public"."ff_flashcard_decks" to "anon";

grant update on table "public"."ff_flashcard_decks" to "anon";

grant delete on table "public"."ff_flashcard_decks" to "authenticated";

grant insert on table "public"."ff_flashcard_decks" to "authenticated";

grant references on table "public"."ff_flashcard_decks" to "authenticated";

grant select on table "public"."ff_flashcard_decks" to "authenticated";

grant trigger on table "public"."ff_flashcard_decks" to "authenticated";

grant truncate on table "public"."ff_flashcard_decks" to "authenticated";

grant update on table "public"."ff_flashcard_decks" to "authenticated";

grant delete on table "public"."ff_flashcard_decks" to "service_role";

grant insert on table "public"."ff_flashcard_decks" to "service_role";

grant references on table "public"."ff_flashcard_decks" to "service_role";

grant select on table "public"."ff_flashcard_decks" to "service_role";

grant trigger on table "public"."ff_flashcard_decks" to "service_role";

grant truncate on table "public"."ff_flashcard_decks" to "service_role";

grant update on table "public"."ff_flashcard_decks" to "service_role";

grant delete on table "public"."ff_flashcards" to "anon";

grant insert on table "public"."ff_flashcards" to "anon";

grant references on table "public"."ff_flashcards" to "anon";

grant select on table "public"."ff_flashcards" to "anon";

grant trigger on table "public"."ff_flashcards" to "anon";

grant truncate on table "public"."ff_flashcards" to "anon";

grant update on table "public"."ff_flashcards" to "anon";

grant delete on table "public"."ff_flashcards" to "authenticated";

grant insert on table "public"."ff_flashcards" to "authenticated";

grant references on table "public"."ff_flashcards" to "authenticated";

grant select on table "public"."ff_flashcards" to "authenticated";

grant trigger on table "public"."ff_flashcards" to "authenticated";

grant truncate on table "public"."ff_flashcards" to "authenticated";

grant update on table "public"."ff_flashcards" to "authenticated";

grant delete on table "public"."ff_flashcards" to "service_role";

grant insert on table "public"."ff_flashcards" to "service_role";

grant references on table "public"."ff_flashcards" to "service_role";

grant select on table "public"."ff_flashcards" to "service_role";

grant trigger on table "public"."ff_flashcards" to "service_role";

grant truncate on table "public"."ff_flashcards" to "service_role";

grant update on table "public"."ff_flashcards" to "service_role";

grant delete on table "public"."ff_library_files" to "anon";

grant insert on table "public"."ff_library_files" to "anon";

grant references on table "public"."ff_library_files" to "anon";

grant select on table "public"."ff_library_files" to "anon";

grant trigger on table "public"."ff_library_files" to "anon";

grant truncate on table "public"."ff_library_files" to "anon";

grant update on table "public"."ff_library_files" to "anon";

grant delete on table "public"."ff_library_files" to "authenticated";

grant insert on table "public"."ff_library_files" to "authenticated";

grant references on table "public"."ff_library_files" to "authenticated";

grant select on table "public"."ff_library_files" to "authenticated";

grant trigger on table "public"."ff_library_files" to "authenticated";

grant truncate on table "public"."ff_library_files" to "authenticated";

grant update on table "public"."ff_library_files" to "authenticated";

grant delete on table "public"."ff_library_files" to "service_role";

grant insert on table "public"."ff_library_files" to "service_role";

grant references on table "public"."ff_library_files" to "service_role";

grant select on table "public"."ff_library_files" to "service_role";

grant trigger on table "public"."ff_library_files" to "service_role";

grant truncate on table "public"."ff_library_files" to "service_role";

grant update on table "public"."ff_library_files" to "service_role";

grant delete on table "public"."ff_presentations" to "anon";

grant insert on table "public"."ff_presentations" to "anon";

grant references on table "public"."ff_presentations" to "anon";

grant select on table "public"."ff_presentations" to "anon";

grant trigger on table "public"."ff_presentations" to "anon";

grant truncate on table "public"."ff_presentations" to "anon";

grant update on table "public"."ff_presentations" to "anon";

grant delete on table "public"."ff_presentations" to "authenticated";

grant insert on table "public"."ff_presentations" to "authenticated";

grant references on table "public"."ff_presentations" to "authenticated";

grant select on table "public"."ff_presentations" to "authenticated";

grant trigger on table "public"."ff_presentations" to "authenticated";

grant truncate on table "public"."ff_presentations" to "authenticated";

grant update on table "public"."ff_presentations" to "authenticated";

grant delete on table "public"."ff_presentations" to "service_role";

grant insert on table "public"."ff_presentations" to "service_role";

grant references on table "public"."ff_presentations" to "service_role";

grant select on table "public"."ff_presentations" to "service_role";

grant trigger on table "public"."ff_presentations" to "service_role";

grant truncate on table "public"."ff_presentations" to "service_role";

grant update on table "public"."ff_presentations" to "service_role";


  create policy "Annotations by presentation"
  on "public"."ff_annotations"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM (public.ff_presentations p
     JOIN public.ff_room_members m ON ((p.room_id = m.room_id)))
  WHERE ((p.id = ff_annotations.presentation_id) AND (m.user_id = auth.uid())))));



  create policy "Own decks"
  on "public"."ff_flashcard_decks"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));



  create policy "Room decks"
  on "public"."ff_flashcard_decks"
  as permissive
  for select
  to public
using (((room_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.ff_room_members
  WHERE ((ff_room_members.room_id = ff_flashcard_decks.room_id) AND (ff_room_members.user_id = auth.uid()))))));



  create policy "Deck flashcards"
  on "public"."ff_flashcards"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.ff_flashcard_decks d
  WHERE ((d.id = ff_flashcards.deck_id) AND ((auth.uid() = d.user_id) OR ((d.room_id IS NOT NULL) AND (EXISTS ( SELECT 1
           FROM public.ff_room_members
          WHERE ((ff_room_members.room_id = d.room_id) AND (ff_room_members.user_id = auth.uid()))))))))));



  create policy "Room members read files"
  on "public"."ff_library_files"
  as permissive
  for select
  to public
using (((room_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.ff_room_members
  WHERE ((ff_room_members.room_id = ff_library_files.room_id) AND (ff_room_members.user_id = auth.uid()))))));



  create policy "Users own files"
  on "public"."ff_library_files"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));



  create policy "Room presentations"
  on "public"."ff_presentations"
  as permissive
  for all
  to public
using ((EXISTS ( SELECT 1
   FROM public.ff_room_members
  WHERE ((ff_room_members.room_id = ff_presentations.room_id) AND (ff_room_members.user_id = auth.uid())))));



