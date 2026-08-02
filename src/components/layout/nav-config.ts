import { Sprout } from "lucide-react";

/**
 * The MENU is not here any more - it lives in app.ModuleMaster and arrives via
 * GET /api/modules/sidebar, so adding a screen is an INSERT rather than an edit
 * to this file. See features/navigation/hooks.ts.
 *
 * What remains is the shop's identity, which is a build-time constant rather
 * than navigation: it never varies by user, role or route.
 */
export const brand = {
  /** Shown in the header. */
  name: "Shree Ram Krishi Seva Kendra ERP",
  /** For the mobile drawer and anywhere the full name will not fit. */
  shortName: "Shree Ram Krishi",
  tagline: "Seva Kendra ERP",
  icon: Sprout,
};
