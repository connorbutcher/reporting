import { AdminGroup } from './admin-group.model';
import { UserRef } from './user-ref.model';

/** A group with its members and managers, for the detail card. */
export type AdminGroupDetail = AdminGroup & {
  members: UserRef[];
  /** The users delegated to manage this group (always a subset of `members`). */
  managers: UserRef[];
};
