"use client";

import { useEffect, useState } from "react";
import { Droplets, Wind, CloudRain, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useInvoiceSettings } from "@/features/masters/hooks";
import { useLang, useT } from "@/features/i18n/provider";
import {
  fetchWeather,
  geocodePlace,
  getPositionOrNull,
  weatherLabel,
  type WeatherResult,
} from "@/lib/weather";

const CACHE_KEY = "agri.weather.v1";

interface Cached {
  result: WeatherResult;
  label: string;
  fetchedAt: number;
}

function readCache(): Cached | null {
  try {
    const raw = typeof window !== "undefined" ? window.localStorage.getItem(CACHE_KEY) : null;
    return raw ? (JSON.parse(raw) as Cached) : null;
  } catch {
    return null;
  }
}

function writeCache(c: Cached) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(c));
  } catch {
    /* quota / private mode - ignore */
  }
}

/** DD/MM from a YYYY-MM-DD string, timezone-safe (no Date parsing). */
function dayLabel(iso: string) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function WeatherWidget() {
  const t = useT();
  const { lang } = useLang();
  const shop = useInvoiceSettings();

  const [data, setData] = useState<Cached | null>(null);
  const [loading, setLoading] = useState(true);

  const place = shop.data?.city?.trim() || shop.data?.pincode?.trim() || shop.data?.stateName?.trim() || "";

  // Show the last reading immediately (works offline too).
  useEffect(() => {
    const cached = readCache();
    if (cached) {
      setData(cached);
      setLoading(false);
    }
  }, []);

  // Refresh once the shop location is known: GPS first, then shop city.
  useEffect(() => {
    if (shop.isLoading) return;
    let cancelled = false;

    (async () => {
      let lat: number | undefined;
      let lon: number | undefined;
      let label = "";

      const pos = await getPositionOrNull();
      if (pos) {
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
        label = t("wx.yourLocation");
      } else if (place) {
        const g = await geocodePlace(place);
        if (g) {
          lat = g.lat;
          lon = g.lon;
          label = g.label;
        }
      }

      if (lat == null || lon == null) {
        if (!cancelled) setLoading(false);
        return;
      }

      try {
        const result = await fetchWeather(lat, lon);
        if (cancelled) return;
        const payload: Cached = { result, label, fetchedAt: Date.now() };
        writeCache(payload);
        setData(payload);
      } catch {
        /* keep showing the cached reading, if any */
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shop.isLoading, place]);

  if (loading && !data) {
    return <Skeleton className="h-28 w-full rounded-xl" />;
  }

  if (!data) {
    return (
      <Card>
        <CardContent className="p-4 text-sm text-muted-foreground">
          <div>{t("wx.unavailable")}</div>
          {!place && <div className="mt-1 text-xs">{t("wx.setLocation")}</div>}
        </CardContent>
      </Card>
    );
  }

  const { now, daily } = data.result;
  const cond = weatherLabel(now.code, lang);
  const asOf = new Date(data.fetchedAt).toLocaleString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
  });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* current */}
          <div className="flex items-center gap-3">
            <div className="text-4xl leading-none">{cond.emoji}</div>
            <div>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold tabular">{Math.round(now.tempC)}°</span>
                <span className="text-sm text-muted-foreground">C</span>
              </div>
              <div className="text-sm font-medium">{cond.text}</div>
              <div className="text-xs text-muted-foreground">
                {t("wx.title")}
                {data.label ? ` · ${data.label}` : ""}
              </div>
            </div>
          </div>

          {/* now stats */}
          <div className="flex gap-4 text-xs text-muted-foreground">
            <Stat icon={<Droplets className="size-3.5" />} label={t("wx.humidity")} value={`${Math.round(now.humidity)}%`} />
            <Stat icon={<Wind className="size-3.5" />} label={t("wx.wind")} value={`${Math.round(now.windKph)} km/h`} />
            <Stat icon={<CloudRain className="size-3.5" />} label={t("wx.rain")} value={`${now.precipMm} mm`} />
          </div>

          {/* forecast */}
          <div className="flex gap-3">
            {daily.slice(1, 5).map((d) => {
              const c = weatherLabel(d.code, lang);
              return (
                <div key={d.date} className="flex flex-col items-center text-center">
                  <span className="text-[10px] text-muted-foreground">{dayLabel(d.date)}</span>
                  <span className="text-lg leading-none">{c.emoji}</span>
                  <span className="text-[11px] tabular">
                    {Math.round(d.maxC)}°/<span className="text-muted-foreground">{Math.round(d.minC)}°</span>
                  </span>
                  <span className="text-[9px] text-sky-600 dark:text-sky-400">{Math.round(d.rainProb)}%</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="mt-2 flex items-center gap-1 text-[10px] text-muted-foreground">
          <RefreshCw className="size-3" />
          {t("wx.asOf")} {asOf}
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className="flex items-center gap-1">
        {icon}
        {label}
      </span>
      <span className="font-medium text-foreground">{value}</span>
    </div>
  );
}
