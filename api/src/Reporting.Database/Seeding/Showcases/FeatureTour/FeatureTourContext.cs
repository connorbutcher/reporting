namespace Reporting.Database;

internal sealed record FeatureTourContext(Report Report, Dataset Log, SpecDataset Spec, Dataset HighRework)
{
    public Guid Ref(string columnName)
    {
        return SeedDatasets.ColumnRef(Log, columnName);
    }

    public PendingComment Comment(Widget widget, string authorEmail, string body, int hoursAgo, params string[] mentionEmails)
    {
        return new PendingComment(Report, widget.RefId, authorEmail, body, mentionEmails, hoursAgo);
    }
}
