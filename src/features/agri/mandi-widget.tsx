"use client";

import { useEffect, useMemo, useState } from "react";
import { Store, Settings2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoiceSettings, useStates } from "@/features/masters/hooks";
import { useMarketPrices, type MarketPriceRow } from "@/features/agri/market";
import { useT } from "@/features/i18n/provider";

const KEY = "agri.mandi.v1";
const CACHE = "agri.mandi.cache.v1";

interface MandiSettings {
  stateName: string;
  district: string;
  commodity: string;
}

function readSettings(): MandiSettings | null {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(KEY) : null;
    return raw ? (JSON.parse(raw) as MandiSettings) : null;
  } catch {
    return null;
  }
}
function writeSettings(s: MandiSettings) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}
function readCache(): MarketPriceRow[] {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(CACHE) : null;
    return raw ? (JSON.parse(raw) as MarketPriceRow[]) : [];
  } catch {
    return [];
  }
}
function writeCache(rows: MarketPriceRow[]) {
  try {
    window.localStorage.setItem(CACHE, JSON.stringify(rows.slice(0, 50)));
  } catch {
    /* ignore */
  }
}

export function MandiWidget() {
  const t = useT();
  const states = useStates();
  const shop = useInvoiceSettings();

  const [settings, setSettings] = useState<MandiSettings | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<MandiSettings>({ stateName: "", district: "", commodity: "" });

  // Load saved mandi settings on mount; if none, open the setup form.
  useEffect(() => {
    const s = readSettings();
    if (s) {
      setSettings(s);
      setForm(s);
    } else {
      setEditing(true);
    }
  }, []);

  // Prefill the state from the shop's own state when setting up fresh.
  useEffect(() => {
    const st = shop.data?.stateName;
    if (st && !settings) setForm((f) => (f.stateName ? f : { ...f, stateName: st }));
  }, [shop.data?.stateName, settings]);

  const query = useMarketPrices(
    { state: settings?.stateName, district: settings?.district, commodity: settings?.commodity },
    !!settings?.district,
  );

  // One row per commodity (latest market), falling back to the cached list offline.
  const rows = useMemo(() => {
    const live = query.data?.rows ?? [];
    const source = live.length > 0 ? live : readCache();
    const seen = new Set<string>();
    const out: MarketPriceRow[] = [];
    for (const r of source) {
      if (!r.commodity || seen.has(r.commodity)) continue;
      seen.add(r.commodity);
      out.push(r);
      if (out.length >= 8) break;
    }
    return out;
  }, [query.data]);

  useEffect(() => {
    if (query.data?.rows?.length) writeCache(query.data.rows);
  }, [query.data]);

  function save() {
    if (!form.district.trim()) return;
    const s: MandiSettings = {
      stateName: form.stateName.trim(),
      district: form.district.trim(),
      commodity: form.commodity.trim(),
    };
    writeSettings(s);
    setSettings(s);
    setEditing(false);
  }

  const notConfigured = query.data !== undefined && query.data.configured === false;

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <Store className="size-4" /> {t("mandi.title")}
          </div>
          {settings && !notConfigured && (
            <Button
              variant="ghost"
              size="icon"
              className="size-7"
              onClick={() => setEditing((e) => !e)}
              title={t("mandi.change")}
            >
              <Settings2 className="size-4" />
            </Button>
          )}
        </div>

        {notConfigured ? (
          <p className="text-xs text-muted-foreground">{t("mandi.notConfigured")}</p>
        ) : editing || !settings ? (
          <div className="space-y-2">
            {!settings && <p className="text-xs text-muted-foreground">{t("mandi.needDistrict")}</p>}
            <div className="grid grid-cols-2 gap-2">
              <Select
                value={form.stateName || undefined}
                onValueChange={(v) => setForm((f) => ({ ...f, stateName: v }))}
              >
                <SelectTrigger className="h-9">
                  <SelectValue placeholder={t("cust.state")} />
                </SelectTrigger>
                <SelectContent>
                  {(states.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.name}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                className="h-9"
                placeholder={t("mandi.districtPlaceholder")}
                value={form.district}
                onChange={(e) => setForm((f) => ({ ...f, district: e.target.value }))}
              />
            </div>
            <div className="flex gap-2">
              <Input
                className="h-9"
                placeholder={t("mandi.commodityPlaceholder")}
                value={form.commodity}
                onChange={(e) => setForm((f) => ({ ...f, commodity: e.target.value }))}
              />
              <Button size="sm" variant="success" onClick={save} disabled={!form.district.trim()}>
                {t("common.save")}
              </Button>
            </div>
          </div>
        ) : query.isLoading && rows.length === 0 ? (
          <Skeleton className="h-24 w-full rounded" />
        ) : rows.length === 0 ? (
          <p className="text-xs text-muted-foreground">{t("mandi.noData")}</p>
        ) : (
          <div className="space-y-1.5">
            {rows.map((r, i) => (
              <div key={`${r.commodity}-${i}`} className="flex items-center justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-medium">{r.commodity}</div>
                  <div className="truncate text-[11px] text-muted-foreground">
                    {r.market}
                    {r.arrivalDate ? ` · ${r.arrivalDate}` : ""}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-semibold tabular">
                    ₹{Math.round(r.modalPrice).toLocaleString("en-IN")}
                  </div>
                  <div className="text-[10px] text-muted-foreground">
                    {r.minPrice > 0 ? `${Math.round(r.minPrice)}–${Math.round(r.maxPrice)} · ` : ""}
                    {t("mandi.perQuintal")}
                  </div>
                </div>
              </div>
            ))}
            <div className="pt-1 text-[11px] text-muted-foreground">
              {settings.district}
              {settings.stateName ? `, ${settings.stateName}` : ""}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
