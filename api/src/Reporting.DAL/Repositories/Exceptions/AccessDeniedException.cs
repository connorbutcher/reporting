namespace Reporting.DAL.Repositories;

/// <summary>
/// The current user is allowed to see the target but lacks the level the operation needs —
/// maps to 403. A target the user can't even see is hidden instead (a repository returns
/// null/false, surfacing as 404), so this never reveals the existence of something private.
/// </summary>
public sealed class AccessDeniedException(string message) : Exception(message);
