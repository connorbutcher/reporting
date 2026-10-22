import { AccessLevel } from './access-level.model';
import { GrantSubjectType } from './grant-subject-type.model';

export type SaveGrant = {
  subjectType: GrantSubjectType;
  subjectId: string | null;
  level: AccessLevel;
};
