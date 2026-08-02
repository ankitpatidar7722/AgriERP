"use client";

import {
  useMutation,
  useQuery,
  useQueryClient,
  type UseQueryOptions,
} from "@tanstack/react-query";
import { toast } from "sonner";
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/api-client";
import { useT } from "@/features/i18n/provider";
import { ApiError, type LookupDto, type PagedResult, type QueryParameters } from "@/types/api";

/**
 * One factory instead of six near-identical hook files.
 *
 * Every master follows the same shape - paged list, single read, create,
 * update, soft delete, lookup - so the differences are the resource path and
 * the DTO types, not the logic.
 */
export function createMasterHooks<
  TList,
  TDetail,
  TSave,
  TQuery extends QueryParameters = QueryParameters,
>(resource: string, entityLabel: string) {
  const listKey = (query: TQuery) => [resource, "list", query] as const;
  const detailKey = (id: number) => [resource, "detail", id] as const;
  const lookupKey = [resource, "lookup"] as const;

  function invalidate(client: ReturnType<typeof useQueryClient>) {
    // Invalidates every key under this resource - list pages, the lookup feed
    // and any open detail - so a save is reflected wherever the record appears.
    void client.invalidateQueries({ queryKey: [resource] });
  }

  function describe(error: unknown): string {
    if (!(error instanceof ApiError)) return "Something went wrong.";
    // A validation failure already renders against the offending field; the
    // toast would just repeat it, so only the headline is shown.
    return error.message;
  }

  return {
    useList(query: TQuery) {
      return useQuery({
        queryKey: listKey(query),
        queryFn: () => apiGet<PagedResult<TList>>(`/${resource}`, query),
        // Keeps the previous page on screen while the next one loads, so the
        // table does not blank out between pages.
        placeholderData: (previous) => previous,
      });
    },

    useOne(id: number | null, options?: Partial<UseQueryOptions<TDetail>>) {
      return useQuery({
        queryKey: detailKey(id ?? 0),
        queryFn: () => apiGet<TDetail>(`/${resource}/${id}`),
        enabled: id != null && id > 0,
        ...options,
      });
    },

    useLookup(enabled = true) {
      return useQuery({
        queryKey: lookupKey,
        queryFn: () => apiGet<LookupDto[]>(`/${resource}/lookup`),
        // Lookups change rarely and feed several screens at once.
        staleTime: 5 * 60_000,
        enabled,
      });
    },

    useCreate() {
      const client = useQueryClient();
      const t = useT();
      return useMutation({
        mutationFn: (body: TSave) => apiPost<TDetail>(`/${resource}`, body),
        onSuccess: () => {
          toast.success(`${entityLabel} ${t("toast.created")}`);
          invalidate(client);
        },
        onError: (error) => toast.error(describe(error)),
      });
    },

    useUpdate() {
      const client = useQueryClient();
      const t = useT();
      return useMutation({
        mutationFn: ({ id, body }: { id: number; body: TSave }) =>
          apiPut<TDetail>(`/${resource}/${id}`, body),
        onSuccess: () => {
          toast.success(`${entityLabel} ${t("toast.updated")}`);
          invalidate(client);
        },
        onError: (error) => toast.error(describe(error)),
      });
    },

    useRemove() {
      const client = useQueryClient();
      const t = useT();
      return useMutation({
        mutationFn: (id: number) => apiDelete(`/${resource}/${id}`),
        onSuccess: () => {
          toast.success(`${entityLabel} ${t("toast.deleted")}`);
          invalidate(client);
        },
        onError: (error) => {
          // 409 here is the "still in use" guard, and its message names what is
          // blocking the delete - worth showing in full and for longer.
          const message = describe(error);
          if (error instanceof ApiError && error.isConflict) {
            toast.error(message, { duration: 8000 });
          } else {
            toast.error(message);
          }
        },
      });
    },
  };
}

/**
 * Copies server field errors onto the matching form inputs.
 *
 * The API returns PascalCase names (`ItemSubGroupCode`) because that is how the
 * C# properties are named; react-hook-form knows them as camelCase.
 */
export function applyServerErrors<TValues extends Record<string, unknown>>(
  error: unknown,
  setError: (field: keyof TValues, error: { message: string }) => void,
): boolean {
  if (!(error instanceof ApiError) || !error.errors) return false;

  for (const [field, messages] of Object.entries(error.errors)) {
    const key = (field.charAt(0).toLowerCase() + field.slice(1)) as keyof TValues;
    setError(key, { message: messages[0] });
  }
  return true;
}
