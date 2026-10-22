import { AccessLevel } from './access-level.model';
import { GrantSubjectType } from './grant-subject-type.model';

/** One grant, for display and editing. `subjectId` is a user/group RefId, or null for Everyone. */
export type AccessGrant = {
  subjectType: GrantSubjectType;
  subjectId: string | null;
  subjectName: string;
  level: AccessLevel;
  /** True when this comes from an ancestor rather than the object itself (effective view only). */
  inherited: boolean;
  /** The ancestor the inherited grant sits on, e.g. a folder name or "Root". Null when not inherited. */
  inheritedFrom: string | null;
};
