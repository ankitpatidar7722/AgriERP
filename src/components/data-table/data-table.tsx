"use client";

import { useCallback, useEffect, useMemo } from "react";
import { DataGrid } from "indas-ui";
import type { ColumnDef } from "@tanstack/react-table";
import { cn } from "@/lib/utils";
import type { PagedResult, QueryParameters } from "@/types/api";

/**
 * The list grid for every master and register screen.
 *
 * The public shape - DataColumn and the DataTable props - is unchanged, so the
 * eleven screens that use it were converted without edits. What changed is the
 * engine underneath: it now renders the indas-ui DataGrid (search, sort,
 * filter, column chooser, export, pagination) instead of a hand-rolled table.
 *
 * SERVER PAGING BECAME CLIENT PAGING. The old table showed one server page and
 * asked the server to sort and search. The DataGrid does all of that in the
 * browser over the whole set, so this component fetches everything up front
 * (the API caps a page at 200 rows, which covers a shop's masters and a
 * filtered register) and lets the grid take over. A screen's own filter
 * controls still round-trip to the server through onQueryChange; the grid then
 * searches and sorts within whatever came back.
 *
 * SINGLE-CLICK TO OPEN. The grid's own convention is desktop-style: a single
 * click selects a row and only a double click fires the consumer's onRowClick.
 * Every register in this app opened its record on a single click before the
 * grid landed, so that behaviour is preserved here with a delegated click
 * handler on the wrapper: each cell carries the row's key, the handler reads it
 * and calls onRowClick. Row selection is turned off, so the grid's own click
 * handling is inert and never competes. Clicks on a control inside a cell (an
 * action button, a link) are left to that control.
 */

export interface DataColumn<T> {
  /** Stable id for the column; also the React key. */
  key: string;
  header: string;
  cell: (row: T) => React.ReactNode;
  sortable?: boolean;
  align?: "left" | "right" | "center";
  /** Retained for source compatibility; the grid's column chooser replaces it. */
  hideBelow?: "sm" | "md" | "lg" | "xl";
  headerClassName?: string;
  cellClassName?: string;
  /**
   * Plain value for sorting and Excel/PDF export. A column without it renders
   * but is not sortable and is skipped on export - same rule as before.
   */
  exportValue?: (row: T) => string | number | null | undefined;
}

interface DataTableProps<T> {
  columns: DataColumn<T>[];
  result?: PagedResult<T>;
  isLoading: boolean;
  isFetching?: boolean;
  query: QueryParameters;
  onQueryChange: (query: QueryParameters) => void;
  getRowId: (row: T) => string | number;
  searchPlaceholder?: string;
  /** Extra filter controls, rendered in the grid's header row. */
  filters?: React.ReactNode;
  emptyMessage?: string;
  exportFileName?: string;
  exportTitle?: string;
  onRowClick?: (row: T) => void;
}

/** The whole set fits in one fetch, so the grid can page it client-side. */
const FETCH_ALL_PAGE_SIZE = 200;

/**
 * Cells stamp the row key on this attribute so the delegated click can find its
 * record. The JSX below writes the attribute literally (data-agri-rowkey) - keep
 * the two spellings in step.
 */
const ROW_KEY_ATTR = "data-agri-rowkey";

/** A click that lands on one of these is the control's to handle, not the row's. */
const INTERACTIVE_SELECTOR = 'button, a, input, select, textarea, label, [role="menuitem"], [role="checkbox"], [role="button"]';

function alignClass(align: DataColumn<unknown>["align"]) {
  return cn(align === "right" && "text-right tabular", align === "center" && "text-center");
}

export function DataTable<T>({
  columns,
  result,
  isLoading,
  query,
  onQueryChange,
  getRowId,
  filters,
  onRowClick,
}: DataTableProps<T>) {
  // Pull the whole set once. The grid pages it in the browser, so a 25-row
  // server page would leave its pager stuck at "1-25 of 25".
  useEffect(() => {
    if ((query.pageSize ?? 0) < FETCH_ALL_PAGE_SIZE) {
      onQueryChange({ ...query, page: 1, pageSize: FETCH_ALL_PAGE_SIZE });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = result?.items ?? [];

  // Key -> row, so the delegated click can turn the DOM's row key back into the
  // record without depending on DOM order (the grid virtualises its rows).
  const rowByKey = useMemo(() => {
    const map = new Map<string, T>();
    for (const row of rows) map.set(String(getRowId(row)), row);
    return map;
  }, [rows, getRowId]);

  const gridColumns = useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((column) => {
        const canSort = !!column.sortable && !!column.exportValue;
        return {
          id: column.key,
          // A function accessor gives the grid a plain value to sort, search
          // and export by, while the cell below still renders the rich node.
          accessorFn: column.exportValue
            ? (row: T) => column.exportValue!(row) ?? ""
            : undefined,
          header: () => <span className={alignClass(column.align)}>{column.header}</span>,
          cell: ({ row }) => (
            <div
              className={cn(alignClass(column.align), column.cellClassName)}
              data-agri-rowkey={row.id}
            >
              {column.cell(row.original)}
            </div>
          ),
          enableSorting: canSort,
          enableColumnFilter: false,
          meta: { align: column.align },
        } satisfies ColumnDef<T>;
      }),
    [columns],
  );

  // The grid fires the consumer's onRowClick on double-click; this keeps the
  // app's single-click-to-open behaviour. It finds the clicked row's <tr> and
  // reads the key off any of its cells - the key sits on a div inside each td,
  // so reaching up from the click target would miss when the click lands on the
  // cell's padding. Clicks that belong to a control inside the row are left
  // alone, as are header and spacer rows, which carry no keyed cell.
  const handleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!onRowClick) return;
      const target = event.target as HTMLElement;
      if (target.closest(INTERACTIVE_SELECTOR)) return;
      const tr = target.closest("tr");
      const key = tr?.querySelector(`[${ROW_KEY_ATTR}]`)?.getAttribute(ROW_KEY_ATTR);
      if (!key) return;
      const row = rowByKey.get(key);
      if (row) onRowClick(row);
    },
    [onRowClick, rowByKey],
  );

  return (
    <div onClick={onRowClick ? handleClick : undefined}>
      <DataGrid<T>
        data={rows}
        columns={gridColumns}
        getRowId={(row) => String(getRowId(row))}
        // Also wired to the grid's native double-click, so both gestures open a
        // record - single click through the wrapper above, double click here.
        onRowClick={onRowClick}
        loading={isLoading}
        enableSearch
        enableSorting
        enableFiltering
        enableColumnVisibility
        enableExport
        // Off deliberately: no screen uses multi-select, and with selection off
        // the grid's own single-click handling is inert - it never competes
        // with the wrapper's click that navigates to the detail page.
        enableRowSelection={false}
        pageSize={25}
        stickyHeader
        headerActions={filters}
      />
    </div>
  );
}
