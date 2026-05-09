// ═══════════════════════════════════════════════════════════════
// CENTRALIZED DATA FOR PORTFOLIO
// src/lib/data.ts
// Last Updated: 2026
// ═══════════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════════
// TYPE DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export interface Review {
  id: number;
  name: string;
  rating: number;
  text: string;
  project_type: string;
  date: string;
  verified: boolean;
  avatar?: string;
}

export interface Stat {
  id: number;
  title: string;
  value: string;
  icon: string;
  image?: string;
}

export interface Tool {
  id: number;
  name: string;
  icon: string;
  logo?: string;
}

export interface PortfolioItem {
  id: number;
  title: string;
  image: string;
  category: string;
}

export interface PricingPlan {
  id: number;
  name: string;
  price_usd: string;
  price_robux: string;
  frames: string;
  features: string[];
  featured?: boolean;
  icon?: string;
}

export interface Policy {
  id: number;
  title: string;
  description: string;
  icon: string;
}

export interface Game {
  id: number;
  placeId: string;
  name: string;
  visits: string;
  icon: string;
}

export interface FAQ {
  id: number;
  question: string;
  answer: string;
}

export interface Profile {
  name: string;
  title: string;
  discord: string;
  discordId: string;
  portfolioItems: PortfolioItem[];
}

export type TranslationKey = 
  | "nav.home" | "nav.portfolio" | "nav.games" | "nav.pricing" | "nav.reviews" | "nav.policies"
  | "btn.portfolio" | "btn.pricing" | "btn.discord" | "btn.contact" | "btn.hire"
  | "hero.badge" | "hero.title1" | "hero.title2" | "hero.subtitle"
  | "stats.projects" | "stats.clients" | "stats.rating" | "stats.years"
  | "cta.title" | "cta.subtitle" | "cta.plan" | "cta.discord"
  | "portfolio.badge" | "portfolio.title" | "portfolio.subtitle" | "portfolio.cta" | "portfolio.ctaText" | "portfolio.discuss"
  | "pricing.badge" | "pricing.title" | "pricing.subtitle" | "pricing.hint" | "pricing.featured" | "pricing.goWith" | "pricing.whyTitle" | "pricing.faqTitle" | "pricing.stillQ" | "pricing.contactDiscord"
  | "reviews.badge" | "reviews.title" | "reviews.subtitle" | "reviews.based" | "reviews.reviewsText" | "reviews.ctaTitle" | "reviews.ctaText" | "reviews.writeReview"
  | "policies.badge" | "policies.title" | "policies.subtitle" | "policies.questionsTitle" | "policies.askDiscord" | "policies.contactDiscord" | "policies.noPolicies"
  | "games.badge" | "games.title" | "games.subtitle" | "games.loading" | "games.error" | "games.errorTitle" | "games.retry" | "games.reload" | "games.defaultName" | "games.credit" | "games.playNow" | "games.noGamesTitle" | "games.noGamesText" | "games.ctaTitle" | "games.ctaText" | "games.contactDiscord"
  | "admin.panelTitle" | "admin.discordStepDesc" | "admin.passwordStepDesc" | "admin.discordIdLabel" | "admin.discordIdHelp" | "admin.verifyDiscord" | "admin.passwordLabel" | "admin.passwordPlaceholder" | "admin.showPassword" | "admin.hidePassword" | "admin.login" | "admin.changeDiscordId" | "admin.devNotice" | "admin.verifiedTitle" | "admin.discordIdMasked" | "admin.goToDashboard" | "admin.logout" | "admin.invalidIdTitle" | "admin.invalidIdDesc" | "admin.notRegisteredTitle" | "admin.notRegisteredDesc" | "admin.verifiedDesc" | "admin.errorTitle" | "admin.errorDesc" | "admin.loginSuccessTitle" | "admin.loginSuccessDesc" | "admin.wrongPasswordTitle" | "admin.wrongPasswordDesc" | "admin.logoutTitle" | "admin.logoutDesc"
  | "notFound.message" | "notFound.description" | "notFound.goHome"
  | "footer.tagline" | "footer.role" | "footer.transform" | "footer.follow" | "footer.rights"
  | "loading" | "error" | "success" | "cancel" | "save" | "delete" | "edit" | "add" | "close" | "submit";

export type Language = 'en' | 'ar' | 'es';

export type Translations = Record<Language, Record<TranslationKey, string>>;

// ═══════════════════════════════════════════════════════════════
// TRANSLATIONS
// ═══════════════════════════════════════════════════════════════

export const translations: Translations = {
  en: {
    // Navigation
    "nav.home": "Home",
    "nav.portfolio": "Portfolio",
    "nav.games": "Games",
    "nav.pricing": "Pricing",
    "nav.reviews": "Reviews",
    "nav.policies": "Policies",
    
    // Buttons
    "btn.portfolio": "View Portfolio",
    "btn.pricing": "See Pricing",
    "btn.discord": "Join Discord",
    "btn.contact": "Contact Me",
    "btn.hire": "Hire Me",
    
    // Hero Section
    "hero.badge": "Available for Projects",
    "hero.title1": "Crafting Immersive",
    "hero.title2": "User Interfaces",
    "hero.subtitle": "Crafting immersive and high-quality user interfaces for your Roblox experiences.",
    
    // Stats
    "stats.projects": "Projects",
    "stats.clients": "Clients",
    "stats.rating": "Rating",
    "stats.years": "Years Experience",
    
    // CTA Section
    "cta.title": "Ready to Transform Your Game?",
    "cta.subtitle": "Elevate your Roblox experience with premium, professional UI design that players love.",
    "cta.plan": "Choose a Plan",
    "cta.discord": "Contact on Discord",
    
    // Portfolio Page
    "portfolio.badge": "My Work",
    "portfolio.title": "Featured Designs",
    "portfolio.subtitle": "Explore my collection of UI/UX designs for Roblox games and applications",
    "portfolio.cta": "Want to Work Together?",
    "portfolio.ctaText": "Let's create something amazing together. Get in touch and let's discuss your project.",
    "portfolio.discuss": "Discuss Your Project",
    
    // Pricing Page
    "pricing.badge": "Pricing Plans",
    "pricing.title": "Simple, Transparent Pricing",
    "pricing.subtitle": "Choose the perfect plan for your needs",
    "pricing.hint": "All plans include high-quality designs, source files, and professional support. Payment can be made via PayPal or Robux.",
    "pricing.featured": "Most Popular",
    "pricing.goWith": "Get Started",
    "pricing.whyTitle": "Why Choose Me?",
    "pricing.faqTitle": "Frequently Asked Questions",
    "pricing.stillQ": "Still Have Questions?",
    "pricing.contactDiscord": "Contact on Discord",
    
    // Reviews Page
    "reviews.badge": "Testimonials",
    "reviews.title": "Latest Reviews",
    "reviews.subtitle": "See what my clients say about working with me",
    "reviews.based": "based on",
    "reviews.reviewsText": "reviews",
    "reviews.ctaTitle": "Have we worked together?",
    "reviews.ctaText": "I'd love to hear your thoughts on the design process and final results.",
    "reviews.writeReview": "Write a Review",
    
    // Policies Page
    "policies.badge": "Legal",
    "policies.title": "Policies & Terms",
    "policies.subtitle": "Understand my working policies and terms",
    "policies.questionsTitle": "Have Questions?",
    "policies.askDiscord": "Ask on Discord",
    "policies.contactDiscord": "Contact on Discord",
    "policies.noPolicies": "No policies added yet. Add policies from the admin dashboard.",
    
    // Games Page
    "games.badge": "Live Games",
    "games.title": "Games I Designed UI For",
    "games.subtitle": "Explore some of the successful Roblox experiences featuring my custom user interfaces.",
    "games.loading": "Loading games...",
    "games.error": "An error occurred while loading games",
    "games.errorTitle": "Error Loading Games",
    "games.retry": "Try Again",
    "games.reload": "Reload Page",
    "games.defaultName": "Game",
    "games.credit": "UI/UX Design by Youssef Design",
    "games.playNow": "Play Now",
    "games.noGamesTitle": "No Games Found",
    "games.noGamesText": "Check back later for updates",
    "games.ctaTitle": "Want Your Game Featured Here?",
    "games.ctaText": "Upgrade your game's interface to increase player retention and monetization.",
    "games.contactDiscord": "Let's Talk Design",
    
    // Admin Pages
    "admin.panelTitle": "Admin Panel",
    "admin.discordStepDesc": "Enter your Discord ID to continue",
    "admin.passwordStepDesc": "Enter your password to access the admin panel",
    "admin.discordIdLabel": "Discord ID",
    "admin.discordIdHelp": "Enter your 17-18 digit Discord User ID",
    "admin.verifyDiscord": "Verify Discord ID",
    "admin.passwordLabel": "Password",
    "admin.passwordPlaceholder": "Enter password",
    "admin.showPassword": "Show password",
    "admin.hidePassword": "Hide password",
    "admin.login": "Login",
    "admin.changeDiscordId": "Change Discord ID",
    "admin.devNotice": "Development mode - Default credentials:",
    "admin.verifiedTitle": "Verified Successfully",
    "admin.discordIdMasked": "Discord ID:",
    "admin.goToDashboard": "Go to Dashboard",
    "admin.logout": "Logout",
    "admin.invalidIdTitle": "Invalid Discord ID",
    "admin.invalidIdDesc": "Please enter a valid 17-18 digit Discord ID",
    "admin.notRegisteredTitle": "Not Registered",
    "admin.notRegisteredDesc": "This Discord ID is not registered as an admin",
    "admin.verifiedDesc": "Please enter your password to continue",
    "admin.errorTitle": "Error",
    "admin.errorDesc": "An error occurred. Please try again.",
    "admin.loginSuccessTitle": "Login Successful",
    "admin.loginSuccessDesc": "Welcome to the Admin Dashboard",
    "admin.wrongPasswordTitle": "Incorrect Password",
    "admin.wrongPasswordDesc": "Please try again",
    "admin.logoutTitle": "Logged Out",
    "admin.logoutDesc": "You have been successfully logged out",
    
    // Not Found Page
    "notFound.message": "Page not found",
    "notFound.description": "The page you're looking for doesn't exist or has been moved.",
    "notFound.goHome": "Go Home",
    
    // Footer
    "footer.tagline": "Crafting digital experiences for the next generation of gaming.",
    "footer.role": "Professional Roblox UI/UX Designer",
    "footer.transform": "Transforming ideas into immersive experiences",
    "footer.follow": "Follow Me",
    "footer.rights": "Youssef Design. All rights reserved.",
    
    // Common
    "loading": "Loading...",
    "error": "Error",
    "success": "Success",
    "cancel": "Cancel",
    "save": "Save",
    "delete": "Delete",
    "edit": "Edit",
    "add": "Add",
    "close": "Close",
    "submit": "Submit"
  },
  
  ar: {
    // Navigation
    "nav.home": "الرئيسية",
    "nav.portfolio": "أعمالي",
    "nav.games": "الألعاب",
    "nav.pricing": "الأسعار",
    "nav.reviews": "التقييمات",
    "nav.policies": "الشروط",
    
    // Buttons
    "btn.portfolio": "شاهد أعمالي",
    "btn.pricing": "شاهد الأسعار",
    "btn.discord": "انضم للديسكورد",
    "btn.contact": "تواصل معي",
    "btn.hire": "وظفني",
    
    // Hero Section
    "hero.badge": "متاح للمشاريع",
    "hero.title1": "أصمم واجهات",
    "hero.title2": "تفاعلية احترافية",
    "hero.subtitle": "أصمم واجهات مستخدم غامرة وعالية الجودة لتجارب Roblox الخاصة بك.",
    
    // Stats
    "stats.projects": "المشاريع",
    "stats.clients": "العملاء",
    "stats.rating": "التقييم",
    "stats.years": "سنوات الخبرة",
    
    // CTA Section
    "cta.title": "هل أنت جاهز لتطوير لعبتك؟",
    "cta.subtitle": "ارتقِ بتجربة Roblox الخاصة بك مع تصميم UI احترافي ومتميز يحبه اللاعبون.",
    "cta.plan": "اختر الخطة",
    "cta.discord": "تواصل على ديسكورد",
    
    // Portfolio Page
    "portfolio.badge": "أعمالي",
    "portfolio.title": "تصاميم مميزة",
    "portfolio.subtitle": "استكشف مجموعتي من تصاميم UI/UX لألعاب وتطبيقات Roblox",
    "portfolio.cta": "هل تريد العمل معاً؟",
    "portfolio.ctaText": "لنصنع شيئاً مذهلاً معاً. تواصل معي ودعنا نناقش مشروعك.",
    "portfolio.discuss": "ناقش مشروعك",
    
    // Pricing Page
    "pricing.badge": "خطط الأسعار",
    "pricing.title": "أسعار بسيطة وواضحة",
    "pricing.subtitle": "اختر الخطة المثالية لاحتياجاتك",
    "pricing.hint": "جميع الخطط تتضمن تصاميم عالية الجودة، الملفات المصدرية، ودعم احترافي. يمكن الدفع عبر PayPal أو Robux.",
    "pricing.featured": "الأكثر شعبية",
    "pricing.goWith": "ابدأ الآن",
    "pricing.whyTitle": "لماذا تختارني؟",
    "pricing.faqTitle": "الأسئلة الشائعة",
    "pricing.stillQ": "هل لا تزال لديك أسئلة؟",
    "pricing.contactDiscord": "تواصل على ديسكورد",
    
    // Reviews Page
    "reviews.badge": "شهادات العملاء",
    "reviews.title": "أحدث التقييمات",
    "reviews.subtitle": "شاهد ما يقوله عملائي عن العمل معي",
    "reviews.based": "بناءً على",
    "reviews.reviewsText": "تقييم",
    "reviews.ctaTitle": "هل عملنا معاً؟",
    "reviews.ctaText": "يسعدني سماع أفكارك عن عملية التصميم والنتائج النهائية.",
    "reviews.writeReview": "اكتب تقييمك",
    
    // Policies Page
    "policies.badge": "قانوني",
    "policies.title": "الشروط والأحكام",
    "policies.subtitle": "افهم سياسات وشروط عملي",
    "policies.questionsTitle": "هل لديك أسئلة؟",
    "policies.askDiscord": "اسأل على ديسكورد",
    "policies.contactDiscord": "تواصل على ديسكورد",
    "policies.noPolicies": "لم تتم إضافة أي سياسات بعد. أضف سياسات من لوحة التحكم.",
    
    // Games Page
    "games.badge": "الألعاب المباشرة",
    "games.title": "ألعاب صممت واجهاتها",
    "games.subtitle": "استكشف بعض تجارب Roblox الناجحة التي تتميز بواجهات المستخدم المخصصة التي صممتها.",
    "games.loading": "جاري تحميل الألعاب...",
    "games.error": "حدث خطأ أثناء تحميل الألعاب",
    "games.errorTitle": "خطأ في تحميل الألعاب",
    "games.retry": "حاول مرة أخرى",
    "games.reload": "إعادة تحميل الصفحة",
    "games.defaultName": "لعبة",
    "games.credit": "تصميم واجهة المستخدم بواسطة يوسف ديزاين",
    "games.playNow": "العب الآن",
    "games.noGamesTitle": "لم يتم العثور على ألعاب",
    "games.noGamesText": "تحقق لاحقاً للحصول على تحديثات",
    "games.ctaTitle": "هل تريد أن تُعرض لعبتك هنا؟",
    "games.ctaText": "قم بترقية واجهة لعبتك لزيادة احتفاظ اللاعبين وتحقيق الإيرادات.",
    "games.contactDiscord": "دعنا نتحدث عن التصميم",
    
    // Admin Pages
    "admin.panelTitle": "لوحة التحكم",
    "admin.discordStepDesc": "أدخل معرف ديسكورد للمتابعة",
    "admin.passwordStepDesc": "أدخل كلمة المرور للوصول إلى لوحة التحكم",
    "admin.discordIdLabel": "معرف ديسكورد",
    "admin.discordIdHelp": "أدخل معرف مستخدم ديسكورد المكون من 17-18 رقم",
    "admin.verifyDiscord": "تحقق من ديسكورد",
    "admin.passwordLabel": "كلمة المرور",
    "admin.passwordPlaceholder": "أدخل كلمة المرور",
    "admin.showPassword": "إظهار كلمة المرور",
    "admin.hidePassword": "إخفاء كلمة المرور",
    "admin.login": "تسجيل الدخول",
    "admin.changeDiscordId": "تغيير معرف ديسكورد",
    "admin.devNotice": "وضع التطوير - كلمة المرور الافتراضية:",
    "admin.verifiedTitle": "تم التحقق بنجاح",
    "admin.discordIdMasked": "معرف ديسكورد:",
    "admin.goToDashboard": "الذهاب للوحة التحكم",
    "admin.logout": "تسجيل الخروج",
    "admin.invalidIdTitle": "معرف غير صالح",
    "admin.invalidIdDesc": "الرجاء إدخال معرف ديسكورد صالح مكون من 17-18 رقم",
    "admin.notRegisteredTitle": "غير مسجل",
    "admin.notRegisteredDesc": "هذا المعرف غير مسجل كمسؤول",
    "admin.verifiedDesc": "الرجاء إدخال كلمة المرور للمتابعة",
    "admin.errorTitle": "خطأ",
    "admin.errorDesc": "حدث خطأ. يرجى المحاولة مرة أخرى.",
    "admin.loginSuccessTitle": "تم تسجيل الدخول",
    "admin.loginSuccessDesc": "مرحباً بك في لوحة التحكم",
    "admin.wrongPasswordTitle": "كلمة مرور خاطئة",
    "admin.wrongPasswordDesc": "يرجى المحاولة مرة أخرى",
    "admin.logoutTitle": "تم الخروج",
    "admin.logoutDesc": "تم تسجيل الخروج بنجاح",
    
    // Not Found Page
    "notFound.message": "الصفحة غير موجودة",
    "notFound.description": "الصفحة التي تبحث عنها غير موجودة أو تم نقلها.",
    "notFound.goHome": "العودة للرئيسية",
    
    // Footer
    "footer.tagline": "نصنع تجارب رقمية لجيل الألعاب القادم.",
    "footer.role": "مصمم واجهات روبلوكس محترف",
    "footer.transform": "تحويل الأفكار إلى تجارب غامرة",
    "footer.follow": "تابعني",
    "footer.rights": "يوسف ديزاين. جميع الحقوق محفوظة.",
    
    // Common
    "loading": "جاري التحميل...",
    "error": "خطأ",
    "success": "نجح",
    "cancel": "إلغاء",
    "save": "حفظ",
    "delete": "حذف",
    "edit": "تعديل",
    "add": "إضافة",
    "close": "إغلاق",
    "submit": "إرسال"
  },
  
  es: {
    // Navigation
    "nav.home": "Inicio",
    "nav.portfolio": "Portafolio",
    "nav.games": "Juegos",
    "nav.pricing": "Precios",
    "nav.reviews": "Reseñas",
    "nav.policies": "Políticas",
    
    // Buttons
    "btn.portfolio": "Ver Portafolio",
    "btn.pricing": "Ver Precios",
    "btn.discord": "Unirse a Discord",
    "btn.contact": "Contáctame",
    "btn.hire": "Contrátame",
    
    // Hero Section
    "hero.badge": "Disponible para Proyectos",
    "hero.title1": "Creando Interfaces",
    "hero.title2": "Inmersivas",
    "hero.subtitle": "Creando interfaces de usuario inmersivas y de alta calidad para tus experiencias de Roblox.",
    
    // Stats
    "stats.projects": "Proyectos",
    "stats.clients": "Clientes",
    "stats.rating": "Calificación",
    "stats.years": "Años de Experiencia",
    
    // CTA Section
    "cta.title": "¿Listo para Transformar tu Juego?",
    "cta.subtitle": "Eleva tu experiencia de Roblox con un diseño UI profesional y premium que los jugadores adoran.",
    "cta.plan": "Elegir un Plan",
    "cta.discord": "Contactar en Discord",
    
    // Portfolio Page
    "portfolio.badge": "Mi Trabajo",
    "portfolio.title": "Diseños Destacados",
    "portfolio.subtitle": "Explora mi colección de diseños UI/UX para juegos y aplicaciones de Roblox",
    "portfolio.cta": "¿Quieres Trabajar Juntos?",
    "portfolio.ctaText": "Creemos algo increíble juntos. Ponte en contacto y discutamos tu proyecto.",
    "portfolio.discuss": "Discutir Tu Proyecto",
    
    // Pricing Page
    "pricing.badge": "Planes de Precios",
    "pricing.title": "Precios Simples y Transparentes",
    "pricing.subtitle": "Elige el plan perfecto para tus necesidades",
    "pricing.hint": "Todos los planes incluyen diseños de alta calidad, archivos fuente y soporte profesional. El pago se puede realizar mediante PayPal o Robux.",
    "pricing.featured": "Más Popular",
    "pricing.goWith": "Comenzar",
    "pricing.whyTitle": "¿Por Qué Elegirme?",
    "pricing.faqTitle": "Preguntas Frecuentes",
    "pricing.stillQ": "¿Aún Tienes Preguntas?",
    "pricing.contactDiscord": "Contactar en Discord",
    
    // Reviews Page
    "reviews.badge": "Testimonios",
    "reviews.title": "Últimas Reseñas",
    "reviews.subtitle": "Mira lo que mis clientes dicen sobre trabajar conmigo",
    "reviews.based": "basado en",
    "reviews.reviewsText": "reseñas",
    "reviews.ctaTitle": "¿Hemos trabajado juntos?",
    "reviews.ctaText": "Me encantaría escuchar tus pensamientos sobre el proceso de diseño y los resultados finales.",
    "reviews.writeReview": "Escribir una Reseña",
    
    // Policies Page
    "policies.badge": "Legal",
    "policies.title": "Políticas y Términos",
    "policies.subtitle": "Comprende mis políticas y términos de trabajo",
    "policies.questionsTitle": "¿Tienes Preguntas?",
    "policies.askDiscord": "Preguntar en Discord",
    "policies.contactDiscord": "Contactar en Discord",
    "policies.noPolicies": "No se han añadido políticas aún. Añade políticas desde el panel de administración.",
    
    // Games Page
    "games.badge": "Juegos en Vivo",
    "games.title": "Juegos para los que Diseñé la UI",
    "games.subtitle": "Explora algunas de las exitosas experiencias de Roblox que cuentan con mis interfaces de usuario personalizadas.",
    "games.loading": "Cargando juegos...",
    "games.error": "Ocurrió un error al cargar los juegos",
    "games.errorTitle": "Error al Cargar Juegos",
    "games.retry": "Intentar de Nuevo",
    "games.reload": "Recargar Página",
    "games.defaultName": "Juego",
    "games.credit": "Diseño UI/UX por Youssef Design",
    "games.playNow": "Jugar Ahora",
    "games.noGamesTitle": "No Se Encontraron Juegos",
    "games.noGamesText": "Vuelve más tarde para ver actualizaciones",
    "games.ctaTitle": "¿Quieres que tu Juego Aparezca Aquí?",
    "games.ctaText": "Mejora la interfaz de tu juego para aumentar la retención de jugadores y la monetización.",
    "games.contactDiscord": "Hablemos de Diseño",
    
    // Admin Pages
    "admin.panelTitle": "Panel de Administración",
    "admin.discordStepDesc": "Ingresa tu ID de Discord para continuar",
    "admin.passwordStepDesc": "Ingresa tu contraseña para acceder al panel de administración",
    "admin.discordIdLabel": "ID de Discord",
    "admin.discordIdHelp": "Ingresa tu ID de usuario de Discord de 17-18 dígitos",
    "admin.verifyDiscord": "Verificar Discord",
    "admin.passwordLabel": "Contraseña",
    "admin.passwordPlaceholder": "Ingresa contraseña",
    "admin.showPassword": "Mostrar contraseña",
    "admin.hidePassword": "Ocultar contraseña",
    "admin.login": "Iniciar Sesión",
    "admin.changeDiscordId": "Cambiar ID de Discord",
    "admin.devNotice": "Modo desarrollo - Contraseña predeterminada:",
    "admin.verifiedTitle": "Verificado Exitosamente",
    "admin.discordIdMasked": "ID de Discord:",
    "admin.goToDashboard": "Ir al Panel",
    "admin.logout": "Cerrar Sesión",
    "admin.invalidIdTitle": "ID Inválido",
    "admin.invalidIdDesc": "Por favor ingresa un ID de Discord válido de 17-18 dígitos",
    "admin.notRegisteredTitle": "No Registrado",
    "admin.notRegisteredDesc": "Este ID de Discord no está registrado como administrador",
    "admin.verifiedDesc": "Por favor ingresa tu contraseña para continuar",
    "admin.errorTitle": "Error",
    "admin.errorDesc": "Ocurrió un error. Por favor intenta de nuevo.",
    "admin.loginSuccessTitle": "Inicio de Sesión Exitoso",
    "admin.loginSuccessDesc": "Bienvenido al Panel de Administración",
    "admin.wrongPasswordTitle": "Contraseña Incorrecta",
    "admin.wrongPasswordDesc": "Por favor intenta de nuevo",
    "admin.logoutTitle": "Sesión Cerrada",
    "admin.logoutDesc": "Has cerrado sesión exitosamente",
    
    // Not Found Page
    "notFound.message": "Página no encontrada",
    "notFound.description": "La página que buscas no existe o ha sido movida.",
    "notFound.goHome": "Ir al Inicio",
    
    // Footer
    "footer.tagline": "Creando experiencias digitales para la próxima generación de juegos.",
    "footer.role": "Diseñador Profesional de UI/UX para Roblox",
    "footer.transform": "Transformando ideas en experiencias inmersivas",
    "footer.follow": "Sígueme",
    "footer.rights": "Youssef Design. Todos los derechos reservados.",
    
    // Common
    "loading": "Cargando...",
    "error": "Error",
    "success": "Éxito",
    "cancel": "Cancelar",
    "save": "Guardar",
    "delete": "Eliminar",
    "edit": "Editar",
    "add": "Agregar",
    "close": "Cerrar",
    "submit": "Enviar"
  }
};

// ═══════════════════════════════════════════════════════════════
// PROFILE INFORMATION
// ═══════════════════════════════════════════════════════════════

export const profile: Profile = {
  name: "Youssef",
  title: "Professional Roblox UI/UX Designer",
  discord: "https://discord.com/users/1077620522680057856",
  discordId: "1077620522680057856",
  portfolioItems: [
    { id: 1, title: "Gaming UI Design", image: "/images/portfolio/work1.png", category: "UI Design" },
    { id: 2, title: "Roblox Game Interface", image: "/images/portfolio/work2.png", category: "Game UI" },
    { id: 3, title: "Mobile Game UI", image: "/images/portfolio/work3.png", category: "Mobile UI" },
    { id: 4, title: "Dashboard Design", image: "/images/portfolio/work4.png", category: "Web UI" },
    { id: 5, title: "E-commerce Platform", image: "/images/portfolio/work5.png", category: "UI Design" },
    { id: 6, title: "Social Media App", image: "/images/portfolio/work6.png", category: "Game UI" },
    { id: 7, title: "HUD Interface", image: "/images/portfolio/work7.png", category: "Mobile UI" },
    { id: 8, title: "Inventory System", image: "/images/portfolio/work8.png", category: "UI Design" },
    { id: 9, title: "Shop UI Design", image: "/images/portfolio/work9.png", category: "Game UI" },
    { id: 10, title: "Loading Screen", image: "/images/portfolio/work10.png", category: "Mobile UI" },
    { id: 11, title: "Main Menu UI", image: "/images/portfolio/work11.png", category: "Web UI" },
    { id: 12, title: "Settings Panel", image: "/images/portfolio/work12.png", category: "UI Design" },
    { id: 13, title: "Leaderboard UI", image: "/images/portfolio/work13.png", category: "Game UI" },
    { id: 14, title: "Quest System UI", image: "/images/portfolio/work14.png", category: "Mobile UI" },
    { id: 15, title: "Character Select", image: "/images/portfolio/work15.png", category: "Web UI" },
    { id: 16, title: "Team Lobby UI", image: "/images/portfolio/work16.png", category: "UI Design" },
    { id: 17, title: "Battle UI Design", image: "/images/portfolio/work17.png", category: "Game UI" },
    { id: 18, title: "Profile Screen", image: "/images/portfolio/work18.png", category: "Mobile UI" },
    { id: 19, title: "Reward Screen", image: "/images/portfolio/work19.png", category: "Web UI" },
    { id: 20, title: "Map Interface", image: "/images/portfolio/work20.png", category: "UI Design" },
    { id: 21, title: "Combat HUD", image: "/images/portfolio/work21.png", category: "Game UI" },
    { id: 22, title: "Admin Panel UI", image: "/images/portfolio/work22.png", category: "Mobile UI" }
  ]
};

// ═══════════════════════════════════════════════════════════════
// REVIEWS DATA
// ═══════════════════════════════════════════════════════════════

export const reviewsData: Review[] = [
  {
    id: 1,
    name: "schwerer",
    rating: 5,
    text: "affordable, fast, flexible with revisions and good quality solid",
    project_type: "UI Design",
    date: "2024-11",
    verified: true,
    avatar: "S"
  },
  {
    id: 2,
    name: "Gren",
    rating: 5,
    text: "Very fast orders and good quality",
    project_type: "UI Design",
    date: "2024-10",
    verified: true,
    avatar: "G"
  },
  {
    id: 3,
    name: "snowstorm/king",
    rating: 5,
    text: "good, cheap, fast, ui is high quality and more affordable",
    project_type: "UI Design",
    date: "2024-10",
    verified: true,
    avatar: "S"
  },
  {
    id: 4,
    name: "10dok",
    rating: 5,
    text: "super good and affordable, without your ui I wouldve quit finishing my game",
    project_type: "UI Design",
    date: "2024-09",
    verified: true,
    avatar: "1"
  },
  {
    id: 5,
    name: "nilcous",
    rating: 4,
    text: "handled everything perfectly, great experience, fast delivery. Could improve communication",
    project_type: "UI Design",
    date: "2024-09",
    verified: true,
    avatar: "N"
  },
  {
    id: 6,
    name: "CyraX",
    rating: 5,
    text: "Very fast and efficient, did exactly what I want. Recommended UI artist!",
    project_type: "UI Design",
    date: "2024-08",
    verified: true,
    avatar: "C"
  },
  {
    id: 7,
    name: "ephemeralrequiem",
    rating: 5,
    text: "high quality work, fast delivery and good communication",
    project_type: "UI Design",
    date: "2024-08",
    verified: true,
    avatar: "E"
  },
  {
    id: 8,
    name: "pdawgdev",
    rating: 5,
    text: "high quality and fully customizable, listened to what I wanted",
    project_type: "UI Design",
    date: "2024-07",
    verified: true,
    avatar: "P"
  },
  {
    id: 9,
    name: "mystery_0001",
    rating: 5,
    text: "fast delivery & easy to work with, highly recommend!",
    project_type: "UI Design",
    date: "2024-07",
    verified: true,
    avatar: "M"
  }
];

// ═══════════════════════════════════════════════════════════════
// STATS DATA
// ═══════════════════════════════════════════════════════════════

export const statsData: Stat[] = [
  { id: 1, title: "Projects Completed", value: "160+", icon: "briefcase" },
  { id: 2, title: "Happy Clients", value: "70+", icon: "users" },
  { id: 3, title: "Years of Experience", value: "4+", icon: "clock" },
  { id: 4, title: "5-Star Reviews", value: "95%", icon: "star" },
  { id: 5, title: "Games Launched", value: "50+", icon: "gamepad" },
  { id: 6, title: "Response Time", value: "<2h", icon: "zap" },
  { id: 7, title: "Revision Rate", value: "<5%", icon: "refresh" },
  { id: 8, title: "Client Retention", value: "85%", icon: "repeat" }
];

// ═══════════════════════════════════════════════════════════════
// TOOLS & SKILLS
// ═══════════════════════════════════════════════════════════════

export const toolsData: Tool[] = [
  { 
    id: 1, 
    name: "Photoshop", 
    icon: "🖼️", 
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/photoshop/photoshop-original.svg" 
  },
  { 
    id: 2, 
    name: "Roblox Studio", 
    icon: "🎮", 
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/roblox/roblox-original.svg" 
  },
  { 
    id: 3, 
    name: "Figma", 
    icon: "🎨", 
    logo: "https://cdn.jsdelivr.net/gh/devicons/devicon/icons/figma/figma-original.svg" 
  }
];

// ═══════════════════════════════════════════════════════════════
// PORTFOLIO ITEMS
// ═══════════════════════════════════════════════════════════════

export const portfolioItems: PortfolioItem[] = [
  { id: 1, title: "Gaming UI Design", image: "/images/portfolio/work1.png", category: "UI Design" },
  { id: 2, title: "Roblox Game Interface", image: "/images/portfolio/work2.png", category: "Game UI" },
  { id: 3, title: "Mobile Game UI", image: "/images/portfolio/work3.png", category: "Mobile UI" },
  { id: 4, title: "Dashboard Design", image: "/images/portfolio/work4.png", category: "Web UI" },
  { id: 5, title: "E-commerce Platform", image: "/images/portfolio/work5.png", category: "UI Design" },
  { id: 6, title: "Social Media App", image: "/images/portfolio/work6.png", category: "Game UI" },
  { id: 7, title: "HUD Interface", image: "/images/portfolio/work7.png", category: "Mobile UI" },
  { id: 8, title: "Inventory System", image: "/images/portfolio/work8.png", category: "UI Design" },
  { id: 9, title: "Shop UI Design", image: "/images/portfolio/work9.png", category: "Game UI" },
  { id: 10, title: "Loading Screen", image: "/images/portfolio/work10.png", category: "Mobile UI" },
  { id: 11, title: "Main Menu UI", image: "/images/portfolio/work11.png", category: "Web UI" },
  { id: 12, title: "Settings Panel", image: "/images/portfolio/work12.png", category: "UI Design" },
  { id: 13, title: "Leaderboard UI", image: "/images/portfolio/work13.png", category: "Game UI" },
  { id: 14, title: "Quest System UI", image: "/images/portfolio/work14.png", category: "Mobile UI" },
  { id: 15, title: "Character Select", image: "/images/portfolio/work15.png", category: "Web UI" },
  { id: 16, title: "Team Lobby UI", image: "/images/portfolio/work16.png", category: "UI Design" },
  { id: 17, title: "Battle UI Design", image: "/images/portfolio/work17.png", category: "Game UI" },
  { id: 18, title: "Profile Screen", image: "/images/portfolio/work18.png", category: "Mobile UI" },
  { id: 19, title: "Reward Screen", image: "/images/portfolio/work19.png", category: "Web UI" },
  { id: 20, title: "Map Interface", image: "/images/portfolio/work20.png", category: "UI Design" },
  { id: 21, title: "Combat HUD", image: "/images/portfolio/work21.png", category: "Game UI" },
  { id: 22, title: "Admin Panel UI", image: "/images/portfolio/work22.png", category: "Mobile UI" }
];

// ═══════════════════════════════════════════════════════════════
// PRICING PLANS
// ═══════════════════════════════════════════════════════════════

export const pricingPlans: PricingPlan[] = [
  {
    id: 1,
    name: "Starter",
    price_usd: "15",
    price_robux: "4K",
    frames: "1-6 frames",
    features: ["1-6 Frames", "Basic UI Elements", "Up to 2 Free Revisions", "Standard Delivery"],
    featured: false,
    icon: "zap"
  },
  {
    id: 2,
    name: "Basic",
    price_usd: "40",
    price_robux: "11K",
    frames: "7-15 frames",
    features: ["7-15 Frames", "Advanced UI Elements", "Up to 3 Free Revisions", "Standard Delivery"],
    featured: false,
    icon: "layers"
  },
  {
    id: 3,
    name: "Intermediate",
    price_usd: "85",
    price_robux: "24K",
    frames: "16-35 frames",
    features: ["16-35 Frames", "Custom Icons", "Up to 4 Free Revisions", "Priority Delivery"],
    featured: false,
    icon: "gem"
  },
  {
    id: 4,
    name: "Advanced",
    price_usd: "150",
    price_robux: "43K",
    frames: "36-60 frames",
    features: ["36-60 Frames", "Complex Layouts", "Up to 5 Free Revisions", "High Priority"],
    featured: false,
    icon: "crown"
  },
  {
    id: 5,
    name: "Full Game",
    price_usd: "260",
    price_robux: "75K",
    frames: "Unlimited",
    features: ["Unlimited Frames", "Full Game Design System", "Unlimited Revisions", "VIP Support"],
    featured: true,
    icon: "infinity"
  },
  {
    id: 6,
    name: "Import Per Frame",
    price_usd: "5",
    price_robux: "2.5K",
    frames: "Per Frame",
    features: ["Import to Studio", "UI Scaling", "Organized Folders", "Ready to Script"],
    featured: false,
    icon: "file-import"
  }
];

// ═══════════════════════════════════════════════════════════════
// POLICIES & TERMS
// ═══════════════════════════════════════════════════════════════

export const policies: Policy[] = [
  {
    id: 1,
    title: "Payment Policy",
    description: "50% upfront, 50% upon completion. Payment must be made before work begins. We accept PayPal, Robux, and other payment methods.",
    icon: "shield"
  },
  {
    id: 2,
    title: "Revision Policy",
    description: "Each plan includes a specific number of revisions. Additional revisions may incur extra charges. Please provide clear feedback to minimize revisions.",
    icon: "refresh"
  },
  {
    id: 3,
    title: "Delivery Time",
    description: "Delivery times vary based on the plan selected. Basic plans typically take 3-5 business days. Rush orders may be available for an additional fee.",
    icon: "clock"
  },
  {
    id: 4,
    title: "Refund Policy",
    description: "Refunds are considered on a case-by-case basis. Please contact us within 48 hours of delivery if you're not satisfied with the work.",
    icon: "dollar-sign"
  },
  {
    id: 5,
    title: "Communication",
    description: "Please communicate clearly and provide all necessary details before work begins. Response time is typically within 24 hours.",
    icon: "message-square"
  }
];

// ═══════════════════════════════════════════════════════════════
// GAMES
// ═══════════════════════════════════════════════════════════════

export const games: Game[] = [
  {
    id: 1,
    placeId: "111021125092689",
    name: "Steal A Forsaken",
    visits: "9800000",
    icon: ""
  },
  {
    id: 2,
    placeId: "128915436393653",
    name: "Roblox Game",
    visits: "0",
    icon: ""
  },
  {
    id: 3,
    placeId: "93605084835085",
    name: "Roblox Game",
    visits: "0",
    icon: ""
  },
  {
    id: 4,
    placeId: "116868134708688",
    name: "Roblox Game",
    visits: "0",
    icon: ""
  },
  {
    id: 5,
    placeId: "85746704401525",
    name: "Roblox Game",
    visits: "0",
    icon: ""
  },
  {
    id: 6,
    placeId: "92369489899222",
    name: "Roblox Game",
    visits: "0",
    icon: ""
  },
  {
    id: 7,
    placeId: "121873420604621",
    name: "Roblox Game",
    visits: "0",
    icon: ""
  }
];

// ═══════════════════════════════════════════════════════════════
// FAQ
// ═══════════════════════════════════════════════════════════════

export const faqs: FAQ[] = [
  {
    id: 1,
    question: "What UI design services do you offer?",
    answer: "I specialize in Roblox UI/UX design — including HUDs, menus, inventory systems, shop UIs, leaderboards, loading screens, and complete game UI systems. I also provide Figma source files and can import directly into Roblox Studio."
  },
  {
    id: 2,
    question: "Are revisions included?",
    answer: "Yes! Every plan includes free revisions. Starter gets 2, Basic gets 3, Intermediate gets 4, Advanced gets 5, and Full Game gets unlimited revisions. Additional revisions beyond your plan's limit are available for a small fee."
  },
  {
    id: 3,
    question: "Do you import the UI into Roblox Studio?",
    answer: "Yes — the Import Per Frame service is available for $5 / 2.5K Robux per frame. This includes proper UI scaling, organized folder structure, and script-ready setup so developers can plug it in immediately."
  },
  {
    id: 4,
    question: "What payment methods do you accept?",
    answer: "I accept USD via PayPal or similar platforms, and Robux via group funds or direct trade. Payment terms are 50% upfront and 50% upon delivery for larger projects."
  },
  {
    id: 5,
    question: "How long does delivery take?",
    answer: "Delivery depends on the plan and complexity. Starter & Basic typically take 1-3 days, Intermediate & Advanced take 3-7 days, and Full Game packages take 7-14 days. Rush delivery is available on request."
  },
  {
    id: 6,
    question: "Can I get a refund?",
    answer: "Refunds are evaluated case by case. If I haven't started work yet, a full refund is issued. After work has begun, a partial refund may be available. Once the final files are delivered and approved, refunds are not available."
  },
  {
    id: 7,
    question: "Are you available for full-time roles?",
    answer: "I'm currently open to long-term collaborations and studio partnerships. If you need a dedicated UI designer for your team or ongoing project, feel free to reach out on Discord to discuss terms."
  },
  {
    id: 8,
    question: "Do you do rush orders?",
    answer: "Yes! Rush orders are available for an additional fee depending on the urgency and scope. Contact me on Discord and I'll let you know my current availability and the fastest turnaround I can offer."
  }
];

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function getTranslation(key: TranslationKey, lang: Language = 'en'): string {
  return translations[lang]?.[key] ?? translations.en[key] ?? key;
}

export function getTranslations(lang: Language = 'en'): Record<TranslationKey, string> {
  return translations[lang] ?? translations.en;
}

export function getSupportedLanguages(): Language[] {
  return Object.keys(translations) as Language[];
}

export function formatNumber(num: number | string): string {
  const value = typeof num === 'string' ? parseInt(num, 10) : num;
  if (isNaN(value)) return '0';
  
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toString();
}

export function isValidDiscordId(id: string): boolean {
  return /^\d{17,19}$/.test(id.trim());
}

export function maskDiscordId(id: string): string {
  const trimmed = id.trim();
  return trimmed.slice(-4).padStart(trimmed.length, '•');
}