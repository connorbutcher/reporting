namespace Reporting.Abstractions;

public class PublishDraftDto
{
    /// <summary>Rich-text (HTML) description of what changed, from the publish dialog's editor.</summary>
    public string? Notes { get; set; }
}
