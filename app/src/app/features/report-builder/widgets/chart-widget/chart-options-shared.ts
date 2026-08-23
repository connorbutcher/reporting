import { DatasetColumn } from '../../../../core/models/dataset';
import { ResolvedToleranceBand } from '../../../../core/models/widget-query';

/** Cycles if there are more series than colours. */
export const SERIES_COLORS = [
  '#2f6fed',
  '#f97316',
  '#16a34a',
  '#db2777',
  '#7c3aed',
  '#0891b2',
  '#ca8a04',
  '#dc2626',
];

export function columnById(columns: DatasetColumn[], id: string | null): DatasetColumn | null {
  return id ? (columns.find((c) => c.id === id) ?? null) : null;
}

/**
 * Dashed line entries for every resolved band's bounds, coloured by what crossing
 * them means. The axis each line binds to is chosen by the caller, since a bar's
 * value axis flips with orientation while a scatter band keeps its own axis.
 */
export function markLineData(
  bands: readonly ResolvedToleranceBand[],
  axisKeyFor: (band: ResolvedToleranceBand) => 'xAxis' | 'yAxis',
): object[] {
  const entries: object[] = [];

  for (const band of bands) {
    if (band.min === null || band.max === null) continue;

    const axisKey = axisKeyFor(band);
    const hasConcession = band.concessionLower !== null || band.concessionUpper !== null;
    const minMaxColor = hasConcession ? '#d97706' : '#dc2626';

    const line = (value: number, label: string, color: string) => ({
      [axisKey]: value,
      label: { formatter: label, position: 'insideEndTop', color, fontSize: 10 },
      lineStyle: { color, type: 'dashed', width: 1.5 },
    });

    entries.push(line(band.min, 'Min', minMaxColor), line(band.max, 'Max', minMaxColor));
    if (band.concessionLower !== null)
      entries.push(line(band.concessionLower, 'Concession lower', '#dc2626'));
    if (band.concessionUpper !== null)
      entries.push(line(band.concessionUpper, 'Concession upper', '#dc2626'));
  }

  return entries;
}
