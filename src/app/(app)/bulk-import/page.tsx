"use client";

import { useMemo, useRef, useState } from "react";
import {
  AlertTriangle, CheckCircle2, Download, FileSpreadsheet, Loader2,
  Package, Truck, Upload, Users,
} from "lucide-react";
import { toast } from "@/lib/ag-toast";
import { PageHeader } from "@/components/common/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { apiPost } from "@/lib/api-client";
import { useStates, useItemFormLookups, itemSubGroupHooks } from "@/features/masters/hooks";
import { useItemGroups, useItemFormDefinition } from "@/features/items/hooks";
import {
  CUSTOMER_SPEC, SUPPLIER_SPEC, buildRows, mergeResult,
  type BulkImportError, type BulkImportResult, type MasterKey, type MasterSpec,
} from "@/features/bulk-import/spec";
import {
  buildItemColumns, buildItemRows, ITEM_REQUIRED, type ItemImportCtx,
} from "@/features/bulk-import/item-spec";
import { downloadSampleXlsx, parseSheet } from "@/features/bulk-import/excel";
import { cn } from "@/lib/utils";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnySpec = MasterSpec<any>;

const MASTERS: {
  key: MasterKey;
  label: string;
  icon: typeof Users;
  color: string;
  desc: string;
  spec: AnySpec | null;
}[] = [
  { key: "customer", label: "Customer", icon: Users, color: "#3b82f6", desc: "Naam, mobile, village, credit, opening balance…", spec: CUSTOMER_SPEC },
  { key: "supplier", label: "Supplier", icon: Truck, color: "#f59e0b", desc: "Naam, GST/PAN, contact, bank, payment terms…", spec: SUPPLIER_SPEC },
  { key: "item", label: "Item", icon: Package, color: "#10b981", desc: "Product / Fertilizer / Seed / Other — group-wise fields.", spec: null },
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Payload = { dtos: any[]; sentRows: number[]; clientErrors: BulkImportError[] };

export default function BulkImportPage() {
  const [master, setMaster] = useState<MasterKey | null>(null);
  const [itemGroupId, setItemGroupId] = useState<number | null>(null);

  const states = useStates();
  const itemGroups = useItemGroups();
  const itemLookups = useItemFormLookups();
  const allSubGroups = itemSubGroupHooks.useList({ page: 1, pageSize: 500 });
  const formDef = useItemFormDefinition(itemGroupId);

  const selected = MASTERS.find((m) => m.key === master) ?? null;
  const group = (itemGroups.data ?? []).find((g) => g.itemGroupId === itemGroupId) ?? null;

  const dynamicFields = useMemo(
    () =>
      (formDef.data?.fields ?? [])
        .filter((f) => !f.isStoredOnItem)
        .map((f) => ({ itemGroupFieldId: f.itemGroupFieldId, fieldDisplayName: f.fieldDisplayName })),
    [formDef.data],
  );
  const itemColumns = useMemo(() => buildItemColumns(dynamicFields), [dynamicFields]);
  const itemCtx: ItemImportCtx = useMemo(
    () => ({
      itemGroupId: itemGroupId ?? 0,
      subGroups: (allSubGroups.data?.items ?? [])
        .filter((s) => s.itemGroupId === itemGroupId)
        .map((s) => ({ id: s.itemSubGroupId, code: s.itemSubGroupCode, name: s.itemSubGroupName })),
      units: itemLookups.data?.units ?? [],
      gstSlabs: itemLookups.data?.gstSlabs ?? [],
      hsnCodes: itemLookups.data?.hsnCodes ?? [],
      companies: itemLookups.data?.companies ?? [],
      dynamicFields,
    }),
    [itemGroupId, allSubGroups.data, itemLookups.data, dynamicFields],
  );

  const itemReady = !!group && !itemLookups.isLoading && !formDef.isLoading && !allSubGroups.isLoading;

  return (
    <>
      <PageHeader
        title="Bulk Import"
        description="Excel se Customer, Supplier aur Item ek saath import karo — data waise hi save hoga jaise manual create."
      />

      {/* ------------------------------ master picker ------------------------------ */}
      <div className="grid gap-4 sm:grid-cols-3">
        {MASTERS.map((m) => {
          const active = master === m.key;
          const Icon = m.icon;
          return (
            <button
              key={m.key}
              type="button"
              onClick={() => { setMaster(m.key); setItemGroupId(null); }}
              className={cn(
                "flex flex-col items-start gap-2 rounded-xl border bg-card p-4 text-left transition-all hover:shadow-sm",
                active ? "border-primary ring-1 ring-primary" : "hover:border-primary/40",
              )}
            >
              <div
                className="flex size-10 items-center justify-center rounded-lg"
                style={{ background: `${m.color}1a`, color: m.color }}
              >
                <Icon className="size-5" />
              </div>
              <div className="font-semibold">{m.label}</div>
              <p className="text-xs text-muted-foreground">{m.desc}</p>
            </button>
          );
        })}
      </div>

      {/* ------------------------------ selected panel ------------------------------ */}
      {selected && (
        <Card className="mt-6">
          <CardContent className="space-y-5 p-5">
            {selected.spec ? (
              /* ---- Customer / Supplier ---- */
              <ImportPanel
                key={selected.key}
                columns={selected.spec.columns}
                required={selected.spec.required}
                sampleName={`${selected.key}-sample.xlsx`}
                endpoint={selected.spec.endpoint}
                buildPayload={(raw) => buildRows(selected.spec!, raw, states.data ?? [])}
                hint={
                  <>
                    <strong>State</strong> ka pura naam (jaise “Madhya Pradesh”),{" "}
                    <strong>Customer Type</strong> = Retail/Wholesale/Dealer,{" "}
                    <strong>Opening Balance Type</strong> = DR/CR. Code apne aap ban jayega.
                  </>
                }
              />
            ) : (
              /* ---- Item ---- */
              <div className="space-y-5">
                <div>
                  <h3 className="text-base font-semibold">Step 1 — Group chuno</h3>
                  <p className="mb-2 text-sm text-muted-foreground">
                    Har group ke apne dynamic fields hote hain, isliye sample group ke hisaab se banega.
                  </p>
                  <Select
                    value={itemGroupId ? String(itemGroupId) : ""}
                    onValueChange={(v) => setItemGroupId(Number(v))}
                  >
                    <SelectTrigger className="w-[280px]" aria-label="Item group">
                      <SelectValue placeholder="Group chuno (Product / Fertilizer / …)" />
                    </SelectTrigger>
                    <SelectContent>
                      {(itemGroups.data ?? []).map((g) => (
                        <SelectItem key={g.itemGroupId} value={String(g.itemGroupId)}>
                          {g.itemGroupName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {itemGroupId && !itemReady && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" /> Fields load ho rahe hain…
                  </div>
                )}

                {itemReady && group && (
                  <ImportPanel
                    key={`item-${itemGroupId}`}
                    stepOffset
                    columns={itemColumns}
                    required={ITEM_REQUIRED}
                    sampleName={`${group.itemGroupName.replace(/\s+/g, "-").toLowerCase()}-sample.xlsx`}
                    endpoint="/items/bulk-import"
                    buildPayload={(raw) => buildItemRows(raw, itemCtx)}
                    hint={
                      <>
                        <strong>Sub Group</strong>, <strong>Unit</strong> (jaise KG),{" "}
                        <strong>GST %</strong> (jaise 18), <strong>HSN</strong>, <strong>Company</strong> exact naam se.{" "}
                        Y/N wale columns me Y ya N. Item code apne aap ban jayega. Aakhri me is group ke extra fields hain.
                      </>
                    }
                  />
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </>
  );
}

/* -------------------- reusable download → upload → result -------------------- */

function ImportPanel({
  columns, required, sampleName, endpoint, buildPayload, hint, stepOffset,
}: {
  columns: string[];
  required: string[];
  sampleName: string;
  endpoint: string;
  buildPayload: (rawRows: Record<string, unknown>[]) => Payload;
  hint?: React.ReactNode;
  stepOffset?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<BulkImportResult | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const s1 = stepOffset ? 2 : 1;
  const s2 = stepOffset ? 3 : 2;

  async function onFile(file: File) {
    setBusy(true);
    setResult(null);
    setFileName(file.name);
    try {
      const raw = await parseSheet(file);
      if (raw.length === 0) {
        toast.error("File khaali hai ya koi data row nahi mili.");
        return;
      }
      const { dtos, sentRows, clientErrors } = buildPayload(raw);
      let server: BulkImportResult = { imported: 0, failed: 0, errors: [] };
      if (dtos.length > 0) server = await apiPost<BulkImportResult>(endpoint, dtos);
      const merged = mergeResult(clientErrors, sentRows, server);
      setResult(merged);
      if (merged.imported > 0) toast.success(`${merged.imported} rows imported.`);
      if (merged.imported === 0 && merged.failed > 0) toast.error(`Koi row import nahi hui — ${merged.failed} me error.`);
    } catch {
      toast.error("Import fail hua. Sahi .xlsx / .csv file upload karo.");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="space-y-5">
      {/* download sample */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold">Step {s1} — Sample download karo</h3>
          <p className="text-sm text-muted-foreground">Isme sahi column headers honge; niche rows me apna data bharo.</p>
        </div>
        <Button variant="outline" onClick={() => downloadSampleXlsx(sampleName, columns)}>
          <Download className="mr-1.5 size-4" />
          Download Sample
        </Button>
      </div>

      {/* columns hint */}
      <div className="rounded-lg border bg-muted/30 p-3">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Columns ({columns.length}) — <span className="text-destructive">*</span> = zaroori:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {columns.map((c) => {
            const req = required.includes(c);
            return (
              <span
                key={c}
                className={cn(
                  "rounded-md border px-2 py-0.5 text-xs",
                  req ? "border-destructive/40 font-medium" : "bg-background text-muted-foreground",
                )}
              >
                {c}
                {req && <span className="text-destructive">*</span>}
              </span>
            );
          })}
        </div>
        {hint && <p className="mt-2 text-xs text-muted-foreground">Tip: {hint}</p>}
      </div>

      {/* upload */}
      <div>
        <h3 className="text-base font-semibold">Step {s2} — Bhari hui file upload karo</h3>
        <label
          className={cn(
            "mt-2 flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:border-primary/50 hover:bg-muted/30",
            busy && "pointer-events-none opacity-60",
          )}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onFile(f);
            }}
          />
          {busy ? (
            <Loader2 className="size-7 animate-spin text-muted-foreground" />
          ) : (
            <Upload className="size-7 text-muted-foreground" />
          )}
          <div className="text-sm font-medium">
            {busy ? "Import ho raha hai…" : "Click karke Excel file choose karo"}
          </div>
          <div className="text-xs text-muted-foreground">
            {fileName ? (
              <span className="inline-flex items-center gap-1">
                <FileSpreadsheet className="size-3.5" /> {fileName}
              </span>
            ) : (
              ".xlsx, .xls ya .csv"
            )}
          </div>
        </label>
      </div>

      {result && <ResultPanel result={result} />}
    </div>
  );
}

function ResultPanel({ result }: { result: BulkImportResult }) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <span className="font-medium text-emerald-700 dark:text-emerald-400">{result.imported}</span> imported
        </div>
        {result.failed > 0 && (
          <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
            <AlertTriangle className="size-4 text-destructive" />
            <span className="font-medium text-destructive">{result.failed}</span> failed
          </div>
        )}
      </div>

      {result.errors.length > 0 && (
        <div className="max-h-64 overflow-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-muted text-xs text-muted-foreground">
              <tr>
                <th className="w-20 px-3 py-2 text-left font-medium">Excel Row</th>
                <th className="px-3 py-2 text-left font-medium">Reason</th>
              </tr>
            </thead>
            <tbody>
              {result.errors.map((e, i) => (
                <tr key={i} className="border-t">
                  <td className="px-3 py-2 tabular text-muted-foreground">{e.row}</td>
                  <td className="px-3 py-2 text-destructive">{e.message}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
