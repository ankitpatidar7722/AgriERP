"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Field, FieldGrid } from "@/components/common/form-dialog";
import { useAuth } from "@/features/auth/auth-context";
import {
  useInvoiceSettings,
  useSaveInvoiceSettings,
  useStates,
} from "@/features/masters/hooks";
import { applyServerErrors } from "@/features/masters/use-master-crud";
import type { SaveInvoiceSettingsRequest } from "@/features/masters/types";
import { Permissions } from "@/lib/permissions";
import { toast } from "@/lib/ag-toast";
import { useT } from "@/features/i18n/provider";

const NONE = "none";

const schema = z.object({
  shopName: z.string().min(1, "Shop name is required.").max(150),
  legalName: z.string().max(150),
  gstNumber: z.string().max(15),
  panNumber: z.string().max(10),
  pesticideLicenceNo: z.string().max(60),
  seedLicenceNo: z.string().max(60),
  fertilizerLicenceNo: z.string().max(60),
  addressLine1: z.string().max(200),
  addressLine2: z.string().max(200),
  city: z.string().max(80),
  stateId: z.number().nullable(),
  pincode: z.string().max(10),
  phone: z.string().max(15),
  alternatePhone: z.string().max(15),
  email: z.string().max(150),
  website: z.string().max(150),
  bankName: z.string().max(100),
  bankAccountNumber: z.string().max(30),
  bankIfsc: z.string().max(15),
  bankBranch: z.string().max(100),
  upiId: z.string().max(100),
  invoiceTerms: z.string().max(1000),
  invoiceFooterNote: z.string().max(500),
  dataGovInApiKey: z.string().max(200),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  shopName: "",
  legalName: "",
  gstNumber: "",
  panNumber: "",
  pesticideLicenceNo: "",
  seedLicenceNo: "",
  fertilizerLicenceNo: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  stateId: null,
  pincode: "",
  phone: "",
  alternatePhone: "",
  email: "",
  website: "",
  bankName: "",
  bankAccountNumber: "",
  bankIfsc: "",
  bankBranch: "",
  upiId: "",
  invoiceTerms: "",
  invoiceFooterNote: "",
  dataGovInApiKey: "",
};

export function InvoiceSettingsTab() {
  const { can } = useAuth();
  const t = useT();
  const canEdit = can(Permissions.Settings.Edit);

  const settings = useInvoiceSettings();
  const states = useStates();
  const save = useSaveInvoiceSettings();

  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY });

  // Load the singleton into the form once it arrives.
  useEffect(() => {
    const d = settings.data;
    if (!d) return;
    form.reset({
      shopName: d.shopName ?? "",
      legalName: d.legalName ?? "",
      gstNumber: d.gstNumber ?? "",
      panNumber: d.panNumber ?? "",
      pesticideLicenceNo: d.pesticideLicenceNo ?? "",
      seedLicenceNo: d.seedLicenceNo ?? "",
      fertilizerLicenceNo: d.fertilizerLicenceNo ?? "",
      addressLine1: d.addressLine1 ?? "",
      addressLine2: d.addressLine2 ?? "",
      city: d.city ?? "",
      stateId: d.stateId ?? null,
      pincode: d.pincode ?? "",
      phone: d.phone ?? "",
      alternatePhone: d.alternatePhone ?? "",
      email: d.email ?? "",
      website: d.website ?? "",
      bankName: d.bankName ?? "",
      bankAccountNumber: d.bankAccountNumber ?? "",
      bankIfsc: d.bankIfsc ?? "",
      bankBranch: d.bankBranch ?? "",
      upiId: d.upiId ?? "",
      invoiceTerms: d.invoiceTerms ?? "",
      invoiceFooterNote: d.invoiceFooterNote ?? "",
      // The key is never sent back from the server; keep the field blank so an
      // ordinary save does not overwrite the stored key.
      dataGovInApiKey: "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.data]);

  async function onSubmit(values: FormValues) {
    const trimOrNull = (v: string) => (v.trim() ? v.trim() : null);
    const body: SaveInvoiceSettingsRequest = {
      shopName: values.shopName.trim(),
      legalName: trimOrNull(values.legalName),
      gstNumber: trimOrNull(values.gstNumber),
      panNumber: trimOrNull(values.panNumber),
      pesticideLicenceNo: trimOrNull(values.pesticideLicenceNo),
      seedLicenceNo: trimOrNull(values.seedLicenceNo),
      fertilizerLicenceNo: trimOrNull(values.fertilizerLicenceNo),
      addressLine1: trimOrNull(values.addressLine1),
      addressLine2: trimOrNull(values.addressLine2),
      city: trimOrNull(values.city),
      stateId: values.stateId,
      pincode: trimOrNull(values.pincode),
      phone: trimOrNull(values.phone),
      alternatePhone: trimOrNull(values.alternatePhone),
      email: trimOrNull(values.email),
      website: trimOrNull(values.website),
      bankName: trimOrNull(values.bankName),
      bankAccountNumber: trimOrNull(values.bankAccountNumber),
      bankIfsc: trimOrNull(values.bankIfsc),
      bankBranch: trimOrNull(values.bankBranch),
      upiId: trimOrNull(values.upiId),
      invoiceTerms: trimOrNull(values.invoiceTerms),
      invoiceFooterNote: trimOrNull(values.invoiceFooterNote),
      dataGovInApiKey: trimOrNull(values.dataGovInApiKey),
    };
    try {
      await save.mutateAsync(body);
      toast.success(t("inv.saved"));
    } catch (error) {
      applyServerErrors<FormValues>(error, (field, err) => form.setError(field, err));
    }
  }

  const stateId = form.watch("stateId");

  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-4">
          <h3 className="text-sm font-semibold">{t("inv.title")}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">{t("inv.desc")}</p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)}>
          <fieldset disabled={!canEdit} className="space-y-6">
            {/* -------------------------- shop identity -------------------------- */}
            <Section title={t("inv.secIdentity")}>
              <FieldGrid columns={4}>
                <Field label={t("shop.shopName")} htmlFor="shopName" required error={form.formState.errors.shopName?.message}>
                  <Input id="shopName" {...form.register("shopName")} />
                </Field>
                <Field label={t("inv.legalName")} htmlFor="legalName" error={form.formState.errors.legalName?.message}>
                  <Input id="legalName" {...form.register("legalName")} />
                </Field>
                <Field label={t("shop.gstNo")} htmlFor="gstNumber" error={form.formState.errors.gstNumber?.message}>
                  <Input id="gstNumber" className="uppercase" maxLength={15} {...form.register("gstNumber")} />
                </Field>
                <Field label={t("inv.panNumber")} htmlFor="panNumber" error={form.formState.errors.panNumber?.message}>
                  <Input id="panNumber" className="uppercase" maxLength={10} {...form.register("panNumber")} />
                </Field>
              </FieldGrid>
            </Section>

            {/* ---------------------------- licences ----------------------------- */}
            <Section title={t("inv.secLicences")}>
              <FieldGrid columns={3}>
                <Field label={t("inv.pesticideLic")} htmlFor="pesticideLicenceNo" error={form.formState.errors.pesticideLicenceNo?.message}>
                  <Input id="pesticideLicenceNo" {...form.register("pesticideLicenceNo")} />
                </Field>
                <Field label={t("inv.seedLic")} htmlFor="seedLicenceNo" error={form.formState.errors.seedLicenceNo?.message}>
                  <Input id="seedLicenceNo" {...form.register("seedLicenceNo")} />
                </Field>
                <Field label={t("inv.fertilizerLic")} htmlFor="fertilizerLicenceNo" error={form.formState.errors.fertilizerLicenceNo?.message}>
                  <Input id="fertilizerLicenceNo" {...form.register("fertilizerLicenceNo")} />
                </Field>
              </FieldGrid>
            </Section>

            {/* ----------------------- payment (UPI / bank) ---------------------- */}
            <Section title={t("inv.secPayment")}>
              <FieldGrid columns={4}>
                <Field label={t("inv.upiId")} htmlFor="upiId" error={form.formState.errors.upiId?.message}>
                  <Input id="upiId" placeholder="shopname@okaxis" {...form.register("upiId")} />
                </Field>
                <Field label={t("inv.bankName")} htmlFor="bankName" error={form.formState.errors.bankName?.message}>
                  <Input id="bankName" {...form.register("bankName")} />
                </Field>
                <Field label={t("inv.bankAccount")} htmlFor="bankAccountNumber" error={form.formState.errors.bankAccountNumber?.message}>
                  <Input id="bankAccountNumber" {...form.register("bankAccountNumber")} />
                </Field>
                <Field label={t("inv.bankIfsc")} htmlFor="bankIfsc" error={form.formState.errors.bankIfsc?.message}>
                  <Input id="bankIfsc" className="uppercase" maxLength={15} {...form.register("bankIfsc")} />
                </Field>
                <Field label={t("inv.bankBranch")} htmlFor="bankBranch" error={form.formState.errors.bankBranch?.message}>
                  <Input id="bankBranch" {...form.register("bankBranch")} />
                </Field>
              </FieldGrid>
              <p className="mt-2 text-xs text-muted-foreground">{t("inv.upiHint")}</p>
            </Section>

            {/* ----------------------------- address ----------------------------- */}
            <Section title={t("inv.secAddress")}>
              <FieldGrid columns={2}>
                <Field label={`${t("cust.address")} 1`} htmlFor="addressLine1" error={form.formState.errors.addressLine1?.message}>
                  <Input id="addressLine1" {...form.register("addressLine1")} />
                </Field>
                <Field label={`${t("cust.address")} 2`} htmlFor="addressLine2" error={form.formState.errors.addressLine2?.message}>
                  <Input id="addressLine2" {...form.register("addressLine2")} />
                </Field>
              </FieldGrid>
              <FieldGrid columns={3}>
                <Field label={t("cust.city")} htmlFor="city" error={form.formState.errors.city?.message}>
                  <Input id="city" {...form.register("city")} />
                </Field>
                <Field label={t("cust.state")}>
                  <Select
                    value={stateId != null ? String(stateId) : NONE}
                    onValueChange={(v) => form.setValue("stateId", v === NONE ? null : Number(v))}
                  >
                    <SelectTrigger aria-label="State">
                      <SelectValue placeholder={t("cust.selectState")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE}>{t("cust.notSet")}</SelectItem>
                      {(states.data ?? []).map((s) => (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t("inv.pincode")} htmlFor="pincode" error={form.formState.errors.pincode?.message}>
                  <Input id="pincode" inputMode="numeric" maxLength={10} {...form.register("pincode")} />
                </Field>
              </FieldGrid>
            </Section>

            {/* ----------------------------- contact ----------------------------- */}
            <Section title={t("inv.secContact")}>
              <FieldGrid columns={4}>
                <Field label={t("inv.phone")} htmlFor="phone" error={form.formState.errors.phone?.message}>
                  <Input id="phone" inputMode="numeric" maxLength={15} {...form.register("phone")} />
                </Field>
                <Field label={t("inv.altPhone")} htmlFor="alternatePhone" error={form.formState.errors.alternatePhone?.message}>
                  <Input id="alternatePhone" inputMode="numeric" maxLength={15} {...form.register("alternatePhone")} />
                </Field>
                <Field label={t("shop.emailAddress")} htmlFor="email" error={form.formState.errors.email?.message}>
                  <Input id="email" type="email" placeholder="shop@example.com" {...form.register("email")} />
                </Field>
                <Field label={t("inv.website")} htmlFor="website" error={form.formState.errors.website?.message}>
                  <Input id="website" {...form.register("website")} />
                </Field>
              </FieldGrid>
            </Section>

            {/* --------------------------- invoice text -------------------------- */}
            <Section title={t("inv.secInvoiceText")}>
              <Field label={t("inv.terms")} htmlFor="invoiceTerms" error={form.formState.errors.invoiceTerms?.message}>
                <Textarea id="invoiceTerms" rows={2} {...form.register("invoiceTerms")} />
              </Field>
              <Field label={t("inv.footerNote")} htmlFor="invoiceFooterNote" error={form.formState.errors.invoiceFooterNote?.message}>
                <Textarea id="invoiceFooterNote" rows={2} {...form.register("invoiceFooterNote")} />
              </Field>
            </Section>

            {/* ------------------------- mandi integration ----------------------- */}
            <Section title={t("inv.secMandi")}>
              <Field label={t("inv.dataGovKey")} htmlFor="dataGovInApiKey" error={form.formState.errors.dataGovInApiKey?.message}>
                <Input
                  id="dataGovInApiKey"
                  type="password"
                  autoComplete="off"
                  placeholder={settings.data?.dataGovInKeySet ? "••••••••••••" : "579b…"}
                  {...form.register("dataGovInApiKey")}
                />
              </Field>
              <p className="text-xs text-muted-foreground">
                {settings.data?.dataGovInKeySet ? t("inv.dataGovKeySet") : t("inv.dataGovKeyNone")}
              </p>
              <p className="text-xs text-muted-foreground">{t("inv.dataGovHint")}</p>
            </Section>

            {canEdit ? (
              <div className="flex justify-end">
                <Button type="submit" variant="success" disabled={save.isPending || settings.isLoading}>
                  <Save className="mr-1.5 size-4" />
                  {t("common.save")}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">{t("inv.noPermission")}</p>
            )}
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h4 className="border-b pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}
