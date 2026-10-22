import { FilterGroup } from '../../../../core/models/filter';
import { ViewFilterOverrideCodec } from '../view-filter-override-codec';

/** The fake server's report, version, schema and operators, and filters on them. */
export class ViewerFixtures {
  public static readonly REPORT = {
    id: 3,
    name: 'R',
    latestVersionNumber: 1,
    accessLevel: 'viewer',
  };

  public static readonly CONTENT = {
    reportId: 3,
    name: 'R',
    notes: null,
    filters: [],
    tabs: [
      {
        id: 't1',
        name: 'Tab',
        order: 0,
        columns: 12,
        rows: 12,
        widgets: [
          {
            id: 'w1',
            type: 'dataTable',
            config: {
              type: 'dataTable',
              datasetId: 7,
              title: 'Bearings',
              columns: [],
              filter: null,
            },
          },
        ],
      },
    ],
  };

  public static readonly SCHEMA = {
    id: 7,
    name: 'Bearings',
    columns: [{ id: 'job', name: 'Job', type: 'string', order: 0, configuration: {} }],
  };

  public static readonly OPERATORS = [
    {
      type: 'string',
      operators: [{ value: 'equals', label: 'is', operandCount: 1, operandKind: 'text' }],
    },
  ];

  public static groupOn(columnId: string, value: string): FilterGroup {
    return {
      kind: 'group',
      join: 'and',
      children: [{ kind: 'condition', columnId, operator: 'equals', values: [value] }],
    };
  }

  /** A filter on the dataset's one column, `job`. */
  public static group(value: string): FilterGroup {
    return ViewerFixtures.groupOn('job', value);
  }

  /** The table widget `w1`'s filter set to `value`, as a saved or shared value looks on the wire. */
  public static encode(value: string): string {
    return ViewFilterOverrideCodec.encode({ w1: ViewerFixtures.group(value) })!;
  }
}
