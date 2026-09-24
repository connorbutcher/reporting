let nextId = 1;

/** A fresh item id, unique for the life of the page. */
export function newItemId(): number {
  return nextId++;
}
