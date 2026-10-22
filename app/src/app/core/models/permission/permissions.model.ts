import { AccessGrant } from './access-grant.model';

export type Permissions = {
  inheritsPermissions: boolean;
  /** Grants set directly on this object. */
  explicit: AccessGrant[];
  /** Resolved "who can access, and why" — this object's grants plus inherited ones. Read-only. */
  effective: AccessGrant[];
};
