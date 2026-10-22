import { Signal, computed, signal } from '@angular/core';
import { DatasetColumn, DatasetSchema } from '../../../core/models/dataset';
import {
  Aggregate,
  WidgetConfigDefaults,
  KpiComparisonMode,
  KpiDirection,
  KpiToleranceStatusMode,
  KpiValueSource,
  KpiWidget,
  KpiWidgetConfig,
  ToleranceConfig,
} from '../../../core/models/report';
import { EditorNode } from './editor-node';
import { FilterGroupModel } from './filter';
import { WidgetModel } from './widget-model-base';
import { ModelSources } from './sources/model-sources';
import { ValidationIssue } from './validation-issue';
import { ColumnTypes } from './column-types';

/**
 * A headline number from one dataset: an aggregate over a column, or the count or percent of rows
 * failing a tolerance band. Optionally compared with a target or the previous period.
 */
export class KpiWidgetModel extends WidgetModel {
  public override readonly type = 'kpi' as const;

  public readonly datasetId = signal<number | null>(null);

  public readonly valueSource = signal<KpiValueSource>('aggregate');
  public readonly aggregate = signal<Aggregate>('sum');
  /** The aggregated column (unused for Count), or the tolerance-checked column. */
  public readonly valueColumnId = signal<string | null>(null);

  /** Tolerance mode's band; null when none is configured. */
  public readonly tolerance = signal<ToleranceConfig | null>(null);
  public readonly toleranceStatusMode = signal<KpiToleranceStatusMode>('fail');
  public readonly showAsPercent = signal(true);

  public readonly comparisonMode = signal<KpiComparisonMode>('none');
  public readonly targetValue = signal<number | null>(null);
  public readonly dateColumnId = signal<string | null>(null);
  public readonly periodDays = signal(7);

  public readonly direction = signal<KpiDirection>('higherIsBetter');
  public readonly unitPrefix = signal('');
  public readonly unitSuffix = signal('');
  public readonly decimalPlaces = signal(1);

  /** Absolute status bands, independent of the comparison. */
  public readonly thresholdsEnabled = signal(false);
  public readonly warningThreshold = signal<number | null>(null);
  public readonly criticalThreshold = signal<number | null>(null);

  /** Reuses {@link dateColumnId} and {@link periodDays}. */
  public readonly showSparkline = signal(false);
  public readonly sparklinePeriods = signal(8);

  /** Fixed-target mode only: a progress bar instead of the trend arrow. */
  public readonly showAsMeter = signal(false);

  /** When set, shows a mini-tile per distinct value of this column. */
  public readonly groupByColumnId = signal<string | null>(null);
  public readonly maxGroups = signal(8);

  public readonly filter: FilterGroupModel;

  public readonly schema: Signal<DatasetSchema | null>;
  public readonly columns: Signal<DatasetColumn[]>;
  public readonly numericColumns: Signal<DatasetColumn[]>;
  public readonly dateColumns: Signal<DatasetColumn[]>;

  /** The tolerance's own limits dataset, separate from {@link schema}. */
  private readonly toleranceSchema: Signal<DatasetSchema | null>;

  constructor(widget: KpiWidget, sources: ModelSources) {
    super(widget);
    const config = widget.config;

    this.datasetId.set(config.datasetId);
    this.valueSource.set(config.valueSource);
    this.aggregate.set(config.aggregate);
    this.valueColumnId.set(config.valueColumnId);
    this.tolerance.set(config.tolerance);
    this.toleranceStatusMode.set(config.toleranceStatusMode);
    this.showAsPercent.set(config.showAsPercent);
    this.comparisonMode.set(config.comparisonMode);
    this.targetValue.set(config.targetValue);
    this.dateColumnId.set(config.dateColumnId);
    this.periodDays.set(config.periodDays);
    this.direction.set(config.direction);
    this.unitPrefix.set(config.unitPrefix);
    this.unitSuffix.set(config.unitSuffix);
    this.decimalPlaces.set(config.decimalPlaces);
    this.thresholdsEnabled.set(config.thresholdsEnabled);
    this.warningThreshold.set(config.warningThreshold);
    this.criticalThreshold.set(config.criticalThreshold);
    this.showSparkline.set(config.showSparkline);
    this.sparklinePeriods.set(config.sparklinePeriods);
    this.showAsMeter.set(config.showAsMeter);
    this.groupByColumnId.set(config.groupByColumnId);
    this.maxGroups.set(config.maxGroups);

    this.schema = computed(() => {
      const id = this.datasetId();
      return id ? (sources.schemas()[id] ?? null) : null;
    });
    this.columns = computed(() => this.schema()?.columns ?? []);
    this.numericColumns = computed(() =>
      this.columns().filter((c) => ColumnTypes.isNumeric(c.type)),
    );
    this.dateColumns = computed(() => this.columns().filter((c) => c.type === 'dateTime'));
    this.toleranceSchema = computed(() => {
      const sourceId = this.tolerance()?.sourceDatasetId;
      return sourceId ? (sources.schemas()[sourceId] ?? null) : null;
    });

    this.filter = new FilterGroupModel(config.filter ?? null, {
      schema: this.schema,
      catalogue: sources.catalogue,
      columns: this.columns,
      view: { kind: 'widgetFilters', widgetId: this.id },
      ownerId: this.id,
      widgetId: this.id,
    });
  }

  /** Clears every column choice, the tolerance and the filter. */
  public setDataset(datasetId: number | null): void {
    if (datasetId === this.datasetId()) {
      return;
    }
    this.datasetId.set(datasetId);
    this.valueColumnId.set(null);
    this.tolerance.set(null);
    this.dateColumnId.set(null);
    this.groupByColumnId.set(null);
    this.filter.clear();
  }

  public setValueSource(source: KpiValueSource): void {
    this.valueSource.set(source);
    if (source === 'aggregate' && this.aggregate() === 'count') {
      this.valueColumnId.set(null);
    }
  }

  public setAggregate(aggregate: Aggregate): void {
    this.aggregate.set(aggregate);
    if (aggregate === 'count') {
      this.valueColumnId.set(null);
    }
  }

  public setTolerance(tolerance: ToleranceConfig | null): void {
    this.tolerance.set(tolerance);
  }

  /** Drops fields the new mode doesn't use; the date column stays while the sparkline needs it. */
  public setComparisonMode(mode: KpiComparisonMode): void {
    this.comparisonMode.set(mode);
    if (mode !== 'fixedTarget') {
      this.targetValue.set(null);
    }
    if (mode !== 'previousPeriod' && !this.showSparkline()) {
      this.dateColumnId.set(null);
    }
  }

  /** Keeps the date column while the comparison still uses it. */
  public setShowSparkline(show: boolean): void {
    this.showSparkline.set(show);
    if (!show && this.comparisonMode() !== 'previousPeriod') {
      this.dateColumnId.set(null);
    }
  }

  public override toDto(): KpiWidget {
    const config: KpiWidgetConfig = {
      type: 'kpi',
      ...WidgetConfigDefaults.KPI,
      ...this.baseConfigDto(),
      datasetId: this.datasetId(),
      valueSource: this.valueSource(),
      aggregate: this.aggregate(),
      valueColumnId: this.valueColumnId(),
      tolerance: this.tolerance(),
      toleranceStatusMode: this.toleranceStatusMode(),
      showAsPercent: this.showAsPercent(),
      comparisonMode: this.comparisonMode(),
      targetValue: this.targetValue(),
      dateColumnId: this.dateColumnId(),
      periodDays: this.periodDays(),
      direction: this.direction(),
      unitPrefix: this.unitPrefix(),
      unitSuffix: this.unitSuffix(),
      decimalPlaces: this.decimalPlaces(),
      thresholdsEnabled: this.thresholdsEnabled(),
      warningThreshold: this.warningThreshold(),
      criticalThreshold: this.criticalThreshold(),
      showSparkline: this.showSparkline(),
      sparklinePeriods: this.sparklinePeriods(),
      showAsMeter: this.showAsMeter(),
      groupByColumnId: this.groupByColumnId(),
      maxGroups: this.maxGroups(),
      filter: this.filter.toDto(),
    };
    return { ...this.geometryDto(), type: 'kpi', config };
  }

  public override defaultTitle(): string {
    return 'KPI';
  }

  public override childNodes(): readonly EditorNode[] {
    return [this.filter];
  }

  public override ownIssues(): ValidationIssue[] {
    if (!this.datasetId()) {
      return [
        this.issue(
          'noDataset',
          'warning',
          `${this.label()} has no dataset`,
          'Pick a dataset so there is something to summarise.',
        ),
      ];
    }
    return [
      this.valueColumnIssue(),
      this.toleranceSetupIssue(),
      this.targetIssue(),
      this.dateColumnIssue(),
      ...this.removedColumnIssues(),
      this.removedToleranceColumnIssue(),
    ].filter((issue): issue is ValidationIssue => !!issue);
  }

  private valueColumnIssue(): ValidationIssue | null {
    const needsColumn = this.valueSource() === 'aggregate' && this.aggregate() !== 'count';
    if (!needsColumn || this.valueColumnId()) {
      return null;
    }
    return this.issue(
      'noValueColumn',
      'warning',
      `${this.label()} has no value column`,
      'Pick a column to summarise, or switch to Count.',
    );
  }

  private toleranceSetupIssue(): ValidationIssue | null {
    if (this.valueSource() !== 'toleranceOutOfLimits') {
      return null;
    }
    if (this.valueColumnId() && this.tolerance()) {
      return null;
    }
    return this.issue(
      'noTolerance',
      'warning',
      `${this.label()} has no tolerance configured`,
      'Pick a value column and a tolerance band to check it against.',
    );
  }

  private targetIssue(): ValidationIssue | null {
    if (this.comparisonMode() !== 'fixedTarget' || this.targetValue() !== null) {
      return null;
    }
    return this.issue(
      'noTarget',
      'warning',
      `${this.label()} has no target value`,
      'Enter the value to compare against, or turn off the comparison.',
    );
  }

  private dateColumnIssue(): ValidationIssue | null {
    const needsDate = this.comparisonMode() === 'previousPeriod' || this.showSparkline();
    if (!needsDate || this.dateColumnId()) {
      return null;
    }
    return this.issue(
      'noDateColumn',
      'warning',
      `${this.label()} has no date column`,
      'Pick the date column the previous-period comparison or sparkline windows on.',
    );
  }

  /** Columns that were picked but have since been removed from the dataset. */
  private removedColumnIssues(): ValidationIssue[] {
    const schema = this.schema();
    if (!schema) {
      return [];
    }
    const columnIds = new Set(schema.columns.map((c) => c.id));
    const name = this.label();
    const issues: ValidationIssue[] = [];

    if (this.isRemoved(columnIds, this.valueColumnId())) {
      issues.push(
        this.issue(
          'missingValueColumn',
          'error',
          `${name}'s value column no longer exists`,
          'The column it summarises was removed from the dataset. Pick a new one.',
        ),
      );
    }
    if (this.isRemoved(columnIds, this.dateColumnId())) {
      issues.push(
        this.issue(
          'missingDateColumn',
          'error',
          `${name}'s date column no longer exists`,
          'The column the previous-period comparison windows on was removed. Pick a new one.',
        ),
      );
    }
    if (this.isRemoved(columnIds, this.groupByColumnId())) {
      issues.push(
        this.issue(
          'missingGroupColumn',
          'error',
          `${name}'s group-by column no longer exists`,
          'The column it grouped tiles by was removed from the dataset. Pick a new one.',
        ),
      );
    }
    return issues;
  }

  private removedToleranceColumnIssue(): ValidationIssue | null {
    const toleranceSchema = this.toleranceSchema();
    if (!toleranceSchema || !this.tolerancePointsAtRemovedColumn(toleranceSchema)) {
      return null;
    }
    return this.issue(
      'toleranceMissing',
      'error',
      `${this.label()}'s tolerance points at a removed column`,
      `A column this tolerance uses (in "${toleranceSchema.name}" or in this widget's own dataset) has been removed. Re-point it or remove the banding.`,
    );
  }

  /** Limit columns live in the limits dataset; the match column lives in this widget's own dataset. */
  private tolerancePointsAtRemovedColumn(toleranceSchema: DatasetSchema): boolean {
    const tolerance = this.tolerance();
    if (!tolerance) {
      return false;
    }
    const columnIds = new Set(toleranceSchema.columns.map((c) => c.id));
    const pointers = [
      tolerance.minColumnId,
      tolerance.maxColumnId,
      tolerance.concessionLowerColumnId,
      tolerance.concessionUpperColumnId,
      tolerance.match?.sourceColumnId,
    ].filter((id): id is string => !!id);
    const schema = this.schema();
    const matchColumnGone =
      !!tolerance.match &&
      !!schema &&
      !schema.columns.some((c) => c.id === tolerance.match!.columnId);
    return pointers.some((id) => !columnIds.has(id)) || matchColumnGone;
  }

  private isRemoved(columnIds: ReadonlySet<string>, columnId: string | null): boolean {
    return !!columnId && !columnIds.has(columnId);
  }
}
