export const translations = {
  en: {
    // ... existing translations
    reviews: {
      badge: "Customer Reviews",
      title: "What People Say",
      subtitle: "See what my clients say about working with me",
      based: "Based on",
      reviewsText: "reviews",
      writeReview: "Write a Review",
      shareExperience: "Share Your Experience",
      weLoveFeedback: "We'd love to hear your feedback!",
      yourName: "Your Name",
      enterName: "Enter your name",
      yourRating: "Your Rating",
      outOf5: "out of 5 stars",
      yourReview: "Your Review",
      characters: "characters",
      submit: "Submit Review",
      ratingRequired: "Rating Required",
      selectRating: "Please select a star rating",
      nameRequired: "Name Required",
      nameMinChars: "Please enter your name (at least 2 characters)",
      reviewTooShort: "Review Too Short",
      reviewMinChars: "Please write at least 10 characters",
      submitted: "Review Submitted! 🎉",
      thankYou: "Thank you for your feedback!",
      error: "Error",
      tryAgain: "Failed to save review. Please try again.",
      noReviewsYet: "No reviews yet",
      beFirst: "Be the first to share your experience!",
      ctaTitle: "Have we worked together?",
      ctaText: "I'd love to hear your thoughts on the design process and final results.",
    },
    common: {
      cancel: "Cancel",
      save: "Save",
      loading: "Loading...",
      error: "Error",
      success: "Success",
    },
    // ... rest of translations
  },
  ar: {
    // ... existing translations
    reviews: {
      badge: "آراء العملاء",
      title: "ماذا يقول الناس",
      subtitle: "شاهد ما يقوله عملائي عن العمل معي",
      based: "بناءً على",
      reviewsText: "مراجعة",
      writeReview: "اكتب مراجعة",
      shareExperience: "شارك تجربتك",
      weLoveFeedback: "نحب أن نسمع ملاحظاتك!",
      yourName: "اسمك",
      enterName: "أدخل اسمك",
      yourRating: "تقييمك",
      outOf5: "من أصل 5 نجوم",
      yourReview: "مراجعتك",
      characters: "حرف",
      submit: "إرسال المراجعة",
      ratingRequired: "التقييم مطلوب",
      selectRating: "يرجى اختيار تقييم بالنجوم",
      nameRequired: "الاسم مطلوب",
      nameMinChars: "يرجى إدخال اسمك (حرفين على الأقل)",
      reviewTooShort: "المراجعة قصيرة جداً",
      reviewMinChars: "يرجى كتابة 10 أحرف على الأقل",
      submitted: "تم إرسال المراجعة! 🎉",
      thankYou: "شكراً لملاحظاتك!",
      error: "خطأ",
      tryAgain: "فشل في حفظ المراجعة. يرجى المحاولة مرة أخرى.",
      noReviewsYet: "لا توجد مراجعات بعد",
      beFirst: "كن أول من يشارك تجربته!",
      ctaTitle: "هل عملنا معاً؟",
      ctaText: "أحب أن أسمع أفكارك حول عملية التصميم والنتائج النهائية.",
    },
    common: {
      cancel: "إلغاء",
      save: "حفظ",
      loading: "جاري التحميل...",
      error: "خطأ",
      success: "تم بنجاح",
    },
    // ... rest of Arabic translations
  },
  es: {
    // ... existing translations
    reviews: {
      badge: "Opiniones de Clientes",
      title: "Lo Que Dicen",
      subtitle: "Mira lo que mis clientes dicen sobre trabajar conmigo",
      based: "Basado en",
      reviewsText: "reseñas",
      writeReview: "Escribir una Reseña",
      shareExperience: "Comparte Tu Experiencia",
      weLoveFeedback: "¡Nos encantaría escuchar tus comentarios!",
      yourName: "Tu Nombre",
      enterName: "Ingresa tu nombre",
      yourRating: "Tu Calificación",
      outOf5: "de 5 estrellas",
      yourReview: "Tu Reseña",
      characters: "caracteres",
      submit: "Enviar Reseña",
      ratingRequired: "Calificación Requerida",
      selectRating: "Por favor selecciona una calificación de estrellas",
      nameRequired: "Nombre Requerido",
      nameMinChars: "Por favor ingresa tu nombre (al menos 2 caracteres)",
      reviewTooShort: "Reseña Demasiado Corta",
      reviewMinChars: "Por favor escribe al menos 10 caracteres",
      submitted: "¡Reseña Enviada! 🎉",
      thankYou: "¡Gracias por tus comentarios!",
      error: "Error",
      tryAgain: "No se pudo guardar la reseña. Por favor intenta de nuevo.",
      noReviewsYet: "Aún no hay reseñas",
      beFirst: "¡Sé el primero en compartir tu experiencia!",
      ctaTitle: "¿Hemos trabajado juntos?",
      ctaText: "Me encantaría escuchar tus pensamientos sobre el proceso de diseño y los resultados finales.",
    },
    common: {
      cancel: "Cancelar",
      save: "Guardar",
      loading: "Cargando...",
      error: "Error",
      success: "Éxito",
    },
    // ... rest of Spanish translations
  },
};

// ✅ أضف المفاتيح الجديدة لـ TranslationKey
export type TranslationKey = 
  | "home.heroBadge"
  | "home.heroTitle1"
  | "home.heroTitle2"
  | "reviews.badge"
  | "reviews.title"
  | "reviews.subtitle"
  | "reviews.based"
  | "reviews.reviewsText"
  | "reviews.writeReview"
  | "reviews.shareExperience"
  | "reviews.weLoveFeedback"
  | "reviews.yourName"
  | "reviews.enterName"
  | "reviews.yourRating"
  | "reviews.outOf5"
  | "reviews.yourReview"
  | "reviews.characters"
  | "reviews.submit"
  | "reviews.ratingRequired"
  | "reviews.selectRating"
  | "reviews.nameRequired"
  | "reviews.nameMinChars"
  | "reviews.reviewTooShort"
  | "reviews.reviewMinChars"
  | "reviews.submitted"
  | "reviews.thankYou"
  | "reviews.error"
  | "reviews.tryAgain"
  | "reviews.noReviewsYet"
  | "reviews.beFirst"
  | "reviews.ctaTitle"
  | "reviews.ctaText"
  | "common.cancel"
  | "common.save"
  | "common.loading"
  | "common.error"
  | "common.success"
  // ... باقي المفاتيح القديمة
  | "btn.portfolio"
  | "btn.pricing"
  | "btn.discord"
  | "stats.projects"
  | "stats.clients"
  | "stats.rating"
  | "stats.years"
  | "cta.plan"
  | "cta.discord"
  | "portfolio.badge"
  | "portfolio.title"
  | "portfolio.subtitle"
  | "portfolio.cta"
  | "portfolio.ctaText"
  | "portfolio.discuss"
  | "pricing.badge"
  | "pricing.title"
  | "pricing.subtitle"
  | "pricing.hint"
  | "pricing.whyTitle"
  | "pricing.featured"
  | "pricing.goWith"
  | "pricing.faqTitle"
  | "pricing.stillQ"
  | "pricing.contactDiscord"
  | "games.badge"
  | "games.title"
  | "games.subtitle"
  | "games.error"
  | "games.loading"
  | "games.errorTitle"
  | "games.defaultName"
  | "games.credit"
  | "games.playNow"
  | "games.noGamesTitle"
  | "games.noGamesText"
  | "games.ctaTitle"
  | "games.ctaText"
  | "games.contactDiscord"
  | "policies.title"
  | "policies.subtitle";