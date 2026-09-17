import { Signal, computed, signal } from '@angular/core';
import { DatasetColumn, DatasetSchema, NumericColumnConfig } from '../../../core/models/dataset';
import {
  Aggregate,
  DEFAULT_KPI_CONFIG,
  KpiComparisonDirection,
  KpiMeasure,
  KpiWidget,
  KpiWidgetConfig,
} from '../../../core/models/report';
import { EditorNode } from './editor-node';
import { FilterContext, FilterGroupModel } from './filter.model';
import { ModelSources, WidgetModel } from './widget-model-base';
import { ValidationIssue } from './validation-issue';

/** Numeric column types an aggregate other than Count can reduce. */
function isNumeric(type: DatasetColumn['type']): boolean {
  return type === 'int' || type === 'double';
}

/** Every alias a formula's `[Name]` references, de-duplicated — a light client-side mirror of the
 * server's `FormulaParser.ReferencedColumnNames`, good enough for inline validation; the server has
 * the last word (a bad formula still comes back as a query error). */
function referencedAliases(formula: string): Set<string> {
  const names = new Set<string>();
  for (const match of formula.matchAll(/\[([^\]]+)]/g)) names.add(match[1].trim());
  return names;
}

/**
 * One named aggregate a KPI's formula can reference. Owns its own filter, so it validates and
 * tracks dirty state like any other node in the tree.
 */
export class KpiMeasureModel extends EditorNode {
  public readonly measureId: string;
  public readonly alias = signal('');
  public readonly columnId = signal<string | null>(null);
  public readonly aggregate = signal<Aggregate>('count');
  public readonly filter: FilterGroupModel;

  constructor(
    dto: KpiMeasure,
    context: FilterContext,
  ) {
    super();
    this.measureId = dto.id;
    this.alias.set(dto.alias);
    this.columnId.set(dto.columnId);
    this.aggregate.set(dto.aggregate);
    this.filter = new FilterGroupModel(dto.filter, context);
  }

  public toDto(): KpiMeasure {
    return {
      id: this.measureId,
      alias: this.alias(),
      columnId: this.columnId(),
      aggregate: this.aggregate(),
      filter: this.filter.toDto(),
    };
  }

  public override snapshotValue(): unknown {
    return this.toDto();
  }

  public override childNodes(): readonly EditorNode[] {
    return [this.filter];
  }

  public override ownIssues(): ValidationIssue[] {
    return [];
  }
}

/**
 * A single headline number: one or more named `measures` (each an aggregate over the bound
 * dataset, further narrowed by its own filter) combined by `formula`, optionally computed a
 * second time against `comparisonFilter` for a trend, and colored against a threshold.
 */
export class KpiWidgetModel extends WidgetModel {
  public override readonly type = 'kpi' as const;

  /** Null until the user binds the widget to a dataset. */
  public readonly datasetId = signal<number | null>(null);
  public readonly measures = signal<readonly KpiMeasureModel[]>([]);
  /** An expression over the measures' aliases, e.g. `[OverLimit] / [Total] * 100`. */
  public readonly formula = signal('');

  public readonly comparisonEnabled = signal(false);
  public readonly comparisonDirection = signal<KpiComparisonDirection>('neutral');

  public readonly thresholdEnabled = signal(false);
  public readonly lowerBound = signal<number | null>(null);
  public readonly upperBound = signal<number | null>(null);
  public readonly invertColors = signal(false);

  public readonly numberFormat = signal<NumericColumnConfig | null>(null);

  /** Rows this widget aggregates, narrowed server-side. */
  public readonly filter: FilterGroupModel;
  /** The filter used in place of {@link filter} for the comparison value, when enabled. */
  public readonly comparisonFilter: FilterGroupModel;

  /** The bound dataset's schema, once loaded. */
  public readonly schema: Signal<DatasetSchema | null>;
  /** Every column on the bound dataset. */
  public readonly columns: Signal<DatasetColumn[]>;
  /** Numeric columns, for a measure's column picker (Count aside). */
  public readonly numericColumns: Signal<DatasetColumn[]>;

  private readonly sources: ModelSources;

  constructor(widget: KpiWidget, sources: ModelSources) {
    super(widget);
    const config = widget.config;
    this.sources = sources;

    this.datasetId.set(config.datasetId);
    this.formula.set(config.formula);
    this.comparisonDirection.set(config.comparisonDirection);
    this.comparisonEnabled.set(!!config.comparisonFilter);
    this.thresholdEnabled.set(!!config.threshold);
    this.lowerBound.set(config.threshold?.lowerBound ?? null);
    this.upperBound.set(config.threshold?.upperBound ?? null);
    this.invertColors.set(config.threshold?.invertColors ?? false);
    this.numberFormat.set(config.numberFormat);

    this.schema = computed(() => {
      const id = this.datasetId();
      return id ? (sources.schemas()[id] ?? null) : null;
    });
    this.columns = computed(() => this.schema()?.columns ?? []);
    this.numericColumns = computed(() => this.columns().filter((c) => isNumeric(c.type)));

    this.filter = new FilterGroupModel(config.filter ?? null, this.filterContext());
    this.comparisonFilter = new FilterGroupModel(config.comparisonFilter ?? null, this.filterContext());
    this.measures.set(
      config.measures.map((m) => new KpiMeasureModel(m, this.filterContext(m.id))),
    );
  }

  /** Swapping dataset invalidates every measure and the filters. */
  public setDataset(datasetId: number | null): void {
    if (datasetId === this.datasetId()) return;
    this.datasetId.set(datasetId);
    this.measures.set([]);
    this.filter.clear();
    this.comparisonFilter.clear();
  }

  /** Adds a measure, defaulting to Count so it's valid before a column is picked. */
  public addMeasure(): void {
    const alias = this.nextAlias();
    const measure = new KpiMeasureModel(
      { id: crypto.randomUUID(), alias, columnId: null, aggregate: 'count', filter: null },
      this.filterContext(alias),
    );
    this.measures.update((measures) => [...measures, measure]);
  }

  public removeMeasure(id: string): void {
    this.measures.update((measures) => measures.filter((m) => m.measureId !== id));
  }

  /** Switching an aggregate to Count drops its column; away from Count leaves the picker to fill. */
  public setMeasureAggregate(measure: KpiMeasureModel, aggregate: Aggregate): void {
    measure.aggregate.set(aggregate);
    if (aggregate === 'count') measure.columnId.set(null);
  }

  public override toDto(): KpiWidget {
    const config: KpiWidgetConfig = {
      type: 'kpi',
      ...DEFAULT_KPI_CONFIG,
      ...this.baseConfigDto(),
      datasetId: this.datasetId(),
      filter: this.filter.toDto(),
      measures: this.measures().map((m) => m.toDto()),
      formula: this.formula(),
      comparisonFilter: this.comparisonEnabled() ? this.comparisonFilter.toDto() : null,
      comparisonDirection: this.comparisonDirection(),
      threshold: this.thresholdEnabled()
        ? { lowerBound: this.lowerBound(), upperBound: this.upperBound(), invertColors: this.invertColors() }
        : null,
      numberFormat: this.numberFormat(),
    };
    return { ...this.geometryDto(), type: 'kpi', config };
  }

  public override defaultTitle(): string {
    return 'KPI';
  }

  public override childNodes(): readonly EditorNode[] {
    return [this.filter, this.comparisonFilter, ...this.measures()];
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
        detail: 'Pick a dataset so the KPI has something to aggregate.',
        widgetId: this.id,
        view,
      });
      return issues;
    }

    if (this.measures().length === 0) {
      issues.push({
        id: `${this.id}:noMeasures`,
        severity: 'warning',
        title: `${name} has no measures`,
        detail: 'Add at least one measure (a value column and how to summarise it).',
        widgetId: this.id,
        view,
      });
    }

    if (this.measures().some((m) => m.aggregate() !== 'count' && !m.columnId())) {
      issues.push({
        id: `${this.id}:measureNoColumn`,
        severity: 'warning',
        title: `${name} has a measure with no column`,
        detail: 'Pick a value column for each sum, average, min, or max measure.',
        widgetId: this.id,
        view,
      });
    }

    const aliases = this.measures().map((m) => m.alias().trim());
    if (aliases.some((a) => !a)) {
      issues.push({
        id: `${this.id}:blankAlias`,
        severity: 'error',
        title: `${name} has a measure with no name`,
        detail: 'Every measure needs a name so the formula can refer to it.',
        widgetId: this.id,
        view,
      });
    } else if (new Set(aliases).size !== aliases.length) {
      issues.push({
        id: `${this.id}:duplicateAlias`,
        severity: 'error',
        title: `${name} has two measures with the same name`,
        detail: 'Measure names must be unique so the formula knows which one it means.',
        widgetId: this.id,
        view,
      });
    }

    const known = new Set(aliases);
    const unknown = [...referencedAliases(this.formula())].filter((a) => !known.has(a));
    if (unknown.length > 0) {
      issues.push({
        id: `${this.id}:unknownAlias`,
        severity: 'error',
        title: `${name}'s formula refers to "${unknown[0]}", which isn't a measure`,
        detail: 'Fix the formula, or add a measure with that name.',
        widgetId: this.id,
        view,
      });
    }

    return issues;
  }

  private filterContext(measureId?: string): FilterContext {
    return {
      schema: this.schema,
      catalogue: this.sources.catalogue,
      // A KPI measure can filter on any of its dataset's columns, not only the measured one.
      columns: this.columns,
      view: { kind: 'widgetFilters', widgetId: this.id, bindingId: measureId },
      ownerId: this.id,
      widgetId: this.id,
    };
  }

  /** The first "MeasureN" not already in use, so a new measure is valid without renaming. */
  private nextAlias(): string {
    const used = new Set(this.measures().map((m) => m.alias()));
    let n = this.measures().length + 1;
    while (used.has(`Measure${n}`)) n++;
    return `Measure${n}`;
  }
}
