# Supabase production authority

The Cheeky Commodore Gamer website and The Lost Sizzler use the existing Supabase project as the production source of truth for account authentication and profile data.

## Production decision

- Supabase remains the production account and profile authority.
- The Render CCG backend and PostgreSQL database are non-production migration/staging experiments only.
- No production browser page may select the experimental CCG/Render auth provider.
- Login, registration and password recovery must bootstrap the Supabase browser client.
- Existing Supabase users and profiles are not migrated away, deleted or rewritten as part of retiring the Render cut-over plan.
- Render staging data must not be treated as the source of truth.

## Lost Sizzler release model

The game itself must remain playable without a paid always-on application server. Solo, Tutorial and local 2P Split Screen are static/local gameplay modes. Online Dungeon Multiplayer, online Horde Multiplayer and Spy Vs Spy Multiplayer are not required production modes under the zero-server-cost release model.

Supabase-backed account features may remain available where they fit the free-plan architecture, but core game playability must not depend on Supabase being reachable at run time.
