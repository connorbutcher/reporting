namespace Reporting.Abstractions;

/// <summary>Whether a candidate report name is free among its siblings, for live validation as the user types.</summary>
public class ReportNameAvailableDto
{
    public bool Available { get; set; }
}
