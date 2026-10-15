"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { CloudOff, Cloud, Printer, RefreshCw, Trash2, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/page-header";
import { useOnlineStatus } from "@/features/offline/online-status";
import { useBillingAllItems } from "@/features/offline/use-offline-items";
import {
  addToQueue,
  newLocalId,
  readItemsCache,
  readQueue,
  removeFromQueue,
  updateQueueItem,
  type OfflineLine,
  type PendingSale,
} from "@/features/offline/offline-store";
import { useInvoiceSettings } from "@/features/masters/hooks";
import { apiPost } from "@/lib/api-client";
import type { ItemLookupDto, SaleDto, SaveSaleRequest } from "@/features/transactions/types";
import { formatCurrency } from "@/lib/format";
import { toast } from "@/lib/ag-toast";
import { useT } from "@/features/i18n/provider";

const SHOP_KEY = "agri.offline.shopName";

export default function OfflineBillPage() {
  const t = useT();
  const online = useOnlineStatus();
  const itemsQuery = useBillingAllItems(online);
  const shop = useInvoiceSettings();

  const [items, setItems] = useState<ItemLookupDto[]>([]);
  const [cachedAt, setCachedAt] = useState<number | null>(null);
  const [search, setSearch] = useState("");

  const [custName, setCustName] = useState("");
  const [mobile, setMobile] = useState("");
  const [payType, setPayType] = useState<"Cash" | "Credit">("Cash");
  const [lines, setLines] = useState<OfflineLine[]>([]);

  const [queue, setQueue] = useState<PendingSale[]>([]);
  const [postingId, setPostingId] = useState<string | null>(null);
  const [slip, setSlip] = useState<PendingSale | null>(null);
  const [shopName, setShopName] = useState("");
  const printTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load cached items + queue + shop name on mount.
  useEffect(() => {
    const c = readItemsCache();
    if (c) {
      setItems(c.items);
      setCachedAt(c.cachedAt);
    }
    setQueue(readQueue());
    try {
      setShopName(window.localStorage.getItem(SHOP_KEY) ?? "");
    } catch {
      /* ignore */
    }
  }, []);

  // When a fresh item list arrives (online), use it + remember when.
  useEffect(() => {
    if (itemsQuery.data) {
      setItems(itemsQuery.data);
      setCachedAt(Date.now());
    }
  }, [itemsQuery.data]);

  // Mirror the shop name for the offline slip header.
  useEffect(() => {
    const n = shop.data?.shopName;
    if (n) {
      setShopName(n);
      try {
        window.localStorage.setItem(SHOP_KEY, n);
      } catch {
        /* ignore */
      }
    }
  }, [shop.data?.shopName]);

  const matches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return items
      .filter(
        (it) =>
          it.name.toLowerCase().includes(q) ||
          it.code.toLowerCase().includes(q) ||
          (it.shortName ?? "").toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [search, items]);

  const total = lines.reduce((sum, l) => sum + l.quantity * l.rate, 0);

  function addItem(it: ItemLookupDto) {
    setLines((prev) => {
      const existing = prev.find((l) => l.itemId === it.id);
      if (existing) {
        return prev.map((l) => (l.itemId === it.id ? { ...l, quantity: l.quantity + 1 } : l));
      }
      const line: OfflineLine = {
        itemId: it.id,
        itemCode: it.code,
        itemName: it.name,
        unitCode: it.unitCode,
        gstPercent: it.gstPercent,
        quantity: 1,
        rate: it.sellingRate,
      };
      return [...prev, line];
    });
    setSearch("");
  }

  function setLine(itemId: number, patch: Partial<OfflineLine>) {
    setLines((prev) => prev.map((l) => (l.itemId === itemId ? { ...l, ...patch } : l)));
  }

  function removeLine(itemId: number) {
    setLines((prev) => prev.filter((l) => l.itemId !== itemId));
  }

  function resetForm() {
    setLines([]);
    setCustName("");
    setMobile("");
    setPayType("Cash");
  }

  function saveBill() {
    if (lines.length === 0) {
      toast.error(t("off.needLines"));
      return;
    }
    const sale: PendingSale = {
      localId: newLocalId(),
      capturedAt: Date.now(),
      walkInName: custName.trim() || undefined,
      walkInMobile: mobile.trim() || undefined,
      paymentType: payType,
      lines,
      total,
      status: "pending",
    };
    addToQueue(sale);
    setQueue(readQueue());
    setSlip(sale);
    resetForm();
    toast.success(t("off.saved"));
    // let the slip render before printing
    if (printTimer.current) clearTimeout(printTimer.current);
    printTimer.current = setTimeout(() => window.print(), 250);
  }

  async function post(sale: PendingSale) {
    if (!online) {
      toast.error(t("off.postNeedsOnline"));
      return;
    }
    setPostingId(sale.localId);
    try {
      const body: SaveSaleRequest = {
        invoiceDate: new Date(sale.capturedAt).toISOString(),
        customerId: null,
        walkInCustomerName: sale.walkInName || null,
        walkInMobile: sale.walkInMobile || null,
        saleType: "Retail",
        paymentType: sale.paymentType,
        locationId: null,
        otherCharges: 0,
        lines: sale.lines.map((l) => ({
          itemId: l.itemId,
          batchId: null,
          quantity: l.quantity,
          freeQuantity: 0,
          rate: l.rate,
          discountPercent: 0,
          discountAmount: 0,
        })),
        payments: [],
      };
      const created = await apiPost<SaleDto>("/sales", body);
      removeFromQueue(sale.localId);
      setQueue(readQueue());
      toast.success(`${t("off.postedOk")} ${created.invoiceNumber}`);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Error";
      updateQueueItem(sale.localId, { status: "error", error: msg });
      setQueue(readQueue());
      toast.error(msg);
    } finally {
      setPostingId(null);
    }
  }

  async function postAll() {
    // Sequential on purpose: stock posts one bill at a time on the server.
    for (const sale of readQueue()) {
      await post(sale);
    }
  }

  function reprint(sale: PendingSale) {
    setSlip(sale);
    if (printTimer.current) clearTimeout(printTimer.current);
    printTimer.current = setTimeout(() => window.print(), 250);
  }

  return (
    <>
      <style>{`@media print { .off-screen { display: none !important; } #off-slip { display: block !important; } }`}</style>

      <div className="off-screen space-y-4">
        <PageHeader
          title={t("off.title")}
          description={t("off.desc")}
          actions={
            <Badge
              variant="outline"
              className={
                online
                  ? "border-emerald-500/50 text-emerald-600 dark:text-emerald-400"
                  : "border-amber-500/60 text-amber-600 dark:text-amber-400"
              }
            >
              {online ? <Cloud className="mr-1 size-3.5" /> : <CloudOff className="mr-1 size-3.5" />}
              {online ? t("off.online") : t("off.offline")}
            </Badge>
          }
        />

        {/* items cache status */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span>
            {items.length} {t("off.cachedItems")}
            {cachedAt ? ` · ${t("wx.asOf")} ${new Date(cachedAt).toLocaleString()}` : ""}
          </span>
          {online && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7"
              onClick={() => itemsQuery.refetch()}
              disabled={itemsQuery.isFetching}
            >
              <RefreshCw className={`mr-1 size-3.5 ${itemsQuery.isFetching ? "animate-spin" : ""}`} />
              {t("off.refresh")}
            </Button>
          )}
        </div>

        {items.length === 0 ? (
          <Card>
            <CardContent className="p-4 text-sm text-muted-foreground">{t("off.noItemsCache")}</CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="space-y-4 p-4">
              {/* customer */}
              <div className="grid gap-3 sm:grid-cols-2">
                <Input placeholder={t("off.custName")} value={custName} onChange={(e) => setCustName(e.target.value)} />
                <Input
                  placeholder={t("off.mobile")}
                  inputMode="numeric"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                />
              </div>

              {/* item search */}
              <div className="relative">
                <Input
                  placeholder={t("off.searchItem")}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {matches.length > 0 && (
                  <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-md border bg-popover shadow-md">
                    {matches.map((it) => (
                      <button
                        key={it.id}
                        type="button"
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-muted"
                        onClick={() => addItem(it)}
                      >
                        <span className="truncate">
                          {it.name} <span className="text-xs text-muted-foreground">{it.code}</span>
                        </span>
                        <span className="shrink-0 tabular text-muted-foreground">
                          {formatCurrency(it.sellingRate)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* lines */}
              {lines.length > 0 && (
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted text-xs text-muted-foreground">
                      <tr>
                        <th className="px-2 py-1.5 text-left font-medium">{t("off.lineItems")}</th>
                        <th className="px-2 py-1.5 text-right font-medium">{t("off.qty")}</th>
                        <th className="px-2 py-1.5 text-right font-medium">{t("off.rate")}</th>
                        <th className="px-2 py-1.5 text-right font-medium">{t("off.total")}</th>
                        <th className="w-8" />
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l) => (
                        <tr key={l.itemId} className="border-t">
                          <td className="px-2 py-1.5">
                            <div className="font-medium">{l.itemName}</div>
                            <div className="text-xs text-muted-foreground">
                              {l.itemCode} · {l.unitCode}
                            </div>
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              type="number"
                              inputMode="decimal"
                              className="h-8 w-20 text-right"
                              value={l.quantity}
                              min={0}
                              onChange={(e) => setLine(l.itemId, { quantity: Number(e.target.value) || 0 })}
                            />
                          </td>
                          <td className="px-2 py-1.5">
                            <Input
                              type="number"
                              inputMode="decimal"
                              className="h-8 w-24 text-right"
                              value={l.rate}
                              min={0}
                              onChange={(e) => setLine(l.itemId, { rate: Number(e.target.value) || 0 })}
                            />
                          </td>
                          <td className="px-2 py-1.5 text-right tabular font-medium">
                            {formatCurrency(l.quantity * l.rate)}
                          </td>
                          <td className="px-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-7 text-destructive"
                              onClick={() => removeLine(l.itemId)}
                            >
                              <X className="size-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* footer */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex gap-1 rounded-md border p-0.5 text-sm">
                  {(["Cash", "Credit"] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setPayType(p)}
                      className={`rounded px-3 py-1 ${
                        payType === p ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                      }`}
                    >
                      {p === "Cash" ? t("off.payCash") : t("off.payCredit")}
                    </button>
                  ))}
                </div>
                <div className="text-lg font-bold tabular">
                  {t("off.total")}: {formatCurrency(total)}
                </div>
                <Button variant="success" onClick={saveBill} disabled={lines.length === 0}>
                  <Printer className="mr-1.5 size-4" />
                  {t("off.saveBill")}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* pending queue */}
        <Card>
          <CardContent className="space-y-2 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                {t("off.pending")} ({queue.length})
              </h3>
              {queue.length > 0 && (
                <Button size="sm" onClick={postAll} disabled={!online || postingId !== null}>
                  <UploadCloud className="mr-1.5 size-4" />
                  {t("off.postAll")}
                </Button>
              )}
            </div>

            {queue.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("off.noPending")}</p>
            ) : (
              <div className="divide-y">
                {queue.map((s) => (
                  <div key={s.localId} className="flex flex-wrap items-center justify-between gap-2 py-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">
                        {s.walkInName || t("off.payCash")} · {formatCurrency(s.total)}{" "}
                        <span className="text-xs text-muted-foreground">
                          ({s.lines.length} {t("off.lineItems")})
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(s.capturedAt).toLocaleString()} ·{" "}
                        {s.paymentType === "Cash" ? t("off.payCash") : t("off.payCredit")}
                      </div>
                      {s.status === "error" && s.error && (
                        <div className="text-xs text-destructive">{s.error}</div>
                      )}
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" className="size-8" onClick={() => reprint(s)} title={t("common.print")}>
                        <Printer className="size-4" />
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => post(s)}
                        disabled={!online || postingId !== null}
                      >
                        {postingId === s.localId ? t("off.posting") : t("off.post")}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="size-8 text-destructive"
                        onClick={() => {
                          removeFromQueue(s.localId);
                          setQueue(readQueue());
                        }}
                        title={t("off.remove")}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* provisional slip (print only) */}
      <div id="off-slip" className="hidden">
        {slip && <Slip sale={slip} shopName={shopName} t={t} />}
      </div>
    </>
  );
}

function Slip({
  sale,
  shopName,
  t,
}: {
  sale: PendingSale;
  shopName: string;
  t: (k: string, f?: string) => string;
}) {
  return (
    <div style={{ fontFamily: "monospace", width: "76mm", padding: "4mm", color: "#000" }}>
      <div style={{ textAlign: "center", fontWeight: 700, fontSize: 14 }}>{shopName || "—"}</div>
      <div style={{ textAlign: "center", fontSize: 10, border: "1px solid #000", margin: "4px 0", padding: 2 }}>
        {t("off.provisional")}
      </div>
      <div style={{ fontSize: 11 }}>
        {new Date(sale.capturedAt).toLocaleString()}
        <br />
        {sale.walkInName ? `${sale.walkInName} ` : ""}
        {sale.walkInMobile ?? ""}
      </div>
      <table style={{ width: "100%", fontSize: 11, marginTop: 4, borderTop: "1px dashed #000" }}>
        <tbody>
          {sale.lines.map((l) => (
            <tr key={l.itemId}>
              <td style={{ paddingTop: 2 }}>
                {l.itemName}
                <br />
                <span style={{ color: "#444" }}>
                  {l.quantity} {l.unitCode} × {Math.round(l.rate)}
                </span>
              </td>
              <td style={{ textAlign: "right", verticalAlign: "bottom" }}>
                {Math.round(l.quantity * l.rate)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div
        style={{
          borderTop: "1px dashed #000",
          marginTop: 4,
          paddingTop: 4,
          display: "flex",
          justifyContent: "space-between",
          fontWeight: 700,
          fontSize: 13,
        }}
      >
        <span>{t("off.total")}</span>
        <span>₹{Math.round(sale.total)}</span>
      </div>
      <div style={{ textAlign: "center", fontSize: 9, marginTop: 6 }}>{t("off.provisionalNote")}</div>
    </div>
  );
}
