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

// ─── TranslationKey union ─────────────────────────────────────────────────────
// Every hardcoded UI string in the app must map to exactly one key here.
// Add new keys at the bottom of their namespace cluster — never rename existing
// keys (that is a breaking change requiring a grep across all consumers).

export type TranslationKey =
  // Navigation
  | "nav.home" | "nav.portfolio" | "nav.games" | "nav.pricing" | "nav.reviews" | "nav.policies"
  | "nav.discord"
  // Buttons
  | "btn.portfolio" | "btn.pricing" | "btn.discord" | "btn.contact" | "btn.hire"
  // Hero
  | "hero.badge" | "hero.title1" | "hero.title2" | "hero.subtitle"
  // Stats — home page grid (reuse stat.* keys below)
  | "stats.projects" | "stats.clients" | "stats.rating" | "stats.years"
  // Stat card titles — keyed by the icon slug so DualMarqueeSection can look them up
  | "stat.briefcase" | "stat.users" | "stat.clock" | "stat.star"
  | "stat.gamepad"   | "stat.zap"   | "stat.refresh" | "stat.repeat"
  // CTA Section
  | "cta.title" | "cta.subtitle" | "cta.plan" | "cta.discord"
  // Portfolio Page
  | "portfolio.badge" | "portfolio.title" | "portfolio.subtitle"
  | "portfolio.cta"   | "portfolio.ctaText" | "portfolio.discuss"
  // Pricing Page
  | "pricing.badge"  | "pricing.title"    | "pricing.subtitle"  | "pricing.hint"
  | "pricing.featured" | "pricing.goWith" | "pricing.whyTitle"  | "pricing.faqTitle"
  | "pricing.stillQ" | "pricing.contactDiscord"
  | "pricing.includes" | "pricing.unlimited" | "pricing.revisions"
  | "pricing.orderTitle" | "pricing.copyMsg" | "pricing.copied" | "pricing.openDM"
  // Reviews Page
  | "reviews.badge"  | "reviews.title"      | "reviews.subtitle"
  | "reviews.based"  | "reviews.reviewsText" | "reviews.ctaTitle"
  | "reviews.ctaText" | "reviews.writeReview"
  // Policies Page
  | "policies.badge" | "policies.title"         | "policies.subtitle"
  | "policies.questionsTitle" | "policies.askDiscord" | "policies.contactDiscord"
  | "policies.noPolicies"    | "policies.sections"   | "policies.contactHint"
  // Games Page
  | "games.badge"     | "games.title"      | "games.subtitle"  | "games.loading"
  | "games.error"     | "games.errorTitle" | "games.retry"     | "games.reload"
  | "games.defaultName" | "games.credit"   | "games.playNow"
  | "games.noGamesTitle" | "games.noGamesText"
  | "games.ctaTitle"  | "games.ctaText"    | "games.contactDiscord"
  // Admin Login
  | "admin.panelTitle" | "admin.discordStepDesc" | "admin.passwordStepDesc"
  | "admin.discordIdLabel" | "admin.discordIdHelp" | "admin.verifyDiscord"
  | "admin.passwordLabel"  | "admin.passwordPlaceholder"
  | "admin.showPassword"   | "admin.hidePassword"
  | "admin.login" | "admin.changeDiscordId" | "admin.devNotice"
  | "admin.verifiedTitle"  | "admin.discordIdMasked" | "admin.goToDashboard"
  | "admin.logout"
  | "admin.invalidIdTitle" | "admin.invalidIdDesc"
  | "admin.notRegisteredTitle" | "admin.notRegisteredDesc"
  | "admin.verifiedDesc"   | "admin.errorTitle" | "admin.errorDesc"
  | "admin.loginSuccessTitle" | "admin.loginSuccessDesc"
  | "admin.wrongPasswordTitle" | "admin.wrongPasswordDesc"
  | "admin.logoutTitle"    | "admin.logoutDesc"
  // Admin — Reviews Tab
  | "admin.reviews.title"    | "admin.reviews.desc"
  | "admin.reviews.newBtn"   | "admin.reviews.createTitle" | "admin.reviews.editTitle"
  | "admin.reviews.createBtn" | "admin.reviews.saveBtn"
  | "admin.reviews.filterAll" | "admin.reviews.filterPending"
  | "admin.reviews.filterApproved" | "admin.reviews.filterRejected"
  | "admin.reviews.approve"  | "admin.reviews.reject"
  | "admin.reviews.refresh"  | "admin.reviews.noReviews" | "admin.reviews.createFirst"
  | "admin.reviews.pin"      | "admin.reviews.unpin"     | "admin.reviews.featured"
  | "admin.reviews.autoApprove" | "admin.reviews.pinFeat" | "admin.reviews.verified"
  | "admin.reviews.created"  | "admin.reviews.live"      | "admin.reviews.asPending"
  | "admin.reviews.statusApproved" | "admin.reviews.statusPending" | "admin.reviews.statusRejected"
  // Admin — Users Tab
  | "admin.users.title"    | "admin.users.modPanel"
  | "admin.users.banUser"  | "admin.users.unbanUser" | "admin.users.liveAlert"
  | "admin.users.banBtn"   | "admin.users.alreadyBanned"
  | "admin.users.unbanBtn" | "admin.users.notBanned"
  | "admin.users.sendAlert" | "admin.users.clearAlert"
  | "admin.users.actions"  | "admin.users.refresh"
  | "admin.users.noSessions" | "admin.users.noMatch"
  | "admin.users.total"    | "admin.users.active"  | "admin.users.banned"
  | "admin.users.dbError"
  | "admin.users.reasonPlaceholder" | "admin.users.welcomeBack" | "admin.users.msgPlaceholder"
  | "admin.users.inactive" | "admin.users.loading"
  | "admin.users.clearAll" | "admin.users.clearAllConfirm"
  // Admin — Games Tab
  | "admin.games.title"    | "admin.games.desc"
  | "admin.games.addTitle" | "admin.games.editTitle"
  | "admin.games.placeId"  | "admin.games.gameName"
  | "admin.games.creator"  | "admin.games.displayOrder" | "admin.games.published"
  | "admin.games.saving"   | "admin.games.updateBtn"    | "admin.games.addBtn"
  | "admin.games.noGames"  | "admin.games.refresh"
  | "admin.games.howTitle" | "admin.games.how1" | "admin.games.how2" | "admin.games.how3"
  // Settings Modal
  | "settings.title"      | "settings.customize"
  | "settings.language"   | "settings.theme"       | "settings.performance"
  | "settings.contact"
  | "settings.perfBooster" | "settings.perfBoosterDesc"
  | "settings.ecoMode"     | "settings.ecoModeDesc"  | "settings.ecoActive"
  | "settings.openDiscord" | "settings.closeLabel"
  | "settings.themeLight"  | "settings.themeDark"    | "settings.themeSystem"
  | "settings.copyright"
  // Marquee Section
  | "marquee.title" | "marquee.ecoLabel" | "marquee.noReviews"
  // About Section
  | "about.badge" | "about.title" | "about.intro"
  | "about.offerTitle" | "about.offer1" | "about.offer2" | "about.offer3"
  | "about.offer4" | "about.offer5" | "about.offer6"
  | "about.whyTitle" | "about.why1" | "about.why2" | "about.why3" | "about.why4"
  | "about.ratesTitle" | "about.rate1Label" | "about.rate1Price"
  | "about.rate2Label" | "about.rate2Price"
  | "about.paymentTitle" | "about.payment"
  | "about.deliveryTitle" | "about.delivery"
  | "about.cta"
  | "about.skill1" | "about.skill2" | "about.skill3" | "about.skill4"
  // Not Found
  | "notFound.message" | "notFound.description" | "notFound.goHome"
  // Footer
  | "footer.tagline" | "footer.role" | "footer.transform" | "footer.follow" | "footer.rights"
  // Common
  | "loading" | "error" | "success" | "cancel" | "save" | "delete" | "edit" | "add" | "close" | "submit"
  // ── Pricing tier names (one per plan ID 1–6) ──────────────────────────
  | "pricing.tier.1" | "pricing.tier.2" | "pricing.tier.3"
  | "pricing.tier.4" | "pricing.tier.5" | "pricing.tier.6"
  // ── Pricing frames labels ──────────────────────────────────────────────
  | "pricing.p1.frames" | "pricing.p2.frames" | "pricing.p3.frames"
  | "pricing.p4.frames" | "pricing.p5.frames" | "pricing.p6.frames"
  // ── Pricing plan features (4 features × 6 plans) ──────────────────────
  | "pricing.p1.f1" | "pricing.p1.f2" | "pricing.p1.f3" | "pricing.p1.f4"
  | "pricing.p2.f1" | "pricing.p2.f2" | "pricing.p2.f3" | "pricing.p2.f4"
  | "pricing.p3.f1" | "pricing.p3.f2" | "pricing.p3.f3" | "pricing.p3.f4"
  | "pricing.p4.f1" | "pricing.p4.f2" | "pricing.p4.f3" | "pricing.p4.f4"
  | "pricing.p5.f1" | "pricing.p5.f2" | "pricing.p5.f3" | "pricing.p5.f4"
  | "pricing.p6.f1" | "pricing.p6.f2" | "pricing.p6.f3" | "pricing.p6.f4"
  // ── Policy titles & descriptions (keyed by icon slug) ─────────────────
  | "policy.payment.title" | "policy.payment.desc"
  | "policy.revision.title" | "policy.revision.desc"
  | "policy.delivery.title" | "policy.delivery.desc"
  | "policy.refund.title"   | "policy.refund.desc"
  | "policy.communication.title" | "policy.communication.desc"
  // ── FAQ questions & answers (8 items) ─────────────────────────────────
  | "faq.1.q" | "faq.1.a" | "faq.2.q" | "faq.2.a"
  | "faq.3.q" | "faq.3.a" | "faq.4.q" | "faq.4.a"
  | "faq.5.q" | "faq.5.a" | "faq.6.q" | "faq.6.a"
  | "faq.7.q" | "faq.7.a" | "faq.8.q" | "faq.8.a";

export type Language = "en" | "ar" | "es";

export type Translations = Record<Language, Record<TranslationKey, string>>;

// ═══════════════════════════════════════════════════════════════
// TRANSLATIONS — Monolithic dictionary, all 3 locales inline.
// Future-proofing: see the LOCALIZATION ARCHITECTURE comment
// in the original file for the code-splitting migration path.
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
    "nav.discord": "Discord",

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

    // Stats (home grid labels)
    "stats.projects": "Projects",
    "stats.clients": "Clients",
    "stats.rating": "Rating",
    "stats.years": "Years Experience",

    // Stat card titles (keyed by icon slug for marquee + home page)
    "stat.briefcase": "Projects Completed",
    "stat.users": "Happy Clients",
    "stat.clock": "Years of Experience",
    "stat.star": "5-Star Reviews",
    "stat.gamepad": "Games Launched",
    "stat.zap": "Response Time",
    "stat.refresh": "Revision Rate",
    "stat.repeat": "Client Retention",

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
    "pricing.goWith": "Go with this plan",
    "pricing.whyTitle": "Why Choose Me?",
    "pricing.faqTitle": "Frequently Asked Questions",
    "pricing.stillQ": "Still Have Questions?",
    "pricing.contactDiscord": "Contact on Discord",
    "pricing.includes": "Includes:",
    "pricing.unlimited": "Unlimited",
    "pricing.revisions": "revisions",
    "pricing.orderTitle": "Order Message",
    "pricing.copyMsg": "Copy Message",
    "pricing.copied": "Copied!",
    "pricing.openDM": "Open Discord DM",

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
    "policies.sections": "Policy Sections",
    "policies.contactHint": "Have questions about any of these policies? Reach out directly on Discord.",

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

    // Admin Login
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

    // Admin — Reviews Tab
    "admin.reviews.title": "Reviews",
    "admin.reviews.desc": "Create, moderate and manage customer feedback",
    "admin.reviews.newBtn": "New Review",
    "admin.reviews.createTitle": "Create New Review",
    "admin.reviews.editTitle": "Edit Review",
    "admin.reviews.createBtn": "Create Review",
    "admin.reviews.saveBtn": "Save Changes",
    "admin.reviews.filterAll": "All",
    "admin.reviews.filterPending": "Pending",
    "admin.reviews.filterApproved": "Approved",
    "admin.reviews.filterRejected": "Rejected",
    "admin.reviews.approve": "Approve",
    "admin.reviews.reject": "Reject",
    "admin.reviews.refresh": "Refresh",
    "admin.reviews.noReviews": "No reviews found",
    "admin.reviews.createFirst": "Create the first review",
    "admin.reviews.pin": "Pin",
    "admin.reviews.unpin": "Unpin",
    "admin.reviews.featured": "Featured / Pinned",
    "admin.reviews.autoApprove": "Auto-Approve (public)",
    "admin.reviews.pinFeat": "Pin / Feature",
    "admin.reviews.verified": "Verified Client",
    "admin.reviews.created": "Review created",
    "admin.reviews.live": "Live on public site",
    "admin.reviews.asPending": "Saved as pending",
    "admin.reviews.statusApproved": "Approved",
    "admin.reviews.statusPending": "Pending",
    "admin.reviews.statusRejected": "Rejected",

    // Admin — Users Tab
    "admin.users.title": "Sessions",
    "admin.users.modPanel": "Moderation Panel",
    "admin.users.banUser": "Ban User",
    "admin.users.unbanUser": "Unban User",
    "admin.users.liveAlert": "Live Alert",
    "admin.users.banBtn": "Ban Session",
    "admin.users.alreadyBanned": "Already Banned",
    "admin.users.unbanBtn": "Unban Session",
    "admin.users.notBanned": "Not Banned",
    "admin.users.sendAlert": "Send",
    "admin.users.clearAlert": "Clear alert",
    "admin.users.actions": "Actions",
    "admin.users.refresh": "Refresh",
    "admin.users.noSessions": "No sessions yet.",
    "admin.users.noMatch": "No sessions match this filter.",
    "admin.users.total": "Total",
    "admin.users.active": "Active",
    "admin.users.banned": "Banned",
    "admin.users.dbError": "Database Error",
    "admin.users.reasonPlaceholder": "Reason (optional)",
    "admin.users.welcomeBack": "Welcome-back message",
    "admin.users.msgPlaceholder": "Message shown to this user now…",
    "admin.users.inactive": "Inactive",
    "admin.users.loading": "Loading sessions…",
    "admin.users.clearAll": "Clear All Sessions",
    "admin.users.clearAllConfirm": "Delete all session records? This cannot be undone.",

    // Admin — Games Tab
    "admin.games.title": "Games",
    "admin.games.desc": "Manage Roblox games — changes apply live instantly",
    "admin.games.addTitle": "Add New Game",
    "admin.games.editTitle": "Edit Game",
    "admin.games.placeId": "Place ID",
    "admin.games.gameName": "Game Name (optional — auto from Roblox)",
    "admin.games.creator": "Creator Name",
    "admin.games.displayOrder": "Display Order",
    "admin.games.published": "Published (visible on site)",
    "admin.games.saving": "Saving…",
    "admin.games.updateBtn": "Update Game",
    "admin.games.addBtn": "Add Game",
    "admin.games.noGames": "No games yet — add one above",
    "admin.games.refresh": "Refresh",
    "admin.games.howTitle": "How it works:",
    "admin.games.how1": "· Add a Place ID → game appears on the Games page immediately",
    "admin.games.how2": "· Click 🔄 to sync icon, name & visits from Roblox API",
    "admin.games.how3": "· Toggle publish/hide without deleting",

    // Settings Modal
    "settings.title": "Settings",
    "settings.customize": "Customize your experience",
    "settings.language": "Language",
    "settings.theme": "Theme",
    "settings.performance": "Performance",
    "settings.contact": "Contact",
    "settings.perfBooster": "Performance Booster",
    "settings.perfBoosterDesc": "Prioritizes strict rendering loops & reduces repaints",
    "settings.ecoMode": "Low-End Device Mode",
    "settings.ecoModeDesc": "Disables animations, particles & marquees — replaces with static grids",
    "settings.ecoActive": "Eco Mode active — all marquees, canvas particles and complex transitions are replaced with lightweight static layouts.",
    "settings.openDiscord": "Open Discord DM",
    "settings.closeLabel": "Close settings",
    "settings.themeLight": "Light",
    "settings.themeDark": "Dark",
    "settings.themeSystem": "System",
    "settings.copyright": "© 2026 Youssef Design — All Rights Reserved",

    // Marquee Section
    "marquee.title": "What People Say & Key Achievements",
    "marquee.ecoLabel": "⚡ Low-End Device Mode — static layout active",
    "marquee.noReviews": "No reviews yet — be the first!",

    // About Section
    "about.badge":         "About Me",
    "about.title":         "Behind the Pixels",
    "about.intro":         "Hi! I'm Youssef, a 20-year-old full-time UI/UX designer with over 2 years of experience crafting unique, cartoony, and interactive interfaces for Roblox games. If you need a professional designer who gets your game the visibility it deserves — you're in the right place.",
    "about.offerTitle":    "What I Offer",
    "about.offer1":        "Professional & creative UI design",
    "about.offer2":        "UX-optimised layouts",
    "about.offer3":        "Direct asset porting inside Roblox Studio",
    "about.offer4":        "Scaled & optimised for every device",
    "about.offer5":        "Fast turnaround with smooth communication",
    "about.offer6":        "Competitive rates with a quality guarantee",
    "about.whyTitle":      "Why Choose Me?",
    "about.why1":          "Up to 5 free revisions until you're 100% satisfied",
    "about.why2":          "Full transparency — you're kept informed every step of the way",
    "about.why3":          "Frequent updates & instant responses as a full-time designer",
    "about.why4":          "Money-back guarantee if you're not satisfied",
    "about.ratesTitle":    "Rates",
    "about.rate1Label":    "UI Design",
    "about.rate1Price":    "$15 / frame (or 4,000 Robux / frame, tax included)",
    "about.rate2Label":    "UI Import",
    "about.rate2Price":    "$5 / frame (porting to all devices)",
    "about.paymentTitle":  "Payment",
    "about.payment":       "PayPal or Robux. Robux pricing already reflects the applicable tax.",
    "about.deliveryTitle": "Delivery",
    "about.delivery":      "Final files delivered as clean PNGs or ported directly into your Roblox project. 100% refund guaranteed if you're not satisfied.",
    "about.cta":           "Ready to bring your Roblox project to life? Let's talk today.",
    "about.skill1":        "UI/UX Design",
    "about.skill2":        "Roblox Studio",
    "about.skill3":        "Game Interfaces",
    "about.skill4":        "Brand Identity",

    // Not Found
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
    "submit": "Submit",

    // ── Pricing Tier Names ────────────────────────────────────────────────
    "pricing.tier.1": "Starter",
    "pricing.tier.2": "Basic",
    "pricing.tier.3": "Intermediate",
    "pricing.tier.4": "Advanced",
    "pricing.tier.5": "Full Game",
    "pricing.tier.6": "Import Per Frame",

    // ── Pricing Frames Labels ─────────────────────────────────────────────
    "pricing.p1.frames": "1–6 frames",
    "pricing.p2.frames": "7–15 frames",
    "pricing.p3.frames": "16–35 frames",
    "pricing.p4.frames": "36–60 frames",
    "pricing.p5.frames": "Unlimited",
    "pricing.p6.frames": "Per Frame",

    // ── Pricing Plan Features ─────────────────────────────────────────────
    "pricing.p1.f1": "1–6 Frames",
    "pricing.p1.f2": "Basic UI Elements",
    "pricing.p1.f3": "Up to 2 Free Revisions",
    "pricing.p1.f4": "Standard Delivery",
    "pricing.p2.f1": "7–15 Frames",
    "pricing.p2.f2": "Advanced UI Elements",
    "pricing.p2.f3": "Up to 3 Free Revisions",
    "pricing.p2.f4": "Standard Delivery",
    "pricing.p3.f1": "16–35 Frames",
    "pricing.p3.f2": "Custom Icons",
    "pricing.p3.f3": "Up to 4 Free Revisions",
    "pricing.p3.f4": "Priority Delivery",
    "pricing.p4.f1": "36–60 Frames",
    "pricing.p4.f2": "Complex Layouts",
    "pricing.p4.f3": "Up to 5 Free Revisions",
    "pricing.p4.f4": "High Priority",
    "pricing.p5.f1": "Unlimited Frames",
    "pricing.p5.f2": "Full Game Design System",
    "pricing.p5.f3": "Unlimited Revisions",
    "pricing.p5.f4": "VIP Support",
    "pricing.p6.f1": "Import to Studio",
    "pricing.p6.f2": "UI Scaling",
    "pricing.p6.f3": "Organized Folders",
    "pricing.p6.f4": "Ready to Script",

    // ── Policy Titles & Descriptions ─────────────────────────────────────
    "policy.payment.title": "Payment Policy",
    "policy.payment.desc": "50% upfront, 50% upon completion. Payment must be made before work begins. We accept PayPal, Robux, and other payment methods.",
    "policy.revision.title": "Revision Policy",
    "policy.revision.desc": "Each plan includes a specific number of revisions. Additional revisions may incur extra charges. Please provide clear feedback to minimize revisions.",
    "policy.delivery.title": "Delivery Time",
    "policy.delivery.desc": "Delivery times vary based on the plan selected. Basic plans typically take 3–5 business days. Rush orders may be available for an additional fee.",
    "policy.refund.title": "Refund Policy",
    "policy.refund.desc": "Refunds are considered on a case-by-case basis. Please contact us within 48 hours of delivery if you're not satisfied with the work.",
    "policy.communication.title": "Communication",
    "policy.communication.desc": "Please communicate clearly and provide all necessary details before work begins. Response time is typically within 24 hours.",

    // ── FAQ Questions & Answers ───────────────────────────────────────────
    "faq.1.q": "What UI design services do you offer?",
    "faq.1.a": "I specialize in Roblox UI/UX design — including HUDs, menus, inventory systems, shop UIs, leaderboards, loading screens, and complete game UI systems. I also provide Figma source files and can import directly into Roblox Studio.",
    "faq.2.q": "Are revisions included?",
    "faq.2.a": "Yes! Every plan includes free revisions. Starter gets 2, Basic gets 3, Intermediate gets 4, Advanced gets 5, and Full Game gets unlimited revisions. Additional revisions beyond your plan's limit are available for a small fee.",
    "faq.3.q": "Do you import the UI into Roblox Studio?",
    "faq.3.a": "Yes — the Import Per Frame service is available for $5 / 2.5K Robux per frame. This includes proper UI scaling, organized folder structure, and script-ready setup so developers can plug it in immediately.",
    "faq.4.q": "What payment methods do you accept?",
    "faq.4.a": "I accept USD via PayPal or similar platforms, and Robux via group funds or direct trade. Payment terms are 50% upfront and 50% upon delivery for larger projects.",
    "faq.5.q": "How long does delivery take?",
    "faq.5.a": "Delivery depends on the plan and complexity. Starter & Basic typically take 1–3 days, Intermediate & Advanced take 3–7 days, and Full Game packages take 7–14 days. Rush delivery is available on request.",
    "faq.6.q": "Can I get a refund?",
    "faq.6.a": "Refunds are evaluated case by case. If I haven't started work yet, a full refund is issued. After work has begun, a partial refund may be available. Once the final files are delivered and approved, refunds are not available.",
    "faq.7.q": "Are you available for full-time roles?",
    "faq.7.a": "I'm currently open to long-term collaborations and studio partnerships. If you need a dedicated UI designer for your team or ongoing project, feel free to reach out on Discord to discuss terms.",
    "faq.8.q": "Do you do rush orders?",
    "faq.8.a": "Yes! Rush orders are available for an additional fee depending on the urgency and scope. Contact me on Discord and I'll let you know my current availability and the fastest turnaround I can offer.",
  },

  ar: {
    // Navigation
    "nav.home": "الرئيسية",
    "nav.portfolio": "أعمالي",
    "nav.games": "الألعاب",
    "nav.pricing": "الأسعار",
    "nav.reviews": "التقييمات",
    "nav.policies": "الشروط",
    "nav.discord": "ديسكورد",

    // Buttons
    "btn.portfolio": "شاهد أعمالي",
    "btn.pricing": "شاهد الأسعار",
    "btn.discord": "انضم للديسكورد",
    "btn.contact": "تواصل معي",
    "btn.hire": "وظفني",

    // Hero
    "hero.badge": "متاح للمشاريع",
    "hero.title1": "أصمم واجهات",
    "hero.title2": "تفاعلية احترافية",
    "hero.subtitle": "أصمم واجهات مستخدم غامرة وعالية الجودة لتجارب Roblox الخاصة بك.",

    // Stats
    "stats.projects": "المشاريع",
    "stats.clients": "العملاء",
    "stats.rating": "التقييم",
    "stats.years": "سنوات الخبرة",

    // Stat card titles
    "stat.briefcase": "مشاريع مكتملة",
    "stat.users": "عملاء سعداء",
    "stat.clock": "سنوات الخبرة",
    "stat.star": "تقييمات 5 نجوم",
    "stat.gamepad": "ألعاب أُطلقت",
    "stat.zap": "وقت الاستجابة",
    "stat.refresh": "معدل المراجعات",
    "stat.repeat": "احتفاظ بالعملاء",

    // CTA
    "cta.title": "هل أنت جاهز لتطوير لعبتك؟",
    "cta.subtitle": "ارتقِ بتجربة Roblox الخاصة بك مع تصميم UI احترافي ومتميز يحبه اللاعبون.",
    "cta.plan": "اختر الخطة",
    "cta.discord": "تواصل على ديسكورد",

    // Portfolio
    "portfolio.badge": "أعمالي",
    "portfolio.title": "تصاميم مميزة",
    "portfolio.subtitle": "استكشف مجموعتي من تصاميم UI/UX لألعاب وتطبيقات Roblox",
    "portfolio.cta": "هل تريد العمل معاً؟",
    "portfolio.ctaText": "لنصنع شيئاً مذهلاً معاً. تواصل معي ودعنا نناقش مشروعك.",
    "portfolio.discuss": "ناقش مشروعك",

    // Pricing
    "pricing.badge": "خطط الأسعار",
    "pricing.title": "أسعار بسيطة وواضحة",
    "pricing.subtitle": "اختر الخطة المثالية لاحتياجاتك",
    "pricing.hint": "جميع الخطط تتضمن تصاميم عالية الجودة، الملفات المصدرية، ودعم احترافي. يمكن الدفع عبر PayPal أو Robux.",
    "pricing.featured": "الأكثر شعبية",
    "pricing.goWith": "اختر هذه الخطة",
    "pricing.whyTitle": "لماذا تختارني؟",
    "pricing.faqTitle": "الأسئلة الشائعة",
    "pricing.stillQ": "هل لا تزال لديك أسئلة؟",
    "pricing.contactDiscord": "تواصل على ديسكورد",
    "pricing.includes": "يتضمن:",
    "pricing.unlimited": "غير محدود",
    "pricing.revisions": "مراجعات",
    "pricing.orderTitle": "رسالة الطلب",
    "pricing.copyMsg": "نسخ الرسالة",
    "pricing.copied": "تم النسخ!",
    "pricing.openDM": "فتح رسالة ديسكورد",

    // Reviews
    "reviews.badge": "شهادات العملاء",
    "reviews.title": "أحدث التقييمات",
    "reviews.subtitle": "شاهد ما يقوله عملائي عن العمل معي",
    "reviews.based": "بناءً على",
    "reviews.reviewsText": "تقييم",
    "reviews.ctaTitle": "هل عملنا معاً؟",
    "reviews.ctaText": "يسعدني سماع أفكارك عن عملية التصميم والنتائج النهائية.",
    "reviews.writeReview": "اكتب تقييمك",

    // Policies
    "policies.badge": "قانوني",
    "policies.title": "الشروط والأحكام",
    "policies.subtitle": "افهم سياسات وشروط عملي",
    "policies.questionsTitle": "هل لديك أسئلة؟",
    "policies.askDiscord": "اسأل على ديسكورد",
    "policies.contactDiscord": "تواصل على ديسكورد",
    "policies.noPolicies": "لم تتم إضافة أي سياسات بعد. أضف سياسات من لوحة التحكم.",
    "policies.sections": "أقسام السياسات",
    "policies.contactHint": "هل لديك أسئلة حول هذه السياسات؟ تواصل مباشرةً على ديسكورد.",

    // Games
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

    // Admin Login
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

    // Admin — Reviews Tab
    "admin.reviews.title": "التقييمات",
    "admin.reviews.desc": "إنشاء التقييمات وإشرافها وإدارتها",
    "admin.reviews.newBtn": "تقييم جديد",
    "admin.reviews.createTitle": "إنشاء تقييم جديد",
    "admin.reviews.editTitle": "تعديل التقييم",
    "admin.reviews.createBtn": "إنشاء تقييم",
    "admin.reviews.saveBtn": "حفظ التغييرات",
    "admin.reviews.filterAll": "الكل",
    "admin.reviews.filterPending": "قيد الانتظار",
    "admin.reviews.filterApproved": "موافق عليه",
    "admin.reviews.filterRejected": "مرفوض",
    "admin.reviews.approve": "موافقة",
    "admin.reviews.reject": "رفض",
    "admin.reviews.refresh": "تحديث",
    "admin.reviews.noReviews": "لم يُعثر على تقييمات",
    "admin.reviews.createFirst": "إنشاء أول تقييم",
    "admin.reviews.pin": "تثبيت",
    "admin.reviews.unpin": "إلغاء التثبيت",
    "admin.reviews.featured": "مثبت / مميز",
    "admin.reviews.autoApprove": "موافقة تلقائية (عام)",
    "admin.reviews.pinFeat": "تثبيت / تمييز",
    "admin.reviews.verified": "عميل موثق",
    "admin.reviews.created": "تم إنشاء التقييم",
    "admin.reviews.live": "مرئي على الموقع",
    "admin.reviews.asPending": "محفوظ كمعلق",
    "admin.reviews.statusApproved": "موافق عليه",
    "admin.reviews.statusPending": "قيد الانتظار",
    "admin.reviews.statusRejected": "مرفوض",

    // Admin — Users Tab
    "admin.users.title": "الجلسات",
    "admin.users.modPanel": "لوحة الإشراف",
    "admin.users.banUser": "حظر المستخدم",
    "admin.users.unbanUser": "رفع الحظر",
    "admin.users.liveAlert": "تنبيه مباشر",
    "admin.users.banBtn": "حظر الجلسة",
    "admin.users.alreadyBanned": "محظور بالفعل",
    "admin.users.unbanBtn": "رفع حظر الجلسة",
    "admin.users.notBanned": "غير محظور",
    "admin.users.sendAlert": "إرسال",
    "admin.users.clearAlert": "مسح التنبيه",
    "admin.users.actions": "إجراءات",
    "admin.users.refresh": "تحديث",
    "admin.users.noSessions": "لا توجد جلسات بعد.",
    "admin.users.noMatch": "لا توجد جلسات تطابق هذا الفلتر.",
    "admin.users.total": "الإجمالي",
    "admin.users.active": "نشط",
    "admin.users.banned": "محظور",
    "admin.users.dbError": "خطأ في قاعدة البيانات",
    "admin.users.reasonPlaceholder": "السبب (اختياري)",
    "admin.users.welcomeBack": "رسالة الترحيب",
    "admin.users.msgPlaceholder": "رسالة تظهر لهذا المستخدم الآن…",
    "admin.users.inactive": "غير نشط",
    "admin.users.loading": "جاري تحميل الجلسات…",
    "admin.users.clearAll": "حذف جميع الجلسات",
    "admin.users.clearAllConfirm": "حذف جميع سجلات الجلسات؟ لا يمكن التراجع.",

    // Admin — Games Tab
    "admin.games.title": "الألعاب",
    "admin.games.desc": "إدارة ألعاب روبلوكس — التغييرات تُطبَّق فوراً",
    "admin.games.addTitle": "إضافة لعبة جديدة",
    "admin.games.editTitle": "تعديل اللعبة",
    "admin.games.placeId": "معرف المكان",
    "admin.games.gameName": "اسم اللعبة (اختياري — تلقائي من روبلوكس)",
    "admin.games.creator": "اسم المبدع",
    "admin.games.displayOrder": "ترتيب العرض",
    "admin.games.published": "منشور (مرئي على الموقع)",
    "admin.games.saving": "جاري الحفظ…",
    "admin.games.updateBtn": "تحديث اللعبة",
    "admin.games.addBtn": "إضافة لعبة",
    "admin.games.noGames": "لا توجد ألعاب بعد — أضف واحدة أعلاه",
    "admin.games.refresh": "تحديث",
    "admin.games.howTitle": "كيف يعمل:",
    "admin.games.how1": "· أضف معرف المكان → تظهر اللعبة فوراً في صفحة الألعاب",
    "admin.games.how2": "· انقر 🔄 لمزامنة الأيقونة والاسم والزيارات من Roblox API",
    "admin.games.how3": "· بدّل النشر/الإخفاء بدون حذف",

    // Settings Modal
    "settings.title": "الإعدادات",
    "settings.customize": "خصّص تجربتك",
    "settings.language": "اللغة",
    "settings.theme": "المظهر",
    "settings.performance": "الأداء",
    "settings.contact": "تواصل",
    "settings.perfBooster": "معزز الأداء",
    "settings.perfBoosterDesc": "يُحسّن حلقات العرض ويقلل إعادة الرسم",
    "settings.ecoMode": "وضع الأجهزة المحدودة",
    "settings.ecoModeDesc": "يُعطّل الحركات والجسيمات والشرائط — يستبدلها بشبكات ثابتة",
    "settings.ecoActive": "وضع التوفير نشط — جميع الشرائط والجسيمات والانتقالات المعقدة تُستبدل بتخطيطات ثابتة خفيفة.",
    "settings.openDiscord": "فتح رسالة ديسكورد",
    "settings.closeLabel": "إغلاق الإعدادات",
    "settings.themeLight": "فاتح",
    "settings.themeDark": "داكن",
    "settings.themeSystem": "النظام",
    "settings.copyright": "© 2026 يوسف ديزاين — جميع الحقوق محفوظة",

    // Marquee Section
    "marquee.title": "ما يقوله الناس والإنجازات الرئيسية",
    "marquee.ecoLabel": "⚡ وضع الأجهزة المحدودة — التخطيط الثابت نشط",
    "marquee.noReviews": "لا توجد تقييمات بعد — كن الأول!",

    // About Section
    "about.badge":         "عني",
    "about.title":         "خلف البكسلات",
    "about.intro":         "مرحباً! أنا يوسف، مصمم UI/UX بدوام كامل عمري 20 عاماً وأكثر من سنتين من الخبرة في تصميم واجهات مستخدم فريدة وتفاعلية لألعاب Roblox. إذا كنت تحتاج مصمماً محترفاً يمنح لعبتك الظهور الذي تستحقه — فأنت في المكان الصحيح.",
    "about.offerTitle":    "ما أقدمه",
    "about.offer1":        "تصميم UI احترافي وإبداعي",
    "about.offer2":        "تخطيطات محسّنة لتجربة المستخدم",
    "about.offer3":        "استيراد الأصول مباشرةً داخل Roblox Studio",
    "about.offer4":        "مُحسَّن لجميع الأجهزة",
    "about.offer5":        "تسليم سريع مع تواصل سلس",
    "about.offer6":        "أسعار تنافسية مع ضمان الجودة",
    "about.whyTitle":      "لماذا أنا؟",
    "about.why1":          "ما يصل إلى 5 تعديلات مجانية حتى تكون راضياً 100%",
    "about.why2":          "شفافية تامة — أُبقيك على اطلاع في كل خطوة",
    "about.why3":          "تواصل دائم وتحديثات فورية بوصفي مصمماً بدوام كامل",
    "about.why4":          "ضمان استرداد المال إذا لم تكن راضياً",
    "about.ratesTitle":    "الأسعار",
    "about.rate1Label":    "تصميم UI",
    "about.rate1Price":    "15 دولار / إطار (أو 4,000 روبوكس / إطار، الضريبة مشمولة)",
    "about.rate2Label":    "استيراد UI",
    "about.rate2Price":    "5 دولار / إطار (نقل لجميع الأجهزة)",
    "about.paymentTitle":  "طرق الدفع",
    "about.payment":       "PayPal أو Robux. سعر الروبوكس يعكس الضريبة المطبّقة بالفعل.",
    "about.deliveryTitle": "التسليم",
    "about.delivery":      "ملفات نهائية كصور PNG نظيفة أو منقولة مباشرةً إلى مشروعك. ضمان استرداد 100% إذا لم تكن راضياً.",
    "about.cta":           "هل أنت مستعد لإحياء مشروعك على Roblox؟ تواصل معي اليوم.",
    "about.skill1":        "تصميم UI/UX",
    "about.skill2":        "Roblox Studio",
    "about.skill3":        "واجهات الألعاب",
    "about.skill4":        "هوية العلامة التجارية",

    // Not Found
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
    "submit": "إرسال",

    // ── Pricing Tier Names ────────────────────────────────────────────────
    "pricing.tier.1": "المبتدئ",
    "pricing.tier.2": "الأساسي",
    "pricing.tier.3": "المتوسط",
    "pricing.tier.4": "المتقدم",
    "pricing.tier.5": "اللعبة الكاملة",
    "pricing.tier.6": "استيراد لكل إطار",

    // ── Pricing Frames Labels ─────────────────────────────────────────────
    "pricing.p1.frames": "1–6 إطارات",
    "pricing.p2.frames": "7–15 إطاراً",
    "pricing.p3.frames": "16–35 إطاراً",
    "pricing.p4.frames": "36–60 إطاراً",
    "pricing.p5.frames": "غير محدود",
    "pricing.p6.frames": "لكل إطار",

    // ── Pricing Plan Features ─────────────────────────────────────────────
    "pricing.p1.f1": "1–6 إطارات",
    "pricing.p1.f2": "عناصر واجهة أساسية",
    "pricing.p1.f3": "مراجعتان مجانيتان",
    "pricing.p1.f4": "تسليم عادي",
    "pricing.p2.f1": "7–15 إطاراً",
    "pricing.p2.f2": "عناصر واجهة متقدمة",
    "pricing.p2.f3": "3 مراجعات مجانية",
    "pricing.p2.f4": "تسليم عادي",
    "pricing.p3.f1": "16–35 إطاراً",
    "pricing.p3.f2": "أيقونات مخصصة",
    "pricing.p3.f3": "4 مراجعات مجانية",
    "pricing.p3.f4": "تسليم ذو أولوية",
    "pricing.p4.f1": "36–60 إطاراً",
    "pricing.p4.f2": "تخطيطات معقدة",
    "pricing.p4.f3": "5 مراجعات مجانية",
    "pricing.p4.f4": "أولوية عالية",
    "pricing.p5.f1": "إطارات غير محدودة",
    "pricing.p5.f2": "نظام تصميم اللعبة الكامل",
    "pricing.p5.f3": "مراجعات غير محدودة",
    "pricing.p5.f4": "دعم VIP",
    "pricing.p6.f1": "استيراد إلى Studio",
    "pricing.p6.f2": "تحجيم الواجهة",
    "pricing.p6.f3": "مجلدات منظمة",
    "pricing.p6.f4": "جاهز للبرمجة",

    // ── Policy Titles & Descriptions ─────────────────────────────────────
    "policy.payment.title": "سياسة الدفع",
    "policy.payment.desc": "50% مقدماً و50% عند الإتمام. يجب الدفع قبل بدء العمل. نقبل PayPal وRobux وطرق دفع أخرى.",
    "policy.revision.title": "سياسة المراجعات",
    "policy.revision.desc": "تشمل كل خطة عدداً محدداً من المراجعات. قد تستلزم المراجعات الإضافية رسوماً إضافية. يُرجى تقديم ملاحظات واضحة لتقليل عدد المراجعات.",
    "policy.delivery.title": "وقت التسليم",
    "policy.delivery.desc": "تتفاوت أوقات التسليم بحسب الخطة المختارة. تستغرق الخطط الأساسية عادةً 3–5 أيام عمل. قد تتوفر طلبات الاستعجال بتكلفة إضافية.",
    "policy.refund.title": "سياسة الاسترداد",
    "policy.refund.desc": "تُدرس المبالغ المستردة كل حالة على حدة. يُرجى التواصل معنا خلال 48 ساعة من التسليم إذا لم تكن راضياً عن العمل.",
    "policy.communication.title": "التواصل",
    "policy.communication.desc": "يُرجى التواصل بوضوح وتقديم جميع التفاصيل اللازمة قبل بدء العمل. وقت الاستجابة عادةً خلال 24 ساعة.",

    // ── FAQ Questions & Answers ───────────────────────────────────────────
    "faq.1.q": "ما هي خدمات تصميم الواجهة التي تقدمها؟",
    "faq.1.a": "أتخصص في تصميم UI/UX لـ Roblox — بما في ذلك HUDs والقوائم وأنظمة المخزون وواجهات المتجر ولوحات المتصدرين وشاشات التحميل وأنظمة واجهة الألعاب الكاملة. أقدم أيضاً ملفات Figma المصدرية ويمكنني الاستيراد مباشرةً إلى Roblox Studio.",
    "faq.2.q": "هل المراجعات مشمولة؟",
    "faq.2.a": "نعم! كل خطة تتضمن مراجعات مجانية. الخطة المبتدئة تحصل على 2، الأساسية على 3، المتوسطة على 4، المتقدمة على 5، واللعبة الكاملة تحصل على مراجعات غير محدودة. المراجعات الإضافية خارج حد خطتك متاحة برسوم رمزية.",
    "faq.3.q": "هل تستورد الواجهة إلى Roblox Studio؟",
    "faq.3.a": "نعم — خدمة الاستيراد لكل إطار متاحة بـ5 دولار / 2.5K روبوكس للإطار. يشمل ذلك تحجيماً صحيحاً للواجهة وبنية مجلدات منظمة وإعداداً جاهزاً للبرمجة حتى يتمكن المطورون من تضمينه فوراً.",
    "faq.4.q": "ما طرق الدفع المقبولة؟",
    "faq.4.a": "أقبل الدولار الأمريكي عبر PayPal أو منصات مماثلة، والروبوكس عبر أموال المجموعة أو التبادل المباشر. شروط الدفع هي 50% مقدماً و50% عند التسليم للمشاريع الكبيرة.",
    "faq.5.q": "كم يستغرق التسليم؟",
    "faq.5.a": "يعتمد التسليم على الخطة والتعقيد. الخطتان المبتدئة والأساسية تستغرقان عادةً 1–3 أيام، المتوسطة والمتقدمة 3–7 أيام، وحزم اللعبة الكاملة 7–14 يوماً. التسليم السريع متاح عند الطلب.",
    "faq.6.q": "هل يمكنني الحصول على استرداد؟",
    "faq.6.a": "تُقيَّم عمليات الاسترداد كل حالة على حدة. إذا لم أبدأ العمل بعد، يُصدر استرداد كامل. بعد بدء العمل، قد يكون الاسترداد الجزئي متاحاً. بعد تسليم الملفات النهائية والموافقة عليها، لا تتوفر عمليات الاسترداد.",
    "faq.7.q": "هل أنت متاح لأدوار دوام كامل؟",
    "faq.7.a": "أنا منفتح حالياً على التعاونات طويلة الأمد وشراكات الاستوديوهات. إذا كنت بحاجة إلى مصمم واجهة مخصص لفريقك أو مشروعك المستمر، تواصل معي على ديسكورد لمناقشة الشروط.",
    "faq.8.q": "هل تقبل طلبات الاستعجال؟",
    "faq.8.a": "نعم! طلبات الاستعجال متاحة برسوم إضافية تعتمد على مدى الاستعجال والنطاق. تواصل معي على ديسكورد وسأطلعك على توفريتي الحالية وأسرع موعد تسليم يمكنني تقديمه.",
  },

  es: {
    // Navigation
    "nav.home": "Inicio",
    "nav.portfolio": "Portafolio",
    "nav.games": "Juegos",
    "nav.pricing": "Precios",
    "nav.reviews": "Reseñas",
    "nav.policies": "Políticas",
    "nav.discord": "Discord",

    // Buttons
    "btn.portfolio": "Ver Portafolio",
    "btn.pricing": "Ver Precios",
    "btn.discord": "Unirse a Discord",
    "btn.contact": "Contáctame",
    "btn.hire": "Contrátame",

    // Hero
    "hero.badge": "Disponible para Proyectos",
    "hero.title1": "Creando Interfaces",
    "hero.title2": "Inmersivas",
    "hero.subtitle": "Creando interfaces de usuario inmersivas y de alta calidad para tus experiencias de Roblox.",

    // Stats
    "stats.projects": "Proyectos",
    "stats.clients": "Clientes",
    "stats.rating": "Calificación",
    "stats.years": "Años de Experiencia",

    // Stat card titles
    "stat.briefcase": "Proyectos Completados",
    "stat.users": "Clientes Satisfechos",
    "stat.clock": "Años de Experiencia",
    "stat.star": "Reseñas de 5 Estrellas",
    "stat.gamepad": "Juegos Lanzados",
    "stat.zap": "Tiempo de Respuesta",
    "stat.refresh": "Tasa de Revisiones",
    "stat.repeat": "Retención de Clientes",

    // CTA
    "cta.title": "¿Listo para Transformar tu Juego?",
    "cta.subtitle": "Eleva tu experiencia de Roblox con un diseño UI profesional y premium que los jugadores adoran.",
    "cta.plan": "Elegir un Plan",
    "cta.discord": "Contactar en Discord",

    // Portfolio
    "portfolio.badge": "Mi Trabajo",
    "portfolio.title": "Diseños Destacados",
    "portfolio.subtitle": "Explora mi colección de diseños UI/UX para juegos y aplicaciones de Roblox",
    "portfolio.cta": "¿Quieres Trabajar Juntos?",
    "portfolio.ctaText": "Creemos algo increíble juntos. Ponte en contacto y discutamos tu proyecto.",
    "portfolio.discuss": "Discutir Tu Proyecto",

    // Pricing
    "pricing.badge": "Planes de Precios",
    "pricing.title": "Precios Simples y Transparentes",
    "pricing.subtitle": "Elige el plan perfecto para tus necesidades",
    "pricing.hint": "Todos los planes incluyen diseños de alta calidad, archivos fuente y soporte profesional. El pago se puede realizar mediante PayPal o Robux.",
    "pricing.featured": "Más Popular",
    "pricing.goWith": "Ir con este plan",
    "pricing.whyTitle": "¿Por Qué Elegirme?",
    "pricing.faqTitle": "Preguntas Frecuentes",
    "pricing.stillQ": "¿Aún Tienes Preguntas?",
    "pricing.contactDiscord": "Contactar en Discord",
    "pricing.includes": "Incluye:",
    "pricing.unlimited": "Ilimitado",
    "pricing.revisions": "revisiones",
    "pricing.orderTitle": "Mensaje de Pedido",
    "pricing.copyMsg": "Copiar Mensaje",
    "pricing.copied": "¡Copiado!",
    "pricing.openDM": "Abrir DM de Discord",

    // Reviews
    "reviews.badge": "Testimonios",
    "reviews.title": "Últimas Reseñas",
    "reviews.subtitle": "Mira lo que mis clientes dicen sobre trabajar conmigo",
    "reviews.based": "basado en",
    "reviews.reviewsText": "reseñas",
    "reviews.ctaTitle": "¿Hemos trabajado juntos?",
    "reviews.ctaText": "Me encantaría escuchar tus pensamientos sobre el proceso de diseño y los resultados finales.",
    "reviews.writeReview": "Escribir una Reseña",

    // Policies
    "policies.badge": "Legal",
    "policies.title": "Políticas y Términos",
    "policies.subtitle": "Comprende mis políticas y términos de trabajo",
    "policies.questionsTitle": "¿Tienes Preguntas?",
    "policies.askDiscord": "Preguntar en Discord",
    "policies.contactDiscord": "Contactar en Discord",
    "policies.noPolicies": "No se han añadido políticas aún. Añade políticas desde el panel de administración.",
    "policies.sections": "Secciones de Políticas",
    "policies.contactHint": "¿Tienes preguntas sobre estas políticas? Contáctanos directamente en Discord.",

    // Games
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

    // Admin Login
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

    // Admin — Reviews Tab
    "admin.reviews.title": "Reseñas",
    "admin.reviews.desc": "Crear, moderar y gestionar comentarios de clientes",
    "admin.reviews.newBtn": "Nueva Reseña",
    "admin.reviews.createTitle": "Crear Nueva Reseña",
    "admin.reviews.editTitle": "Editar Reseña",
    "admin.reviews.createBtn": "Crear Reseña",
    "admin.reviews.saveBtn": "Guardar Cambios",
    "admin.reviews.filterAll": "Todos",
    "admin.reviews.filterPending": "Pendiente",
    "admin.reviews.filterApproved": "Aprobado",
    "admin.reviews.filterRejected": "Rechazado",
    "admin.reviews.approve": "Aprobar",
    "admin.reviews.reject": "Rechazar",
    "admin.reviews.refresh": "Actualizar",
    "admin.reviews.noReviews": "No se encontraron reseñas",
    "admin.reviews.createFirst": "Crear la primera reseña",
    "admin.reviews.pin": "Fijar",
    "admin.reviews.unpin": "Desfijar",
    "admin.reviews.featured": "Destacado / Fijado",
    "admin.reviews.autoApprove": "Aprobación automática (público)",
    "admin.reviews.pinFeat": "Fijar / Destacar",
    "admin.reviews.verified": "Cliente Verificado",
    "admin.reviews.created": "Reseña creada",
    "admin.reviews.live": "En vivo en el sitio",
    "admin.reviews.asPending": "Guardado como pendiente",
    "admin.reviews.statusApproved": "Aprobado",
    "admin.reviews.statusPending": "Pendiente",
    "admin.reviews.statusRejected": "Rechazado",

    // Admin — Users Tab
    "admin.users.title": "Sesiones",
    "admin.users.modPanel": "Panel de Moderación",
    "admin.users.banUser": "Banear Usuario",
    "admin.users.unbanUser": "Desbanear Usuario",
    "admin.users.liveAlert": "Alerta en Vivo",
    "admin.users.banBtn": "Banear Sesión",
    "admin.users.alreadyBanned": "Ya Baneado",
    "admin.users.unbanBtn": "Desbanear Sesión",
    "admin.users.notBanned": "No Baneado",
    "admin.users.sendAlert": "Enviar",
    "admin.users.clearAlert": "Borrar alerta",
    "admin.users.actions": "Acciones",
    "admin.users.refresh": "Actualizar",
    "admin.users.noSessions": "No hay sesiones aún.",
    "admin.users.noMatch": "No hay sesiones que coincidan con este filtro.",
    "admin.users.total": "Total",
    "admin.users.active": "Activo",
    "admin.users.banned": "Baneado",
    "admin.users.dbError": "Error de Base de Datos",
    "admin.users.reasonPlaceholder": "Razón (opcional)",
    "admin.users.welcomeBack": "Mensaje de bienvenida",
    "admin.users.msgPlaceholder": "Mensaje mostrado a este usuario ahora…",
    "admin.users.inactive": "Inactivo",
    "admin.users.loading": "Cargando sesiones…",
    "admin.users.clearAll": "Borrar Todas las Sesiones",
    "admin.users.clearAllConfirm": "¿Eliminar todos los registros de sesiones? Esta acción no se puede deshacer.",

    // Admin — Games Tab
    "admin.games.title": "Juegos",
    "admin.games.desc": "Gestionar juegos de Roblox — los cambios se aplican en vivo",
    "admin.games.addTitle": "Agregar Nuevo Juego",
    "admin.games.editTitle": "Editar Juego",
    "admin.games.placeId": "ID de Lugar",
    "admin.games.gameName": "Nombre del Juego (opcional — auto desde Roblox)",
    "admin.games.creator": "Nombre del Creador",
    "admin.games.displayOrder": "Orden de Visualización",
    "admin.games.published": "Publicado (visible en el sitio)",
    "admin.games.saving": "Guardando…",
    "admin.games.updateBtn": "Actualizar Juego",
    "admin.games.addBtn": "Agregar Juego",
    "admin.games.noGames": "No hay juegos aún — agrega uno arriba",
    "admin.games.refresh": "Actualizar",
    "admin.games.howTitle": "Cómo funciona:",
    "admin.games.how1": "· Agrega un Place ID → el juego aparece en la página de Juegos inmediatamente",
    "admin.games.how2": "· Haz clic en 🔄 para sincronizar icono, nombre y visitas desde la API de Roblox",
    "admin.games.how3": "· Alterna publicar/ocultar sin eliminar",

    // Settings Modal
    "settings.title": "Configuración",
    "settings.customize": "Personaliza tu experiencia",
    "settings.language": "Idioma",
    "settings.theme": "Tema",
    "settings.performance": "Rendimiento",
    "settings.contact": "Contacto",
    "settings.perfBooster": "Potenciador de Rendimiento",
    "settings.perfBoosterDesc": "Prioriza los ciclos de renderizado y reduce repintados",
    "settings.ecoMode": "Modo Dispositivo de Gama Baja",
    "settings.ecoModeDesc": "Desactiva animaciones, partículas y marquesinas — reemplaza con cuadrículas estáticas",
    "settings.ecoActive": "Modo Eco activo — todas las marquesinas, partículas y transiciones complejas se reemplazan con diseños estáticos ligeros.",
    "settings.openDiscord": "Abrir DM de Discord",
    "settings.closeLabel": "Cerrar ajustes",
    "settings.themeLight": "Claro",
    "settings.themeDark": "Oscuro",
    "settings.themeSystem": "Sistema",
    "settings.copyright": "© 2026 Youssef Design — Todos los Derechos Reservados",

    // Marquee Section
    "marquee.title": "Lo que Dicen y Logros Clave",
    "marquee.ecoLabel": "⚡ Modo Dispositivo de Gama Baja — diseño estático activo",
    "marquee.noReviews": "¡Aún no hay reseñas — sé el primero!",

    // About Section
    "about.badge":         "Sobre mí",
    "about.title":         "Detrás de los Píxeles",
    "about.intro":         "¡Hola! Soy Youssef, diseñador UI/UX a tiempo completo con 20 años y más de 2 años de experiencia creando interfaces únicas, animadas e interactivas para juegos de Roblox. Si necesitas un diseñador profesional que le dé a tu juego la visibilidad que merece, estás en el lugar indicado.",
    "about.offerTitle":    "Qué Ofrezco",
    "about.offer1":        "Diseño UI profesional y creativo",
    "about.offer2":        "Layouts optimizados para UX",
    "about.offer3":        "Importación directa de assets en Roblox Studio",
    "about.offer4":        "Escalado y optimizado para todos los dispositivos",
    "about.offer5":        "Entrega rápida con comunicación fluida",
    "about.offer6":        "Precios competitivos con garantía de calidad",
    "about.whyTitle":      "¿Por Qué Yo?",
    "about.why1":          "Hasta 5 revisiones gratuitas hasta que estés 100% satisfecho",
    "about.why2":          "Total transparencia — te mantengo informado en cada paso",
    "about.why3":          "Actualizaciones frecuentes y respuestas inmediatas como diseñador a tiempo completo",
    "about.why4":          "Garantía de devolución si no estás satisfecho",
    "about.ratesTitle":    "Tarifas",
    "about.rate1Label":    "Diseño UI",
    "about.rate1Price":    "$15 / frame (o 4,000 Robux / frame, impuesto incluido)",
    "about.rate2Label":    "Importar UI",
    "about.rate2Price":    "$5 / frame (porteo a todos los dispositivos)",
    "about.paymentTitle":  "Pago",
    "about.payment":       "PayPal o Robux. El precio en Robux ya incluye el impuesto aplicable.",
    "about.deliveryTitle": "Entrega",
    "about.delivery":      "Archivos finales como PNGs limpios o integrados directamente en tu proyecto de Roblox. Garantía de reembolso del 100% si no estás satisfecho.",
    "about.cta":           "¿Listo para dar vida a tu proyecto de Roblox? Contáctame hoy.",
    "about.skill1":        "Diseño UI/UX",
    "about.skill2":        "Roblox Studio",
    "about.skill3":        "Interfaces de Juegos",
    "about.skill4":        "Identidad de Marca",

    // Not Found
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
    "submit": "Enviar",

    // ── Pricing Tier Names ────────────────────────────────────────────────
    "pricing.tier.1": "Principiante",
    "pricing.tier.2": "Básico",
    "pricing.tier.3": "Intermedio",
    "pricing.tier.4": "Avanzado",
    "pricing.tier.5": "Juego Completo",
    "pricing.tier.6": "Importar por Fotograma",

    // ── Pricing Frames Labels ─────────────────────────────────────────────
    "pricing.p1.frames": "1–6 fotogramas",
    "pricing.p2.frames": "7–15 fotogramas",
    "pricing.p3.frames": "16–35 fotogramas",
    "pricing.p4.frames": "36–60 fotogramas",
    "pricing.p5.frames": "Ilimitado",
    "pricing.p6.frames": "Por Fotograma",

    // ── Pricing Plan Features ─────────────────────────────────────────────
    "pricing.p1.f1": "1–6 Fotogramas",
    "pricing.p1.f2": "Elementos UI Básicos",
    "pricing.p1.f3": "Hasta 2 Revisiones Gratis",
    "pricing.p1.f4": "Entrega Estándar",
    "pricing.p2.f1": "7–15 Fotogramas",
    "pricing.p2.f2": "Elementos UI Avanzados",
    "pricing.p2.f3": "Hasta 3 Revisiones Gratis",
    "pricing.p2.f4": "Entrega Estándar",
    "pricing.p3.f1": "16–35 Fotogramas",
    "pricing.p3.f2": "Íconos Personalizados",
    "pricing.p3.f3": "Hasta 4 Revisiones Gratis",
    "pricing.p3.f4": "Entrega Prioritaria",
    "pricing.p4.f1": "36–60 Fotogramas",
    "pricing.p4.f2": "Diseños Complejos",
    "pricing.p4.f3": "Hasta 5 Revisiones Gratis",
    "pricing.p4.f4": "Alta Prioridad",
    "pricing.p5.f1": "Fotogramas Ilimitados",
    "pricing.p5.f2": "Sistema de Diseño Completo",
    "pricing.p5.f3": "Revisiones Ilimitadas",
    "pricing.p5.f4": "Soporte VIP",
    "pricing.p6.f1": "Importar a Studio",
    "pricing.p6.f2": "Escalado de UI",
    "pricing.p6.f3": "Carpetas Organizadas",
    "pricing.p6.f4": "Listo para Scripting",

    // ── Policy Titles & Descriptions ─────────────────────────────────────
    "policy.payment.title": "Política de Pago",
    "policy.payment.desc": "50% por adelantado, 50% al completar. El pago debe realizarse antes de comenzar el trabajo. Aceptamos PayPal, Robux y otros métodos de pago.",
    "policy.revision.title": "Política de Revisiones",
    "policy.revision.desc": "Cada plan incluye un número específico de revisiones. Las revisiones adicionales pueden tener cargos extra. Por favor proporciona feedback claro para minimizar revisiones.",
    "policy.delivery.title": "Tiempo de Entrega",
    "policy.delivery.desc": "Los tiempos de entrega varían según el plan seleccionado. Los planes básicos generalmente tardan 3–5 días hábiles. Los pedidos urgentes pueden estar disponibles por un cargo adicional.",
    "policy.refund.title": "Política de Reembolso",
    "policy.refund.desc": "Los reembolsos se consideran caso por caso. Por favor contáctanos dentro de las 48 horas de la entrega si no estás satisfecho con el trabajo.",
    "policy.communication.title": "Comunicación",
    "policy.communication.desc": "Por favor comunícate claramente y proporciona todos los detalles necesarios antes de comenzar el trabajo. El tiempo de respuesta es típicamente dentro de las 24 horas.",

    // ── FAQ Questions & Answers ───────────────────────────────────────────
    "faq.1.q": "¿Qué servicios de diseño UI ofreces?",
    "faq.1.a": "Me especializo en diseño UI/UX para Roblox, incluyendo HUDs, menús, sistemas de inventario, UIs de tienda, tablas de clasificación, pantallas de carga y sistemas de UI de juego completos. También proporciono archivos fuente de Figma y puedo importar directamente a Roblox Studio.",
    "faq.2.q": "¿Las revisiones están incluidas?",
    "faq.2.a": "¡Sí! Cada plan incluye revisiones gratuitas. Principiante obtiene 2, Básico obtiene 3, Intermedio obtiene 4, Avanzado obtiene 5, y Juego Completo obtiene revisiones ilimitadas. Las revisiones adicionales más allá del límite de tu plan están disponibles por una pequeña tarifa.",
    "faq.3.q": "¿Importas la UI a Roblox Studio?",
    "faq.3.a": "Sí — el servicio de Importar por Fotograma está disponible por $5 / 2.5K Robux por fotograma. Esto incluye escalado de UI adecuado, estructura de carpetas organizada y configuración lista para scripting para que los desarrolladores puedan integrarlo inmediatamente.",
    "faq.4.q": "¿Qué métodos de pago aceptas?",
    "faq.4.a": "Acepto USD mediante PayPal o plataformas similares, y Robux mediante fondos de grupo o intercambio directo. Los términos de pago son 50% por adelantado y 50% al momento de la entrega para proyectos más grandes.",
    "faq.5.q": "¿Cuánto tiempo tarda la entrega?",
    "faq.5.a": "La entrega depende del plan y la complejidad. Principiante y Básico típicamente toman 1–3 días, Intermedio y Avanzado toman 3–7 días, y los paquetes de Juego Completo toman 7–14 días. La entrega urgente está disponible bajo solicitud.",
    "faq.6.q": "¿Puedo obtener un reembolso?",
    "faq.6.a": "Los reembolsos se evalúan caso por caso. Si no he comenzado el trabajo aún, se emite un reembolso completo. Después de que el trabajo ha comenzado, puede estar disponible un reembolso parcial. Una vez que los archivos finales son entregados y aprobados, los reembolsos no están disponibles.",
    "faq.7.q": "¿Estás disponible para roles a tiempo completo?",
    "faq.7.a": "Actualmente estoy abierto a colaboraciones a largo plazo y asociaciones con estudios. Si necesitas un diseñador UI dedicado para tu equipo o proyecto continuo, no dudes en contactarme en Discord para discutir los términos.",
    "faq.8.q": "¿Aceptas pedidos urgentes?",
    "faq.8.a": "¡Sí! Los pedidos urgentes están disponibles por un cargo adicional dependiendo de la urgencia y el alcance. Contáctame en Discord y te haré saber mi disponibilidad actual y el tiempo de entrega más rápido que puedo ofrecer.",
  },
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