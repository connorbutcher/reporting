namespace Reporting.DAL.Repositories;

/// <summary>The request conflicts with data that already exists — maps to 400.</summary>
public sealed class DataValidationException(string message) : Exception(message);

/// <summary>The operation can't proceed because of the current state of related data — maps to 409.</summary>
public sealed class DataConflictException(string message) : Exception(message);

/// <summary>
/// Something nested under an id that does exist wasn't found — maps to 404 with a
/// specific message, distinct from the plain "no such id" case a repository
/// signals by returning null.
/// </summary>
public sealed class DataNotFoundException(string message) : Exception(message);
