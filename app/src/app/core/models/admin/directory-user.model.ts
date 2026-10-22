import { UserRef } from './user-ref.model';

/** A person in the ungated directory, with whether they are a global admin (whose access is inferred, not granted). */
export type DirectoryUser = UserRef & {
  isGlobalAdmin: boolean;
};
