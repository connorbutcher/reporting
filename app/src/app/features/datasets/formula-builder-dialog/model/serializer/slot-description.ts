/** What the serializer needs to know about a function's argument: what to call it in a placeholder, and whether it may be left out. */
export type SlotDescription = {
  name: string;
  optional: boolean;
};
