/** Maps a bubble point's raw size value to its marker's pixel diameter; a missing value falls back to a default. */
export type SizeScale = (size: number | null | undefined) => number;
