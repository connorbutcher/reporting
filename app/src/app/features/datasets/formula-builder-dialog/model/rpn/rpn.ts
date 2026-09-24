import { RpnIssue } from './rpn-issue';
import { RpnToken } from './rpn-token';

export interface Rpn {
  tokens: RpnToken[];
  issues: RpnIssue[];
}
