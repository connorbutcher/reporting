namespace Reporting.Abstractions;

/// <summary>Whether a candidate group name is free to use, for live validation as the admin types.</summary>
public class GroupNameAvailableDto
{
    public bool Available { get; set; }
}
