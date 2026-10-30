"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  ChevronLeft, ChevronRight, CircleUser, Hand, KeyRound, Languages, LogOut, Moon, Search, SearchX, Smartphone, Sun, X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/features/auth/auth-context";
import { useLang } from "@/features/i18n/provider";
import { LANGUAGES } from "@/features/i18n/config";
import { GESTURE_OPTIONS, setGesture, useGesturePrefs } from "@/lib/gesturePrefs";
import { useBackGuard } from "@/lib/back-stack";
import InstallAppButton from "@/components/phone/InstallAppButton";

/**
 * Settings, laid out like the phone's own Settings app (IndusFlexoERP / Indus 360 SettingsPhone):
 *   Home     account card · search · grouped rows (round tinted icon, label, one-line summary, chevron) · Logout.
 *   Section  ‹ + section name, one line saying what it is for, then its controls.
 * Works the same on a desktop browser (a centred column), so the profile menu can link here everywhere.
 */
type SectionId = "appearance" | "language" | "gestures" | "app";
type Tone = "primary" | "error" | "orange" | "purple" | "teal";

interface SectionMeta { id: SectionId; label: string; icon: LucideIcon; tone: Tone; summary: string; description: string; items: string[] }

const SECTIONS: SectionMeta[] = [
  { id: "appearance", label: "Display & theme", icon: Sun, tone: "orange", summary: "Light, dark or follow the phone",
    description: "How the app looks. System follows your phone's own light / dark setting.", items: ["Theme", "Dark mode", "Light mode"] },
  { id: "language", label: "Language", icon: Languages, tone: "teal", summary: "English, Hindi or Hinglish",
    description: "The language of menus, labels and messages.", items: LANGUAGES.map((l) => l.label) },
  { id: "gestures", label: "Gestures", icon: Hand, tone: "purple", summary: "Pull, hold and vibration",
    description: "Shortcuts you do with a swipe or a touch — turn any of them off here.", items: GESTURE_OPTIONS.map((g) => g.label).concat(["Haptics"]) },
  { id: "app", label: "App", icon: Smartphone, tone: "primary", summary: "Install on this phone",
    description: "Add AgriERP to the home screen so it opens like an app.", items: ["Install App", "Home screen"] },
];
const byId = (id: SectionId) => SECTIONS.find((s) => s.id === id)!;

export default function SettingsPage() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [open, setOpen] = useState<SectionId | null>(null);
  const [q, setQ] = useState("");
  useBackGuard(open !== null, () => setOpen(null));   // Android Back = back to the settings list

  const term = q.trim().toLowerCase();
  const results = useMemo(() => {
    if (!term) return [];
    const out: { key: string; section: SectionMeta; label: string; isSection: boolean }[] = [];
    for (const s of SECTIONS) {
      if (s.label.toLowerCase().includes(term) || s.summary.toLowerCase().includes(term)) out.push({ key: s.id, section: s, label: s.label, isSection: true });
      for (const item of s.items) if (item.toLowerCase().includes(term)) out.push({ key: `${s.id}:${item}`, section: s, label: item, isSection: false });
    }
    return out;
  }, [term]);

  const initials = (user?.fullName || "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");

  if (open) {
    const s = byId(open);
    return (
      <div className="st-home mx-auto max-w-xl">
        <div className="st-section-head">
          <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <button type="button" className="phone-icon-btn" onClick={() => setOpen(null)} aria-label="Back to settings"><ChevronLeft size={24} /></button>
            <h2 className="st-section-title">{s.label}</h2>
          </div>
          <p className="st-section-desc">{s.description}</p>
        </div>
        {open === "appearance" && <ThemeSection />}
        {open === "language" && <LanguageSection />}
        {open === "gestures" && <GestureSection />}
        {open === "app" && (
          <div className="st-group" style={{ padding: 16 }}>
            <InstallAppButton variant="card" />
            <p className="st-row-summary st-wrap" style={{ marginTop: 10 }}>
              The install button appears when this browser can install the app (Chrome / Edge on Android, or Share → Add to Home Screen on iPhone).
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="st-home mx-auto max-w-xl">
      {!term && (
        <button type="button" className="st-account m-glass-card" onClick={() => router.push("/change-password")}>
          <span className="st-avatar-ring">
            <span className="st-avatar">{initials || <CircleUser size={28} aria-hidden />}</span>
          </span>
          <span style={{ minWidth: 0, flex: 1 }}>
            <span className="st-account-name">{user?.fullName || "Profile"}</span>
            <span className="st-account-email">{user?.userName}{user?.roleName ? ` · ${user.roleName}` : ""}</span>
            <span className="st-account-link">Change password <ChevronRight size={15} aria-hidden /></span>
          </span>
        </button>
      )}

      <label className="st-search">
        <Search size={18} style={{ flexShrink: 0, opacity: 0.55 }} />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search settings" aria-label="Search settings" enterKeyHint="search" autoComplete="off" />
        {q && <button type="button" onClick={() => setQ("")} aria-label="Clear search" className="pl-clear"><X size={16} /></button>}
      </label>

      {term ? (
        results.length === 0 ? (
          <div className="st-empty"><SearchX size={28} aria-hidden /><div>No settings match</div><small>Try another word, like theme or language.</small></div>
        ) : (
          <div className="st-group">
            {results.map((r) => (
              <Row key={r.key} icon={r.section.icon} tone={r.section.tone} label={r.label}
                summary={r.isSection ? r.section.summary : r.section.label} onClick={() => { setQ(""); setOpen(r.section.id); }} />
            ))}
          </div>
        )
      ) : (
        <>
          <section>
            <h2 className="st-group-title">Preferences</h2>
            <div className="st-group">
              {(["appearance", "language", "gestures"] as SectionId[]).map((id) => {
                const s = byId(id);
                return <Row key={id} icon={s.icon} tone={s.tone} label={s.label} summary={s.summary} onClick={() => setOpen(id)} />;
              })}
            </div>
          </section>
          <section>
            <h2 className="st-group-title">Account</h2>
            <div className="st-group">
              <Row icon={KeyRound} tone="error" label="Change Password" summary="Your sign-in password" onClick={() => router.push("/change-password")} />
              <Row icon={byId("app").icon} tone={byId("app").tone} label={byId("app").label} summary={byId("app").summary} onClick={() => setOpen("app")} />
            </div>
          </section>
          <div className="st-group" style={{ marginTop: 20 }}>
            <Row danger icon={LogOut} label="Logout" onClick={() => void logout()} />
          </div>
        </>
      )}
    </div>
  );
}

function Row({ icon: Icon, tone, label, summary, danger, onClick }: {
  icon: LucideIcon; tone?: Tone; label: string; summary?: string; danger?: boolean; onClick: () => void;
}) {
  return (
    <button type="button" className="st-row" data-danger={danger || undefined} onClick={onClick}>
      <span className="st-row-icon" data-tone={danger ? "error" : tone}><Icon size={20} strokeWidth={2} /></span>
      <span style={{ minWidth: 0, flex: 1 }}>
        <span className="st-row-label">{label}</span>
        {summary && <span className="st-row-summary">{summary}</span>}
      </span>
      {!danger && <ChevronRight size={20} className="st-row-chevron" aria-hidden />}
    </button>
  );
}

/** One choice row with a tick (theme / language pickers). */
function ChoiceRow({ icon: Icon, label, on, onClick }: { icon?: LucideIcon; label: string; on: boolean; onClick: () => void }) {
  return (
    <button type="button" className="st-row" onClick={onClick} aria-pressed={on}>
      {Icon && <span className="st-row-icon" data-tone="primary"><Icon size={20} strokeWidth={2} /></span>}
      <span style={{ minWidth: 0, flex: 1 }}><span className="st-row-label">{label}</span></span>
      <input type="radio" readOnly checked={on} tabIndex={-1} aria-hidden style={{ width: 20, height: 20, accentColor: "hsl(var(--primary))" }} />
    </button>
  );
}

function ThemeSection() {
  const { theme, setTheme } = useTheme();
  const choices: { id: string; label: string; icon: LucideIcon }[] = [
    { id: "light", label: "Light", icon: Sun },
    { id: "dark", label: "Dark", icon: Moon },
    { id: "system", label: "Same as phone", icon: Smartphone },
  ];
  return (
    <div className="st-group">
      {choices.map((c) => <ChoiceRow key={c.id} icon={c.icon} label={c.label} on={(theme ?? "system") === c.id} onClick={() => setTheme(c.id)} />)}
    </div>
  );
}

function LanguageSection() {
  const { lang, setLang } = useLang();
  return (
    <div className="st-group">
      {LANGUAGES.map((l) => <ChoiceRow key={l.code} label={l.label} on={l.code === lang} onClick={() => setLang(l.code)} />)}
    </div>
  );
}

/** Settings → Gestures: one switch per gesture (stored per device, lib/gesturePrefs). */
function GestureSection() {
  const prefs = useGesturePrefs();
  return (
    <div className="st-group">
      {GESTURE_OPTIONS.map((g) => (
        <label key={g.id} className="st-toggle">
          <span style={{ minWidth: 0, flex: 1 }}>
            <span className="st-row-label">{g.label}</span>
            <span className="st-row-summary st-wrap">{g.description}</span>
          </span>
          <input type="checkbox" role="switch" checked={prefs[g.id]} onChange={(e) => setGesture(g.id, e.target.checked)} className="st-switch" aria-label={g.label} />
        </label>
      ))}
    </div>
  );
}
