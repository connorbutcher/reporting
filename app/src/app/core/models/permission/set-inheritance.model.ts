export type SetInheritance = {
  inherits: boolean;
  /** When breaking inheritance, copy the currently-effective grants down first so no one loses access. */
  copyDown: boolean;
};
