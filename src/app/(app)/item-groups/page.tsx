"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Layers, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/common/page-header";
import { useItemFormDefinition, useItemGroups } from "@/features/items/hooks";
import { cn } from "@/lib/utils";
import { useT } from "@/features/i18n/provider";

/**
 * The item groups, and what each one asks for.
 *
 * Read-only by design. A field definition is schema-shaped - adding one changes
 * what the application stores and which column it stores it in - so it is
 * changed by a migration that can be reviewed and re-run, not by a screen that
 * lets a busy shopkeeper delete the GST field on a Tuesday afternoon.
 */
export default function ItemGroupsPage() {
  const t = useT();
  const { data: groups = [], isLoading } = useItemGroups();
  const [openGroupId, setOpenGroupId] = useState<number | null>(null);

  return (
    <>
      <PageHeader
        title={t("grp.title")}
        description={t("grp.desc")}
      />

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" aria-label="Loading" />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {groups.map((group) => (
            <Card key={group.itemGroupId} className="min-w-0">
              <CardContent className="p-5">
                <div className="flex items-start gap-3">
                  <span
                    className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-primary/12 text-primary"
                    aria-hidden
                  >
                    <Layers className="size-[22px]" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="truncate text-base font-semibold">{group.itemGroupName}</h2>
                      <Badge variant="outline" className="font-mono text-xs">
                        {group.itemCodePrefix}-000001
                      </Badge>
                    </div>
                    {group.description && (
                      <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
                    )}

                    <div className="mt-3 flex flex-wrap gap-4 text-sm">
                      <Link
                        href={`/item-subgroups?itemGroupId=${group.itemGroupId}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <span className="font-semibold text-foreground">{group.subGroupCount}</span>{" "}
                        {t("grp.subGroupsLabel")}
                      </Link>
                      <Link
                        href={`/items?itemGroupId=${group.itemGroupId}`}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <span className="font-semibold text-foreground">{group.itemCount}</span>{" "}
                        {t("grp.itemsLabel")}
                      </Link>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setOpenGroupId(openGroupId === group.itemGroupId ? null : group.itemGroupId)
                      }
                      className="mt-3 flex items-center gap-1 text-sm font-medium text-primary hover:underline"
                      aria-expanded={openGroupId === group.itemGroupId}
                    >
                      <ChevronRight
                        className={cn(
                          "size-4 transition-transform",
                          openGroupId === group.itemGroupId && "rotate-90",
                        )}
                        aria-hidden
                      />
                      {t("grp.fieldsOnForm")}
                    </button>

                    {openGroupId === group.itemGroupId && (
                      <GroupFields itemGroupId={group.itemGroupId} />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}

/** The fields a group asks for, split into the ones that have a column and the ones that do not. */
function GroupFields({ itemGroupId }: { itemGroupId: number }) {
  const t = useT();
  const { data, isLoading } = useItemFormDefinition(itemGroupId);

  if (isLoading || !data) {
    return (
      <p className="mt-3 text-sm text-muted-foreground">{t("grp.loadingFields")}</p>
    );
  }

  const specific = data.fields.filter((f) => !f.isStoredOnItem);
  const shared = data.fields.filter((f) => f.isStoredOnItem);

  return (
    <div className="mt-3 space-y-3 rounded-lg border p-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("grp.onlyOnThisForm")} ({specific.length})
        </p>
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {specific.length === 0 ? (
            <span className="text-sm text-muted-foreground">{t("grp.none")}</span>
          ) : (
            specific.map((field) => (
              <Badge key={field.itemGroupFieldId} variant="secondary" className="font-normal">
                {field.fieldDisplayName}
                {field.isRequired && <span className="ml-0.5 text-destructive">*</span>}
              </Badge>
            ))
          )}
        </div>
      </div>

      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("grp.sharedWithEveryGroup")} ({shared.length})
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {t("grp.sharedDesc")}
        </p>
      </div>
    </div>
  );
}
