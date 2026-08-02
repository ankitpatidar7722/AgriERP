"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, NumberInput } from "@/components/common/form-dialog";
import { cn } from "@/lib/utils";
import { useT } from "@/features/i18n/provider";
import type { ItemGroupFieldDto } from "./types";

/** One option list, resolved from a field's lookupSource name. */
export interface LookupOption {
  id: number;
  label: string;
}

export type LookupTable = Record<string, LookupOption[]>;

/**
 * The value of one field, in the shape the control needs.
 *
 * Deliberately loose: a definition-driven form does not know at compile time
 * whether a given field is a number, a string or a boolean - that is what
 * fieldType says at runtime.
 */
export type FieldValue = string | number | boolean | null;

interface DynamicFieldProps {
  field: ItemGroupFieldDto;
  value: FieldValue;
  onChange: (value: FieldValue) => void;
  lookups: LookupTable;
  error?: string;
}

const NONE = "__none__";

/**
 * Renders one field from its definition.
 *
 * Every branch here is driven by data from ItemGroupFieldMaster. Nothing
 * about "seeds have a germination percentage" is written in this file - that
 * is a row in a table, which is the entire point: adding a field to a group is
 * an INSERT, not a release.
 */
export function DynamicField({ field, value, onChange, lookups, error }: DynamicFieldProps) {
  const span = cn(
    field.columnSpan >= 4 && "sm:col-span-2 lg:col-span-4",
    field.columnSpan === 3 && "sm:col-span-2 lg:col-span-3",
    field.columnSpan === 2 && "sm:col-span-2",
  );

  const t = useT();
  const id = `field-${field.itemGroupFieldId}`;
  const hint =
    field.unitLabel && !field.helpText
      ? `${t("field.inUnit", "In")} ${field.unitLabel}.`
      : field.helpText;

  return (
    <Field
      label={field.fieldDisplayName}
      htmlFor={id}
      required={field.isRequired}
      error={error}
      hint={hint ?? undefined}
      className={span}
    >
      {renderControl()}
    </Field>
  );

  function renderControl() {
    switch (field.fieldType) {
      case "checkbox":
        return (
          <div className="flex h-10 items-center">
            <Switch
              id={id}
              checked={Boolean(value)}
              disabled={field.isReadOnly}
              onCheckedChange={(checked) => onChange(checked)}
            />
          </div>
        );

      case "select": {
        // An unresolved lookup renders as an empty select the operator cannot
        // get past on a required field, so it says so rather than looking
        // merely empty - the difference between "nothing to pick" and
        // "something is misconfigured".
        const options = field.lookupSource ? lookups[field.lookupSource] : undefined;
        if (!options) {
          return (
            <Input
              id={id}
              value={value == null ? "" : String(value)}
              disabled
              placeholder={`${t("field.noListPrefix", "No")} "${field.lookupSource}" ${t("field.noListSuffix", "list available")}`}
            />
          );
        }

        return (
          <Select
            value={value == null || value === "" ? NONE : String(value)}
            disabled={field.isReadOnly}
            onValueChange={(next) => onChange(next === NONE ? null : Number(next))}
          >
            <SelectTrigger id={id}>
              <SelectValue
                placeholder={`${t("field.select", "Select")} ${field.fieldDisplayName.toLowerCase()}`}
              />
            </SelectTrigger>
            <SelectContent>
              {!field.isRequired && <SelectItem value={NONE}>{t("field.notSet", "Not set")}</SelectItem>}
              {options.map((option) => (
                <SelectItem key={option.id} value={String(option.id)}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }

      case "number":
      case "decimal":
        return (
          <NumberInput
            id={id}
            value={typeof value === "number" ? value : value ? Number(value) : null}
            onChange={(next) => onChange(next)}
            disabled={field.isReadOnly}
            min={field.minValue ?? undefined}
            max={field.maxValue ?? undefined}
            step={field.fieldType === "decimal" ? "0.0001" : "1"}
          />
        );

      case "textarea":
        return (
          <Textarea
            id={id}
            rows={2}
            value={value == null ? "" : String(value)}
            readOnly={field.isReadOnly}
            maxLength={field.maxLength ?? undefined}
            onChange={(event) => onChange(event.target.value)}
          />
        );

      case "date":
        return (
          <Input
            id={id}
            type="date"
            value={value == null ? "" : String(value)}
            readOnly={field.isReadOnly}
            onChange={(event) => onChange(event.target.value)}
          />
        );

      default:
        return (
          <Input
            id={id}
            value={value == null ? "" : String(value)}
            readOnly={field.isReadOnly}
            maxLength={field.maxLength ?? undefined}
            onChange={(event) => onChange(event.target.value)}
          />
        );
    }
  }
}

/**
 * Client-side validation from the definition.
 *
 * The server checks all of this again - it has to, since anything can post to
 * the API - but catching it here means the operator sees the problem beside the
 * field instead of as a message after a round trip.
 */
export function validateDynamicFields(
  fields: ItemGroupFieldDto[],
  values: Record<number, FieldValue>,
  t: (key: string, fallback?: string) => string,
): Record<number, string> {
  const errors: Record<number, string> = {};

  for (const field of fields) {
    if (field.isReadOnly) continue;
    const value = values[field.itemGroupFieldId];
    const isBlank =
      value == null || value === "" || (field.fieldType === "select" && value === 0);

    if (field.isRequired && field.fieldType !== "checkbox" && isBlank) {
      errors[field.itemGroupFieldId] =
        `${field.fieldDisplayName} ${t("field.isRequired", "is required.")}`;
      continue;
    }

    if (isBlank) continue;

    if (field.fieldType === "number" || field.fieldType === "decimal") {
      const numeric = Number(value);
      if (Number.isNaN(numeric)) {
        errors[field.itemGroupFieldId] = t("field.enterNumber", "Enter a number.");
      } else if (field.minValue != null && numeric < field.minValue) {
        errors[field.itemGroupFieldId] =
          `${t("field.cannotBeBelow", "Cannot be below")} ${field.minValue}.`;
      } else if (field.maxValue != null && numeric > field.maxValue) {
        errors[field.itemGroupFieldId] =
          `${t("field.cannotBeAbove", "Cannot be above")} ${field.maxValue}.`;
      }
    }

    if (field.maxLength != null && String(value).length > field.maxLength) {
      errors[field.itemGroupFieldId] =
        `${t("field.keepUnder", "Keep it under")} ${field.maxLength} ${t("field.characters", "characters.")}`;
    }
  }

  return errors;
}
