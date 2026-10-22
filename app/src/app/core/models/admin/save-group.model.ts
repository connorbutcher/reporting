/** Create or update a group. */
export type SaveGroup = {
  name: string;
  /** RefIds of the users that should be members (set to exactly this). */
  memberIds: string[];
  /** RefIds of the users that should manage this group (must be a subset of `memberIds`). */
  managerIds: string[];
};
