import { ChartValueAxis } from '../../../../../../core/models/report';

/** Value axes stacked on the left and right of a chart with several Y axes. */
export class SideAxes {
  /** How far each extra axis on one side is pushed out. */
  public static readonly OFFSET = 60;

  /** Each axis's position among the axes on its side, counting from the plot. */
  public static orderOnSide(axes: readonly ChartValueAxis[]): number[] {
    const counts: Record<'left' | 'right', number> = { left: 0, right: 0 };
    return axes.map((axis) => counts[axis.side]++);
  }

  /** Extra axes on a side widen that side's grid margin. */
  public static margins(axes: readonly ChartValueAxis[]): { left: number; right: number } {
    const leftCount = axes.filter((a) => a.side === 'left').length;
    const rightCount = axes.filter((a) => a.side === 'right').length;
    return {
      left: 56 + Math.max(0, leftCount - 1) * SideAxes.OFFSET,
      right: 20 + rightCount * SideAxes.OFFSET,
    };
  }

  /**
   * Places an axis on its side. Secondary and coloured axes draw their line in the colour of the
   * single series they carry, so readers can match them.
   */
  public static placement(
    axis: ChartValueAxis,
    isPrimary: boolean,
    color: string | null,
    orderOnSide: number,
  ) {
    return {
      ...(color ? { nameTextStyle: { color } } : {}),
      position: axis.side,
      ...(orderOnSide > 0 ? { offset: orderOnSide * SideAxes.OFFSET } : {}),
      ...(!isPrimary || color
        ? { axisLine: { show: true, ...(color ? { lineStyle: { color } } : {}) } }
        : {}),
    };
  }
}
