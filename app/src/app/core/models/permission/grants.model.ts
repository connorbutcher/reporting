import { AccessLevel, GrantSubjectType } from './subjects.model';

/** One grant, for display and editing. `subjectId` is a user/group RefId, or null for Everyone. */
export interface AccessGrant {
  subjectType: GrantSubjectType;
  subjectId: string | null;
  subjectName: string;
  level: AccessLevel;
  /** True when this comes from an ancestor rather than the object itself (effective view only). */
  inherited: boolean;
  /** The ancestor the inherited grant sits on, e.g. a folder name or "Root". Null when not inherited. */
  inheritedFrom: string | null;
}

export interface Permissions {
  inheritsPermissions: boolean;
  /** Grants set directly on this object. */
  explicit: AccessGrant[];
  /** Resolved "who can access, and why" — this object's grants plus inherited ones. Read-only. */
  effective: AccessGrant[];
}

export interface SaveGrant {
  subjectType: GrantSubjectType;
  subjectId: string | null;
  level: AccessLevel;
}

export interface RemoveGrant {
  subjectType: GrantSubjectType;
  subjectId: string | null;
}

export interface SetInheritance {
  inherits: boolean;
  /** When breaking inheritance, copy the currently-effective grants down first so no one loses access. */
  copyDown: boolean;
}
