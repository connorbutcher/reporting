import { GrantSubjectType } from './grant-subject-type.model';

export type RemoveGrant = {
  subjectType: GrantSubjectType;
  subjectId: string | null;
};
