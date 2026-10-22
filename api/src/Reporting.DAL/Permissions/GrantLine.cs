using Reporting.Abstractions;

namespace Reporting.DAL.Permissions;

/// <summary>One grant reduced to what resolution needs: who it targets and the level it gives.</summary>
public sealed record GrantLine(GrantSubjectType SubjectType, int? SubjectId, AccessLevel Level);
