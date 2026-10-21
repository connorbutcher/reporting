/** Typed `never` so hosts can register handlers with each output's concrete value type. */
export type WidgetOutputHandler = (value: never) => void;
