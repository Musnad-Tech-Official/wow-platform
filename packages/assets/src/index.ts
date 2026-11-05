/**
 * Static React Native/Expo asset registry.
 * Keep require() arguments as literals for Metro/Expo web bundling.
 * Source SVG files in /source are archival masters, NOT runtime imports.
 */
export const wowBrand = {
  logoPrimary: require("../assets/brand/logo-primary.png"),
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
  },
  admin: {
    beaconEmpty: require("../assets/illustrations/admin/beacon-empty.webp"),
    beaconSecurity: require("../assets/illustrations/admin/beacon-security.webp"),
  },
} as const;

/** See asset-manifest.json for source and SHA-256 provenance. */
export type WowBrandAsset = keyof typeof wowBrand;
export type WowIllustrationGroup = keyof typeof wowIllustrations;
