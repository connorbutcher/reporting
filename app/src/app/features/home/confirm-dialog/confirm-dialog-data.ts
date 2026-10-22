export type ConfirmDialogData = {
  title: string;
  message: string;
  /** Specifics listed under the message, one per line — e.g. what a delete would break. */
  details?: string[];
  confirmLabel?: string;
  /** Styles the confirm button as a destructive action. */
  danger?: boolean;
};
