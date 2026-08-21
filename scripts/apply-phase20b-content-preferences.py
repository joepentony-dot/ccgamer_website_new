#!/usr/bin/env python3
"""Keep the bounded Member Hub notification-preference output current.

The announcement Edge Function now evolves independently. This generator owns
only the two Member Hub preference files and must never rewrite delivery code.
"""

from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def replace_once(path: Path, old: str, new: str) -> None:
    content = path.read_text(encoding="utf-8")
    if new in content:
        return
    if old not in content:
        raise SystemExit(f"Phase 20B marker not found in {path.relative_to(ROOT)}")
    path.write_text(content.replace(old, new, 1), encoding="utf-8")


def main() -> None:
    profile_js = ROOT / "resources" / "js" / "auth" / "profile-page.js"
    profile_html = ROOT / "community" / "profile.html"

    current_js = profile_js.read_text(encoding="utf-8")
    current_html = profile_html.read_text(encoding="utf-8")
    complete_markers = (
        "notify_weekly_challenge: true",
        "notifyWeeklyChallenge.checked",
        "notify_weekly_challenge: notifyWeeklyChallenge",
    )
    if all(marker in current_js for marker in complete_markers) and 'id="notifyWeeklyChallenge"' in current_html:
        print("Member Hub notification preference output is current.")
        return

    replace_once(
        profile_js,
        """    notify_new_games: false\n  };""",
        """    notify_new_games: false,\n    notify_newsletter: false\n  };""",
    )

    replace_once(
        profile_js,
        """  const notifyNewGames = document.getElementById('notifyNewGames');\n  if (notifyNewGames) notifyNewGames.checked = Boolean(profile.notify_new_games);""",
        """  const notifyNewGames = document.getElementById('notifyNewGames');\n  if (notifyNewGames) notifyNewGames.checked = Boolean(profile.notify_new_games);\n\n  const notifyNewsletter = document.getElementById('notifyNewsletter');\n  if (notifyNewsletter) notifyNewsletter.checked = Boolean(profile.notify_newsletter);""",
    )

    replace_once(
        profile_js,
        """  const notifyNewGames = Boolean(document.getElementById('notifyNewGames')?.checked);\n\n  const updates = { notify_new_games: notifyNewGames };""",
        """  const notifyNewGames = Boolean(document.getElementById('notifyNewGames')?.checked);\n  const notifyNewsletter = Boolean(document.getElementById('notifyNewsletter')?.checked);\n\n  const updates = {\n    notify_new_games: notifyNewGames,\n    notify_newsletter: notifyNewsletter\n  };""",
    )

    replace_once(
        profile_html,
        """                  <label><input type=\"checkbox\" id=\"notifyNewGames\" /> New game notifications</label>""",
        """                  <label><input type=\"checkbox\" id=\"notifyNewGames\" /> New game notifications</label>\n                  <label><input type=\"checkbox\" id=\"notifyNewsletter\" /> New CCG videos and Retro Special notifications</label>""",
    )

    replace_once(
        profile_html,
        """                  <li>Optional new-game notifications</li>""",
        """                  <li>Separate game and video notification choices</li>""",
    )

    replace_once(
        profile_html,
        """  <script type=\"module\" src=\"/resources/js/auth/profile-page.js\"></script>""",
        """  <script type=\"module\" src=\"/resources/js/auth/profile-page.js?v=phase20b-20260806\"></script>""",
    )

    replace_once(
        profile_js,
        """    notify_new_games: false,
    notify_newsletter: false
  };""",
        """    notify_new_games: false,
    notify_newsletter: false,
    notify_weekly_challenge: true
  };""",
    )

    replace_once(
        profile_js,
        """  const notifyNewsletter = document.getElementById('notifyNewsletter');
  if (notifyNewsletter) notifyNewsletter.checked = Boolean(profile.notify_newsletter);""",
        """  const notifyNewsletter = document.getElementById('notifyNewsletter');
  if (notifyNewsletter) notifyNewsletter.checked = Boolean(profile.notify_newsletter);

  const notifyWeeklyChallenge = document.getElementById('notifyWeeklyChallenge');
  if (notifyWeeklyChallenge) notifyWeeklyChallenge.checked = profile.notify_weekly_challenge !== false;""",
    )

    replace_once(
        profile_js,
        """  const notifyNewsletter = Boolean(document.getElementById('notifyNewsletter')?.checked);

  const updates = {
    notify_new_games: notifyNewGames,
    notify_newsletter: notifyNewsletter
  };""",
        """  const notifyNewsletter = Boolean(document.getElementById('notifyNewsletter')?.checked);
  const notifyWeeklyChallenge = Boolean(document.getElementById('notifyWeeklyChallenge')?.checked);

  const updates = {
    notify_new_games: notifyNewGames,
    notify_newsletter: notifyNewsletter,
    notify_weekly_challenge: notifyWeeklyChallenge
  };""",
    )

    replace_once(
        profile_html,
        """                  <label><input type="checkbox" id="notifyNewsletter" /> New CCG videos and Retro Special notifications</label>""",
        """                  <label><input type="checkbox" id="notifyNewsletter" /> New CCG videos and Retro Special notifications</label>
                  <label><input type="checkbox" id="notifyWeeklyChallenge" /> Weekly High-Score Vault results</label>""",
    )

    print("Member Hub notification preference output is current.")


if __name__ == "__main__":
    main()
