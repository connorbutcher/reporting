namespace Reporting.Abstractions;

/// <summary>Whether a candidate folder name is free among its siblings, for live validation as the user types.</summary>
public class FolderNameAvailableDto
{
    public bool Available { get; set; }
}
