"use client";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { ChevronRight, KeyRound, Languages, LogOut, Moon, Settings as SettingsIcon, ShieldCheck, Sun, User as UserIcon } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { useLang } from "@/features/i18n/provider";
import { LANGUAGES } from "@/features/i18n/config";
import { useBackGuard } from "@/lib/back-stack";

/**
 * Phone profile card (IndusFlexoERP style), opened from the top bar's avatar over a dimmed screen:
 *
 *   (initials)  Ramesh Patel  [Admin]
 *               ramesh
 *   [ Theme  Light ▸ ] [ Language  EN ▸ ]
 *   Change Password                          ›
 *   [ ⚙ Settings ]        [ ⎋ Log Out ]
 */
export default function ProfileCard({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const { lang, setLang } = useLang();
  const isDark = resolvedTheme === "dark";
  useBackGuard(open, onClose);   // Android / browser Back closes the card

  if (!open) return null;
  const go = (href: string) => { onClose(); router.push(href); };
  const initials = (user?.fullName || "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
  const current = LANGUAGES.find((l) => l.code === lang) ?? LANGUAGES[0];
  const nextLang = () => {
    const i = LANGUAGES.findIndex((l) => l.code === lang);
    setLang(LANGUAGES[(i + 1) % LANGUAGES.length].code);
  };

  return (
    <div className="pc-backdrop" onClick={onClose}>
      <div className="pc-card" role="dialog" aria-modal="true" aria-label="Profile" onClick={(e) => e.stopPropagation()}>
        <div className="pc-head">
          <span className="st-avatar-ring">
            <span className="st-avatar" style={{ width: 52, height: 52, fontSize: 18 }}>
              {initials || <UserIcon size={24} aria-hidden />}
            </span>
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div className="pc-name-row">
              <span className="pc-name">{user?.fullName || "User"}</span>
              {user?.roleName && <span className="pc-role"><ShieldCheck size={11} aria-hidden /> {user.roleName}</span>}
            </div>
            {user?.userName && <div className="pc-email">{user.userName}</div>}
          </div>
        </div>

        <div className="pc-tiles">
          <button type="button" className="pc-tile" onClick={() => setTheme(isDark ? "light" : "dark")} aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}>
            <span className="pc-tile-icon" data-tone="primary">{isDark ? <Moon size={17} /> : <Sun size={17} />}</span>
            <span style={{ minWidth: 0 }}><span className="pc-tile-label">Theme</span><span className="pc-tile-value">{isDark ? "Dark" : "Light"} <ChevronRight size={13} aria-hidden /></span></span>
          </button>
          <button type="button" className="pc-tile" onClick={nextLang} aria-label="Change language">
            <span className="pc-tile-icon" data-tone="teal"><Languages size={17} /></span>
            <span style={{ minWidth: 0 }}><span className="pc-tile-label">Language</span><span className="pc-tile-value">{current.label} <ChevronRight size={13} aria-hidden /></span></span>
          </button>
        </div>

        <div className="pc-list">
          <button type="button" className="pc-row" onClick={() => go("/change-password")}>
            <span className="pc-tile-icon" data-tone="orange"><KeyRound size={17} /></span><span className="pc-row-label">Change Password</span><ChevronRight size={18} className="st-row-chevron" />
          </button>
        </div>

        <div className="pc-actions">
          <button type="button" className="pc-btn" onClick={() => go("/settings")}><SettingsIcon size={17} /> Settings</button>
          <button type="button" className="pc-btn pc-btn-danger" onClick={() => { onClose(); void logout(); }}><LogOut size={17} /> Log Out</button>
        </div>
      </div>
    </div>
  );
}
