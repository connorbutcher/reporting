import { GrantSubjectType } from '../../../core/models/permission';

export type SubjectOption = {
  label: string;
  value: string;
  subjectType: GrantSubjectType;
  subjectId: string | null;
};
