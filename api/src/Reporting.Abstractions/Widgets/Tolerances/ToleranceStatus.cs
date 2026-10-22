namespace Reporting.Abstractions;

/// <summary>Where a value falls relative to a resolved tolerance band, already classified server-side.</summary>
public enum ToleranceStatus
{
    None,
    Pass,
    Concession,
    Fail
}
