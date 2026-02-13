// admin/js/login.js
// Keep login page simple: either redirect to dashboard if session exists, or show form.

document.addEventListener("DOMContentLoaded", async () => {
  console.info("[CCG-LOGIN] Initialising login page");

  // Expect your supabase client bootstrap to expose a global.
  // If yours uses a different global name, adjust here.
  const sb = window.supabase || window.__ccgSupabaseClient;

  if (!sb) {
    console.error("[CCG-LOGIN] Supabase client not found on window (expected window.supabase or window.__ccgSupabaseClient)");
    return;
  }

  try {
    const { data, error } = await sb.auth.getSession();
    if (error) console.warn("[CCG-LOGIN] Session check error:", error.message);

    if (data?.session) {
      console.info("[CCG-LOGIN] Session exists → redirecting to dashboard");
      window.location.replace("/admin/dashboard.html");
      return;
    }

    console.info("[CCG-LOGIN] No session → stay on login");
    document.body.classList.add("login-ready");
  } catch (err) {
    console.error("[CCG-LOGIN] Fatal error:", err);
  }
});