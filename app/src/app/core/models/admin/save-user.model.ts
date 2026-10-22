/** Create or update a user. On update the email is fixed and ignored. */
export type SaveUser = {
  displayName: string;
  email: string;
  canManageUsers: boolean;
  canCreateGroups: boolean;
  /** RefIds of the groups the user should belong to (set to exactly this). */
  groupIds: string[];
};
