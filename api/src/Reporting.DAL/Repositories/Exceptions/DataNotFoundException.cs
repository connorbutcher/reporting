namespace Reporting.DAL.Repositories;

/// <summary>
/// Something nested under an id that does exist wasn't found — maps to 404 with a
/// specific message, distinct from the plain "no such id" case a repository
/// signals by returning null.
/// </summary>
public sealed class DataNotFoundException(string message) : Exception(message);
