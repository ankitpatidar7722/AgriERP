import { redirect } from "next/navigation";

/**
 * The root has no content of its own. Where a visitor actually lands is decided
 * by the app layout's guard - unauthenticated users bounce to /login from
 * there, so the redirect target is the same either way.
 */
export default function HomePage() {
  redirect("/dashboard");
}
