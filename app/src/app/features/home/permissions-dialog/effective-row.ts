import { AccessGrant } from '../../../core/models/permission';

/** One row of the effective-access list: either a group label or a grant, in display order. */
export type EffectiveRow =
  { kind: 'header'; label: string } | { kind: 'grant'; grant: AccessGrant };
