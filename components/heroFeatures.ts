import { Languages, MapPin, Mic, Users, type LucideIcon } from "lucide-react";

export type HeroFeatureKey = "nearbyServices" | "voiceAssistant" | "multiLanguage" | "ruralCommunities";

export interface HeroFeature {
  key: HeroFeatureKey;
  icon: LucideIcon;
}

export const HERO_FEATURES: HeroFeature[] = [
  { key: "nearbyServices", icon: MapPin },
  { key: "voiceAssistant", icon: Mic },
  { key: "multiLanguage", icon: Languages },
  { key: "ruralCommunities", icon: Users },
];
