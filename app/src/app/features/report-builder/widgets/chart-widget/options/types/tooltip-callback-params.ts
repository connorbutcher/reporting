import type { TooltipComponentOption } from 'echarts/components';

/** The echarts callback param passed to a `trigger: 'item'` tooltip formatter. */
export type TooltipCallbackParams = Parameters<
  NonNullable<Extract<TooltipComponentOption['formatter'], (...args: never[]) => unknown>>
>[0];
