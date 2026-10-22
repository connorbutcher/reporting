import { SecurableKind } from '../../../core/models/permission';

export type PermissionsDialogData = {
  kind: SecurableKind;
  id: number;
  name: string;
};
