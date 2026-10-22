import { AdminUser } from './admin-user.model';
import { GroupRef } from './group-ref.model';

/** A user with the extra detail the edit dialog needs. */
export type AdminUserDetail = AdminUser & {
  groups: GroupRef[];
  createdAt: string;
};
