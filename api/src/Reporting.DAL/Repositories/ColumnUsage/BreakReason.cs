namespace Reporting.DAL.Repositories;

/// <summary>Why a reference stops working. The key ignores the column type, so an existing break can be told from a new one.</summary>
internal readonly record struct BreakReason(string Key, string Message);
