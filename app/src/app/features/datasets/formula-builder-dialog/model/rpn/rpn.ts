import { RpnIssue } from './rpn-issue';
import { RpnToken } from './rpn-token';

export type Rpn = {
  tokens: RpnToken[];
  issues: RpnIssue[];
};
