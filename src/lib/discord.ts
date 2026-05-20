// src/lib/discord.ts
//
// ✅ CENTRALIZED Discord configuration — single source of truth.
//    ALL Discord buttons/links across the site must use `openDiscord()`.
//    Never hardcode a different URL anywhere else.
// ──────────────────────────────────────────────────────────────────────

/** The canonical Discord User ID — update only here. */
export const DISCORD_USER_ID = "1077620522680057856";

/** The canonical Discord profile URL derived from the ID above. */
export const DISCORD_PROFILE_URL = `https://discord.com/users/${DISCORD_USER_ID}`;

/**
 * ✅ Opens the correct Discord profile in a new tab.
 * Use this everywhere instead of hardcoding URLs.
 */
export const openDiscord = (): void => {
  try {
    const newWindow = window.open(
      DISCORD_PROFILE_URL,
      "_blank",
      "noopener,noreferrer,width=1200,height=800,scrollbars=yes",
    );
    if (!newWindow || newWindow.closed || typeof newWindow.closed === "undefined") {
      window.location.href = DISCORD_PROFILE_URL;
    }
  } catch {
    window.open(DISCORD_PROFILE_URL, "_blank", "noopener,noreferrer");
  }
};

/**
 * @deprecated Use `openDiscord()` instead.
 * Kept for backward compatibility.
 */
export const openDiscordProfile = (_url?: string): void => {
  openDiscord();
};

/** Opens any arbitrary Discord link (invite links, etc.) */
export const openDiscordLink = (url: string): void => {
  window.open(url, "_blank", "noopener,noreferrer");
};
