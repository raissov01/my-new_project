alter table public.class_groups
  alter column join_code set default public.generate_class_join_code();
