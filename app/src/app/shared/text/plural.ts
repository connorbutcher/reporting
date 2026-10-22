/** The singular or plural form of a word for a count. */
export class Plural {
  public static of(count: number, one: string, many = `${one}s`): string {
    return count === 1 ? one : many;
  }

  /** "1 row", "3 rows". */
  public static count(count: number, one: string, many = `${one}s`): string {
    return `${count} ${Plural.of(count, one, many)}`;
  }
}
