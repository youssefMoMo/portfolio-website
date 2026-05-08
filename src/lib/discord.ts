// src/lib/discord.ts

/**
 * ✅ يفتح بروفايل ديسكورد بشكل صحيح
 * يتجنب مشكلة فتح التطبيق من غير توجيه للبروفايل
 */
export const openDiscordProfile = (discordUrl: string): void => {
  try {
    // استخراج الـ User ID من الرابط
    const parts = discordUrl.split('/');
    const userId = parts[parts.length - 1];
    
    // التأكد إن ده User ID رقمي (مش invite link)
    if (userId && /^\d{17,19}$/.test(userId)) {
      const profileUrl = `https://discord.com/users/${userId}`;
      
      // ✅ افتح في نافذة جديدة مع خيارات محددة
      const newWindow = window.open(
        profileUrl,
        '_blank',
        'noopener,noreferrer,width=1200,height=800,scrollbars=yes'
      );
      
      // ✅ Fallback: لو النافذة متفتحتش (Blocked by popup blocker)
      if (!newWindow || newWindow.closed || typeof newWindow.closed === 'undefined') {
        window.location.href = profileUrl;
      }
    } else {
      // ✅ لو ده invite link أو أي رابط تاني، افتحه عادي
      window.open(discordUrl, '_blank', 'noopener,noreferrer');
    }
  } catch (error) {
    // ✅ Ultimate fallback
    window.open(discordUrl, '_blank', 'noopener,noreferrer');
  }
};

/**
 * ✅ يفتح رابط ديسكورد (دعوة أو بروفايل)
 */
export const openDiscordLink = (url: string): void => {
  window.open(url, '_blank', 'noopener,noreferrer');
};