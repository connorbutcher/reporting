/** A user row in the admin list. */
export type AdminUser = {
  id: string;
  displayName: string;
  email: string;
  /** Global admin; implies every permission and is read-only in the admin UI. */
  isGlobalAdmin: boolean;
  /** Holds the manage-users permission, granted directly to them. */
  canManageUsers: boolean;
  /** Holds the create-groups permission (directly, or implied by `isGlobalAdmin`). */
  canCreateGroups: boolean;
  groupCount: number;
};
