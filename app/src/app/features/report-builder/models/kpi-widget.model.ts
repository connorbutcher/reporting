import { Signal, computed, signal } from '@angular/core';
import { DatasetColumn, DatasetSchema } from '../../../core/models/dataset';
import {
  Aggregate,
  DEFAULT_KPI_CONFIG,
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
import { ModelSources, WidgetModel } from './widget-model-base';
import { ValidationIssue } from './validation-issue';

/** Numeric column types an aggregate other than Count can reduce. */
function isNumeric(type: DatasetColumn['type']): boolean {
  return type === 'int' || type === 'double';
}

/**
 * A single headline number reduced from a dataset: either a plain aggregate over a column, or the
 * count/percent of rows failing a tolerance band. Optionally compared against a fixed target or the
 * previous rolling period, with a direction so the client knows whether the trend is good or bad.
 * Binds a single dataset, like the data table and pivot.
 */
export class KpiWidgetModel extends WidgetModel {
  public override readonly type = 'kpi' as const;

  /** Null until the user binds the widget to a dataset. */
  public readonly datasetId = signal<number | null>(null);

  public readonly valueSource = signal<KpiValueSource>('aggregate');
  public readonly aggregate = signal<Aggregate>('sum');
  /** The aggregated column (aggregate mode, unused for `count`), or the tolerance-checked column (tolerance mode). */
  public readonly valueColumnId = signal<string | null>(null);

  /** Tolerance mode: the band rows are checked against. Null shows no tolerance is configured. */
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

  /** Absolute status bands, independent of the trend/comparison. */
  public readonly thresholdsEnabled = signal(false);
  public readonly warningThreshold = signal<number | null>(null);
  public readonly criticalThreshold = signal<number | null>(null);

  /** A trend line of the value's trailing history, reusing {@link dateColumnId}/{@link periodDays}. */
  public readonly showSparkline = signal(false);
  public readonly sparklinePeriods = signal(8);

  /** Fixed-target mode only: a progress bar toward the target instead of the trend arrow. */
  public readonly showAsMeter = signal(false);

  /** Set, the widget becomes a row of mini-tiles — one value per distinct value of this column. */
  public readonly groupByColumnId = signal<string | null>(null);
  public readonly maxGroups = signal(8);

  /** Rows this widget summarises, narrowed server-side. */
  public readonly filter: FilterGroupModel;

  /** The bound dataset's schema, once loaded. */
  public readonly schema: Signal<DatasetSchema | null>;
  /** Every column on the bound dataset. */
  public readonly columns: Signal<DatasetColumn[]>;
  /** Numeric columns, for the value-column picker (Count aside). */
  public readonly numericColumns: Signal<DatasetColumn[]>;
  /** Date columns, for the previous-period comparison's date-column picker. */
  public readonly dateColumns: Signal<DatasetColumn[]>;

  /** The tolerance's own "limits" dataset schema, once loaded — separate from {@link schema}. */
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
    this.numericColumns = computed(() => this.columns().filter((c) => isNumeric(c.type)));
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

  /** Swapping dataset invalidates every column choice, the tolerance, and the filter. */
  public setDataset(datasetId: number | null): void {
    if (datasetId === this.datasetId()) return;
    this.datasetId.set(datasetId);
    this.valueColumnId.set(null);
    this.tolerance.set(null);
    this.dateColumnId.set(null);
    this.groupByColumnId.set(null);
    this.filter.clear();
  }

  /** Switching to Count drops the value column; switching away from aggregate drops nothing extra. */
  public setValueSource(source: KpiValueSource): void {
    this.valueSource.set(source);
    if (source === 'aggregate' && this.aggregate() === 'count') this.valueColumnId.set(null);
  }

  public setAggregate(aggregate: Aggregate): void {
    this.aggregate.set(aggregate);
    if (aggregate === 'count') this.valueColumnId.set(null);
  }

  public setTolerance(tolerance: ToleranceConfig | null): void {
    this.tolerance.set(tolerance);
  }

  /**
   * Switching comparison mode drops fields the new mode doesn't use. The date column is shared with
   * the sparkline, so it's only cleared when neither feature needs it any more.
   */
  public setComparisonMode(mode: KpiComparisonMode): void {
    this.comparisonMode.set(mode);
    if (mode !== 'fixedTarget') this.targetValue.set(null);
    if (mode !== 'previousPeriod' && !this.showSparkline()) this.dateColumnId.set(null);
  }

  /** Turning the sparkline off drops the date column only if the comparison isn't using it too. */
  public setShowSparkline(show: boolean): void {
    this.showSparkline.set(show);
    if (!show && this.comparisonMode() !== 'previousPeriod') this.dateColumnId.set(null);
  }

  public override toDto(): KpiWidget {
    const config: KpiWidgetConfig = {
      type: 'kpi',
      ...DEFAULT_KPI_CONFIG,
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
    const issues: ValidationIssue[] = [];
    const name = this.label();
    const view = { kind: 'widget', widgetId: this.id } as const;

    if (!this.datasetId()) {
      issues.push({
        id: `${this.id}:noDataset`,
        severity: 'warning',
        title: `${name} has no dataset`,
        detail: 'Pick a dataset so there is something to summarise.',
        widgetId: this.id,
        view,
      });
      return issues;
    }

    if (
      this.valueSource() === 'aggregate' &&
      this.aggregate() !== 'count' &&
      !this.valueColumnId()
    ) {
      issues.push({
        id: `${this.id}:noValueColumn`,
        severity: 'warning',
        title: `${name} has no value column`,
        detail: 'Pick a column to summarise, or switch to Count.',
        widgetId: this.id,
        view,
      });
    }

    if (
      this.valueSource() === 'toleranceOutOfLimits' &&
      (!this.valueColumnId() || !this.tolerance())
    ) {
      issues.push({
        id: `${this.id}:noTolerance`,
        severity: 'warning',
        title: `${name} has no tolerance configured`,
        detail: 'Pick a value column and a tolerance band to check it against.',
        widgetId: this.id,
        view,
      });
    }

    if (this.comparisonMode() === 'fixedTarget' && this.targetValue() === null) {
      issues.push({
        id: `${this.id}:noTarget`,
        severity: 'warning',
        title: `${name} has no target value`,
        detail: 'Enter the value to compare against, or turn off the comparison.',
        widgetId: this.id,
        view,
      });
    }

    if (
      (this.comparisonMode() === 'previousPeriod' || this.showSparkline()) &&
      !this.dateColumnId()
    ) {
      issues.push({
        id: `${this.id}:noDateColumn`,
        severity: 'warning',
        title: `${name} has no date column`,
        detail: 'Pick the date column the previous-period comparison or sparkline windows on.',
        widgetId: this.id,
        view,
      });
    }

    // A column reference that was validly picked, but whose dataset has since had that column
    // removed — the same "still exists?" check TableColumnModel/PivotTableWidgetModel do.
    const schema = this.schema();
    if (schema) {
      const columnIds = new Set(schema.columns.map((c) => c.id));

      if (this.valueColumnId() && !columnIds.has(this.valueColumnId()!)) {
        issues.push({
          id: `${this.id}:missingValueColumn`,
          severity: 'error',
          title: `${name}'s value column no longer exists`,
          detail: 'The column it summarises was removed from the dataset. Pick a new one.',
          widgetId: this.id,
          view,
        });
      }

      if (this.dateColumnId() && !columnIds.has(this.dateColumnId()!)) {
        issues.push({
          id: `${this.id}:missingDateColumn`,
          severity: 'error',
          title: `${name}'s date column no longer exists`,
          detail:
            'The column the previous-period comparison windows on was removed. Pick a new one.',
          widgetId: this.id,
          view,
        });
      }

      if (this.groupByColumnId() && !columnIds.has(this.groupByColumnId()!)) {
        issues.push({
          id: `${this.id}:missingGroupColumn`,
          severity: 'error',
          title: `${name}'s group-by column no longer exists`,
          detail: 'The column it grouped tiles by was removed from the dataset. Pick a new one.',
          widgetId: this.id,
          view,
        });
      }
    }

    // The tolerance's own min/max/concession columns point at a *different* ("limits") dataset,
    // checked against that dataset's schema rather than this widget's own — same as a table
    // column's tolerance validation.
    const tolerance = this.tolerance();
    const toleranceSchema = this.toleranceSchema();
    if (tolerance && toleranceSchema) {
      const columnIds = new Set(toleranceSchema.columns.map((c) => c.id));
      const pointers = [
        tolerance.minColumnId,
        tolerance.maxColumnId,
        tolerance.concessionLowerColumnId,
        tolerance.concessionUpperColumnId,
        tolerance.match?.sourceColumnId,
      ].filter((id): id is string => !!id);
      const matchColumnGone =
        !!tolerance.match &&
        !!schema &&
        !schema.columns.some((c) => c.id === tolerance.match!.columnId);

      if (pointers.some((id) => !columnIds.has(id)) || matchColumnGone) {
        issues.push({
          id: `${this.id}:toleranceMissing`,
          severity: 'error',
          title: `${name}'s tolerance points at a removed column`,
          detail: `A column this tolerance uses (in "${toleranceSchema.name}" or in this widget's own dataset) has been removed. Re-point it or remove the banding.`,
          widgetId: this.id,
          view,
        });
      }
    }

    return issues;
  }
}
