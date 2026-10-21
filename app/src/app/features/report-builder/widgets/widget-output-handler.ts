/**
 * A handler for one of a widget's outputs. Its parameter is `never` so a host can
 * register handlers typed with each output's own concrete value — a function of a
 * specific type is assignable to `(value: never) => void` — while the outlet, which
 * only sees the output generically, passes the emitted value straight through.
 */
export type WidgetOutputHandler = (value: never) => void;
