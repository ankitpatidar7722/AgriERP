/**
 * The item group layer.
 *
 * A group decides which fields the item form asks for, so the form is not laid
 * out in this codebase at all - it is fetched. Adding a field to Seed Master is
 * a row in ItemGroupFieldMaster, not a redeploy.
 */

export interface ItemGroupDto {
  itemGroupId: number;
  itemGroupCode: string;
  itemGroupName: string;
  /** Feeds the item code: P, F, S, R. */
  itemCodePrefix: string;
  description: string | null;
  iconName: string | null;
  displayOrder: number;
  subGroupCount: number;
  itemCount: number;
}

/** Every control type the form renderer knows how to draw. */
export type ItemFieldType =
  | "text"
  | "number"
  | "decimal"
  | "select"
  | "checkbox"
  | "date"
  | "textarea";

export interface ItemGroupFieldDto {
  itemGroupFieldId: number;
  /** An ItemMaster column name when isStoredOnItem, otherwise a free key. */
  fieldName: string;
  fieldDisplayName: string;
  helpText: string | null;
  fieldType: ItemFieldType;

  /**
   * true  - send the value as a top-level property of the save request, where
   *         it lands in a typed column with its constraints intact.
   * false - send it in extraFields, keyed by itemGroupFieldId.
   *
   * The client does not choose; it reports what the definition says.
   */
  isStoredOnItem: boolean;

  isRequired: boolean;
  isReadOnly: boolean;
  displayOrder: number;
  /** How many of the form's four columns this field occupies. */
  columnSpan: number;
  sectionName: string | null;
  defaultValue: string | null;
  /** A whitelisted lookup NAME - never a query. */
  lookupSource: string | null;
  minValue: number | null;
  maxValue: number | null;
  maxLength: number | null;
  unitLabel: string | null;
}

export interface ItemFormDefinitionDto {
  group: ItemGroupDto;
  sections: string[];
  fields: ItemGroupFieldDto[];
}
