namespace Reporting.DAL.Filtering;

/// <summary>Why a filter couldn't be translated: a 400, not a silent mismatch.</summary>
public sealed class FilterException(string message) : Exception(message);
