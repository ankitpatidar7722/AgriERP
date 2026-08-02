"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useT } from "@/features/i18n/provider";

export interface SearchPickerOption {
  id: number;
  primary: string;
  secondary?: string | null;
  /** Right-aligned hint - stock on hand, a rate, an outstanding balance. */
  trailing?: string | null;
  disabled?: boolean;
}

interface SearchPickerProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SearchPickerOption[];
  onSelect: (option: SearchPickerOption) => void;
  placeholder?: string;
  isLoading?: boolean;
  emptyMessage?: string;
  autoFocus?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  className?: string;
  /**
   * Open the list on focus even before anything is typed, showing whatever the
   * options already hold. Use it where the options are a ready list (customers,
   * suppliers); leave it off for a type-ahead that only fetches once queried.
   */
  openOnFocus?: boolean;
}

/**
 * Type-ahead picker built from an input and a list.
 *
 * Keyboard-first on purpose: at a billing counter the operator's hands stay on
 * the keyboard, so arrow keys move the highlight and Enter commits without ever
 * reaching for the mouse.
 */
export function SearchPicker({
  value,
  onValueChange,
  options,
  onSelect,
  placeholder,
  isLoading = false,
  emptyMessage,
  autoFocus = false,
  inputRef,
  className,
  openOnFocus = false,
}: SearchPickerProps) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  // Reset the highlight whenever the result set changes, so Enter never
  // commits a row the user is no longer looking at.
  useEffect(() => setHighlighted(0), [options]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  // Keep the highlighted row in view when arrowing past the fold.
  useEffect(() => {
    listRef.current?.children[highlighted]?.scrollIntoView({ block: "nearest" });
  }, [highlighted]);

  function commit(option: SearchPickerOption) {
    if (option.disabled) return;
    onSelect(option);
    setOpen(false);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!open && (event.key === "ArrowDown" || event.key === "Enter")) {
      setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((index) => Math.min(index + 1, options.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = options[highlighted];
      if (option) commit(option);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        ref={inputRef}
        value={value}
        autoFocus={autoFocus}
        placeholder={placeholder ?? t("common.searchDots")}
        className="pl-8 pr-8"
        onChange={(event) => {
          onValueChange(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
      />

      {isLoading ? (
        <Loader2 className="absolute right-2.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
      ) : value ? (
        <button
          type="button"
          onClick={() => {
            onValueChange("");
            setOpen(false);
          }}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded-sm text-muted-foreground hover:text-foreground"
          aria-label="Clear"
        >
          <X className="size-4" />
        </button>
      ) : null}

      {open && (openOnFocus || value.trim().length > 0) && (
        <ul
          ref={listRef}
          role="listbox"
          className="absolute z-50 mt-1 max-h-72 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-lg scrollbar-thin"
        >
          {options.length === 0 ? (
            <li className="px-3 py-6 text-center text-sm text-muted-foreground">
              {isLoading ? t("common.searching") : emptyMessage ?? t("common.noMatches")}
            </li>
          ) : (
            options.map((option, index) => (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={index === highlighted}
                  disabled={option.disabled}
                  onMouseEnter={() => setHighlighted(index)}
                  onClick={() => commit(option)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-sm px-2.5 py-2 text-left text-sm",
                    index === highlighted && "bg-accent text-accent-foreground",
                    option.disabled && "cursor-not-allowed opacity-50",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate">{option.primary}</span>
                    {option.secondary && (
                      <span className="block truncate text-xs text-muted-foreground">
                        {option.secondary}
                      </span>
                    )}
                  </span>
                  {option.trailing && (
                    <span className="shrink-0 text-xs tabular text-muted-foreground">
                      {option.trailing}
                    </span>
                  )}
                </button>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
