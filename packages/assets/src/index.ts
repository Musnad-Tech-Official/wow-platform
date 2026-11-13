/**
 * Static React Native/Expo asset registry.
 * Keep require() arguments as literals for Metro/Expo web bundling.
 * Source SVG files in /source are archival masters, NOT runtime imports.
 */
export const wowBrand = {
  logoPrimary: require("../assets/brand/logo-primary.png"),
  logoPrimaryDark: require("../assets/brand/logo-primary-dark.png"),
  logoNavy: require("../assets/brand/logo-navy.png"),
  logoWhite: require("../assets/brand/logo-white.png"),
  appIcon: require("../assets/brand/app-icon-1024.png"),
} as const;

export const wowIllustrations = {
  customer: {
    searchEmpty: require("../assets/illustrations/customer/ill_search_empty.webp"),
    offersEmpty: require("../assets/illustrations/customer/ill_offers_empty.webp"),
    savedOffersEmpty: require("../assets/illustrations/customer/ill_saved_offers_empty.webp"),
    savedMerchantsEmpty: require("../assets/illustrations/customer/ill_saved_merchants_empty.webp"),
    complaintsEmpty: require("../assets/illustrations/customer/ill_complaints_empty.webp"),
    mapUnavailable: require("../assets/illustrations/customer/ill_map_unavailable.webp"),
    beaconHero: require("../assets/illustrations/customer/mascot_beacon_hero.webp"),
    beaconWalk: require("../assets/illustrations/customer/mascot_beacon_walk.webp"),
    discoverGuide: require("../assets/illustrations/customer/ill_discover_guide.webp"),
    secureAccess: require("../assets/illustrations/customer/ill_secure_access.webp"),
    favoritesGuide: require("../assets/illustrations/customer/ill_favorites_guide.webp"),
    complaintGuidance: require("../assets/illustrations/customer/ill_complaint_guidance.webp"),
    registeredGuide: require("../assets/illustrations/customer/ill_registered_guide.webp"),
  },
  merchant: {
    beaconCalm: require("../assets/illustrations/merchant/beacon-calm.webp"),
    beaconEmpty: require("../assets/illustrations/merchant/beacon-empty.webp"),
    beaconGuide: require("../assets/illustrations/merchant/beacon-guide.webp"),
    beaconHelp: require("../assets/illustrations/merchant/beacon-help.webp"),
    beaconThinking: require("../assets/illustrations/merchant/beacon-thinking.webp"),
    beaconWelcome: require("../assets/illustrations/merchant/beacon-welcome.webp"),
    onboardingBeaconStore: require("../assets/illustrations/merchant/onboarding-beacon-and-store.png"),
    onboardingBeaconDelegate: require("../assets/illustrations/merchant/onboarding-beacon-delegate.png"),
    onboardingBeaconBranches: require("../assets/illustrations/merchant/WOW_MER-02-03_APPROVED_STORE_MASCOT.png"),
    reviewMascot: require("../assets/illustrations/merchant/WOW_MER-02-04_REVIEW_MASCOT.png"),
    statusMascot: require("../assets/illustrations/merchant/WOW_MER-02-05_STATUS_MASCOT.png"),
    dashboardMascot: require("../assets/illustrations/merchant/WOW_MER-03_DASHBOARD_MASCOT.png"),
    offersMascot: require("../assets/illustrations/merchant/WOW_MER-04_OFFERS_MASCOT_SCENE.png"),
    offerDefinitionThinking: require("../assets/illustrations/merchant/MER-05-01_WOW_OFFICIAL_THINKING.webp"),
    offerPricingGuide: require("../assets/illustrations/merchant/MER-05-02_WOW_OFFICIAL_GUIDE.webp"),
    offerBranchesCalendar: require("../assets/illustrations/merchant/MER-05-03_WOW_OFFICIAL_BRANCHES_CALENDAR.png"),
    offerEvidencePrivacy: require("../assets/illustrations/merchant/MER-05-04_WOW_OFFICIAL_PRIVACY.webp"),
    offerReviewBase: require("../assets/illustrations/merchant/MER-05-05_WOW_OFFICIAL_BASE.webp"),
    offerDetailsReview: require("../assets/illustrations/merchant/MER-06_WOW_OFFICIAL_REVIEW.webp"),
    mer12AccountMascot: require("../assets/illustrations/merchant/WOW_MER-12_MASCOT.webp"),
    mer07BranchesMascot: require("../assets/illustrations/merchant/WOW_MER-07_MASCOT.png"),
    mer0701BranchEditorMascot: require("../assets/illustrations/merchant/WOW_MER-07-01_MASCOT.png"),
    mer10SubscriptionMascot: require("../assets/illustrations/merchant/WOW_MER-10_MASCOT.png"),
    mer11TeamMascot: require("../assets/illustrations/merchant/WOW_MER-11_MASCOT.png"),
    mer1101TeamEditorMascot: require("../assets/illustrations/merchant/WOW_MER-11-01_MASCOT.png"),
    mer08ComplaintsMascot: require("../assets/illustrations/merchant/WOW_MER-08_MASCOT.png"),
    mer09ComplaintDetailsMascot: require("../assets/illustrations/merchant/WOW_MER-09_MASCOT.png"),
  },
  admin: {
    beaconEmpty: require("../assets/illustrations/admin/beacon-empty.webp"),
    beaconSecurity: require("../assets/illustrations/admin/beacon-security.webp"),
  },
} as const;

/** See asset-manifest.json for source and SHA-256 provenance. */
export type WowBrandAsset = keyof typeof wowBrand;
export type WowIllustrationGroup = keyof typeof wowIllustrations;
