/** Mirrors AgriERP.Application.Features.Modules.Dtos. One row of app.ModuleMaster. */
export interface SidebarModule {
  moduleId: number;
  /** The route to navigate to, leading slash included: "/items". */
  moduleName: string;
  /** The text the sidebar prints. */
  moduleDisplayName: string;
  /** Lucide React icon name, e.g. "Package". Null falls back to a placeholder. */
  iconName?: string | null;
  moduleDisplayOrder: number;
}

/** A heading and the entries under it, already ordered by the API. */
export interface SidebarGroup {
  /** Internal group key - stable identity, used as the React key. */
  moduleHeadName: string;
  /** The heading the sidebar prints. */
  moduleHeadDisplayName: string;
  moduleHeadDisplayOrder: number;
  setGroupIndex: number;
  modules: SidebarModule[];
}
