-- Catalogue readers do not need elevated rights. The badge definitions they
-- expose already have read policies, so use the caller's privileges.

alter function public.get_lost_sizzler_badge_catalog() security invoker;
alter function public.get_member_badge_catalog() security invoker;
