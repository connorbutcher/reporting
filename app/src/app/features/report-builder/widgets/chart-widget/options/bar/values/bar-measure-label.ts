import { Aggregate } from '../../../../../../../core/models/report';

export class BarMeasureLabel {
  /** "Count of rows", or the aggregate of the measure ("Sum of Price"). */
  public static of(aggregate: Aggregate, measure: string | null): string {
    if (aggregate === 'count') {
      return 'Count of rows';
    }
    const name = BarMeasureLabel.aggregateName(aggregate);
    return measure ? `${name} of ${measure}` : name;
  }

  private static aggregateName(aggregate: Aggregate): string {
    switch (aggregate) {
      case 'sum':
        return 'Sum';
      case 'average':
        return 'Average';
      case 'count':
        return 'Count';
      case 'min':
        return 'Min';
      case 'max':
        return 'Max';
    }
  }
}
