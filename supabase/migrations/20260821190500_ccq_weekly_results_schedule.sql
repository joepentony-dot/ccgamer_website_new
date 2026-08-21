-- Scheduling prerequisites. The production job itself is installed with its URL/key in Vault,
-- so no deploy credential is committed to the repository.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
