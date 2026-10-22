namespace Reporting.DAL.Repositories;

/// <summary>The request conflicts with data that already exists — maps to 400.</summary>
public sealed class DataValidationException(string message) : Exception(message);
