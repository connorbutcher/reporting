/** One run of a comment's body: plain text, or an `@name` mention rendered as a chip. */
export type CommentPart = {
  text: string;
  isMention: boolean;
};
