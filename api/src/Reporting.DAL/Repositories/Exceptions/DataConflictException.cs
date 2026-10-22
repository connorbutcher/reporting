namespace Reporting.DAL.Repositories;

/// <summary>The operation can't proceed because of the current state of related data — maps to 409.</summary>
public sealed class DataConflictException(string message) : Exception(message);
