function normalizeProfile(row) {
  if (!row) return null;
  return Object.freeze({
    user_id: row.user_id,
    username: row.username,
    display_name: row.display_name,
    avatar_url: row.avatar_url,
    bio: row.bio,
    mode_pref: row.mode_pref,
    role: row.role,
    is_admin: row.is_admin === true,
    banned: row.banned === true,
    preferred_system: row.preferred_system,
    is_public: row.is_public === true,
    public_bio: row.public_bio,
    show_top_picks: row.show_top_picks === true,
    show_badges: row.show_badges === true,
    public_list_key: row.public_list_key,
    public_list_title: row.public_list_title,
    hall_of_fame_opt_in: row.hall_of_fame_opt_in === true,
    supporter_verified: row.supporter_verified === true,
    supporter_tier: row.supporter_tier,
    supporter_since: row.supporter_since,
    supporter_note: row.supporter_note,
    supporter_sort_order: Number(row.supporter_sort_order || 0),
    notify_weekly_challenge: row.notify_weekly_challenge !== false,
  });
}

export function createProfileStore(database) {
  return Object.freeze({
    async get(userId) {
      const result = await database.query(
        `select
           user_id,
           username,
           display_name,
           avatar_url,
           bio,
           mode_pref,
           role,
           is_admin,
           banned,
           preferred_system,
           is_public,
           public_bio,
           show_top_picks,
           show_badges,
           public_list_key,
           public_list_title,
           hall_of_fame_opt_in,
           supporter_verified,
           supporter_tier,
           supporter_since,
           supporter_note,
           supporter_sort_order,
           notify_weekly_challenge
         from ccg_profiles
         where user_id = $1`,
        [userId]
      );
      return normalizeProfile(result.rows?.[0] ?? null);
    },
  });
}
