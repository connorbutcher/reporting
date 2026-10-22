import { Plural } from './plural';

/** Error and warning counts as the short labels issue indicators show. */
export class IssueSummary {
  /** The more serious kind only: "2 errors", else "1 warning", else "No issues". */
  public static headline(errors: number, warnings: number): string {
    if (errors) {
      return Plural.count(errors, 'error');
    }
    if (warnings) {
      return Plural.count(warnings, 'warning');
    }
    return 'No issues';
  }

  /** Both kinds: "2 errors · 1 warning". Empty when there are none. */
  public static both(errors: number, warnings: number): string {
    const parts: string[] = [];
    if (errors) {
      parts.push(Plural.count(errors, 'error'));
    }
    if (warnings) {
      parts.push(Plural.count(warnings, 'warning'));
    }
    return parts.join(' · ');
  }
}
