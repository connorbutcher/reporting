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

/** Translucent so plotted marks stay readable through the shading. */
const IN_SPEC_FILL = 'rgba(22, 163, 74, 0.10)';
const CONCESSION_FILL = 'rgba(217, 119, 6, 0.13)';

/**
 * Shaded regions for every band whose `fill` is on: the in-spec zone between
 * min and max, plus an amber shoulder out to each concession bound where set.
 * Same axis choice as {@link markLineData}, so a bar's fill flips with orientation.
 */
export function markAreaData(
  bands: readonly ResolvedToleranceBand[],
  axisKeyFor: (band: ResolvedToleranceBand) => 'xAxis' | 'yAxis',
): object[] {
  const areas: object[] = [];

  for (const band of bands) {
    if (!band.fill || band.min === null || band.max === null) continue;

    const axisKey = axisKeyFor(band);
    // A region is a [from, to] pair; the fill colour rides on the first edge.
    const region = (from: number, to: number, color: string) => [
      { [axisKey]: from, itemStyle: { color } },
      { [axisKey]: to },
    ];

    areas.push(region(band.min, band.max, IN_SPEC_FILL));
    if (band.concessionLower !== null)
      areas.push(region(band.concessionLower, band.min, CONCESSION_FILL));
    if (band.concessionUpper !== null)
      areas.push(region(band.max, band.concessionUpper, CONCESSION_FILL));
  }

  return areas;
}

/** Outline colour matching the limit line a mark has crossed. */
const OUTLINE_CONCESSION = '#d97706'; // orange: past min/max, still inside the concession band
const OUTLINE_FAIL = '#dc2626'; // red: past the concession bound (or past min/max when there is none)

/** The bands whose out-of-tolerance marks should be outlined — `outlinePoints` on, bounds resolved. */
function outlineBands(bands: readonly ResolvedToleranceBand[]): ResolvedToleranceBand[] {
  return bands.filter((b) => b.outlinePoints && b.min !== null && b.max !== null);
}

/**
 * The outline colour for a value against one band, or null when it's in spec. Red once past
 * the concession bound — or past min/max where that side has no concession, since then the
 * min/max line itself is the red one — and orange in the concession shoulder between them.
 */
function bandOutlineColor(value: number, band: ResolvedToleranceBand): string | null {
  const lowFail = band.concessionLower ?? band.min!;
  const highFail = band.concessionUpper ?? band.max!;
  if (value < lowFail || value > highFail) return OUTLINE_FAIL;
  if (value < band.min! || value > band.max!) return OUTLINE_CONCESSION;
  return null;
}

/** Picks the more severe of two outline colours (red beats orange beats none). */
function worse(a: string | null, b: string | null): string | null {
  if (a === OUTLINE_FAIL || b === OUTLINE_FAIL) return OUTLINE_FAIL;
  return a ?? b;
}

/**
 * The outline colour for a plotted point across every band that has `outlinePoints` on, or
 * null when in spec. Each band is tested on its own axis; a value on a category (non-numeric)
 * axis is never outlined. The most severe band wins.
 */
export function pointOutlineColor(
  bands: readonly ResolvedToleranceBand[],
): (x: number | string, y: number | string) => string | null {
  const active = outlineBands(bands);
  if (active.length === 0) return () => null;

  return (x, y) => {
    let color: string | null = null;
    for (const band of active) {
      const value = band.axis === 'x' ? x : y;
      if (typeof value === 'number') color = worse(color, bandOutlineColor(value, band));
    }
    return color;
  };
}

/**
 * The outline colour for a single measure value (a bar's aggregated height). A bar's bands
 * always sit on the value axis, so unlike the point test this ignores each band's axis.
 */
export function valueOutlineColor(
  bands: readonly ResolvedToleranceBand[],
): (value: number) => string | null {
  const active = outlineBands(bands);
  if (active.length === 0) return () => null;

  return (value) => {
    let color: string | null = null;
    for (const band of active) color = worse(color, bandOutlineColor(value, band));
    return color;
  };
}

/** An outlined mark: the series colour as fill, bordered in the crossed limit's colour. */
export function outlierItemStyle(seriesColor: string, borderColor: string): object {
  return { color: seriesColor, borderColor, borderWidth: 2 };
}
