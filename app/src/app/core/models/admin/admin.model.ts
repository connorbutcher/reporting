/** An application-wide permission, granted independently of the folder/report ACL. */
export type AppPermission = 'manageUsers';

/** A user or group reference, for member/membership lists. */
export interface UserRef {
  id: string;
  displayName: string;
  email: string;
}

export interface GroupRef {
  id: string;
  name: string;
}

/** A user row in the admin list. */
export interface AdminUser {
  id: string;
  displayName: string;
  email: string;
  /** Seed-level super-admin; implies every permission and is read-only in the admin UI. */
  isGlobalAdmin: boolean;
  /** Holds the manage-users permission directly or via a group. */
  canManageUsers: boolean;
  groupCount: number;
}

/** A user with the extra detail the edit dialog needs. */
export interface AdminUserDetail extends AdminUser {
  /** True when manage-users is granted directly (not only inherited from a group). */
  canManageUsersDirect: boolean;
  groups: GroupRef[];
  createdAt: string;
}

/** Create or update a user. On update the email is fixed and ignored. */
export interface SaveUser {
  displayName: string;
  email: string;
  canManageUsers: boolean;
  /** RefIds of the groups the user should belong to (set to exactly this). */
  groupIds: string[];
}

/** A group row in the admin list. */
export interface AdminGroup {
  id: string;
  name: string;
  memberCount: number;
  /** Holds the manage-users permission (given to all its members). */
  canManageUsers: boolean;
}

/** A group with its members, for the edit dialog. */
export interface AdminGroupDetail extends AdminGroup {
  members: UserRef[];
}

/** Create or update a group. */
export interface SaveGroup {
  name: string;
  canManageUsers: boolean;
  /** RefIds of the users that should be members (set to exactly this). */
  memberIds: string[];
}

/** The signed-in user's own identity and resolved app permissions. */
export interface CurrentUser {
  id: string;
  displayName: string;
  email: string;
  isGlobalAdmin: boolean;
  permissions: AppPermission[];
  canManageUsers: boolean;
}
