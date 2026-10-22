/** Ordered access ladder; a higher level includes everything below it. */
export type AccessLevel = 'none' | 'viewer' | 'editor' | 'manager';

export type GrantSubjectType = 'user' | 'group' | 'everyone';

/** The kind of securable a permission edit targets. */
export type SecurableKind = 'folder' | 'report';

export type UserSummary = {
  id: string;
  displayName: string;
  email: string;
  isGlobalAdmin: boolean;
};

export type UserGroupSummary = {
  id: string;
  name: string;
  memberCount: number;
};
