import { AppPermission } from './app-permission.model';

/** The signed-in user's own identity and resolved app permissions. */
export type CurrentUser = {
  id: string;
  displayName: string;
  email: string;
  isGlobalAdmin: boolean;
  permissions: AppPermission[];
  /** Full admin — the Users section and every group. */
  canManageUsers: boolean;
  /** Can reach the Groups section — a full admin, a delegated manager of at least one group, or a
   * holder of `canCreateGroups` (who may not manage any yet). */
  canManageGroups: boolean;
  /** Can create a new group (and becomes its manager on creation). */
  canCreateGroups: boolean;
};
