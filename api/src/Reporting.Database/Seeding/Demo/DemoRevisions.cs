using Reporting.Abstractions;

namespace Reporting.Database;

internal static class DemoRevisions
{
    public static Report Published(
        int number, string name, Folder? folder, Func<SeedBatch, Dataset> datasetFactory,
        string[] columns, int versions, int daysAgo, SeedBatch batch)
    {
        var report = new Report
        {
            RefId = Guid.NewGuid(),
            Number = number,
            Name = name,
            Folder = folder,
            CreatedAt = DateTime.UtcNow.AddDays(-daysAgo - (versions - 1) * 3),
            UpdatedAt = DateTime.UtcNow.AddDays(-daysAgo),
        };

        for (var v = 1; v <= versions; v++)
        {
            var publishedAt = DateTime.UtcNow.AddDays(-daysAgo - (versions - v) * 3);
            var revision = new ReportRevision
            {
                RefId = Guid.NewGuid(),
                Kind = RevisionKind.Published,
                VersionNumber = v,
                CreatedAt = publishedAt,
                PublishedAt = publishedAt,
                Notes = v == versions ? $"<p>Updated {name} with the latest data.</p>" : null,
            };
            AddDataset(revision, batch, name, datasetFactory, columns);
            report.Revisions.Add(revision);
        }

        return report;
    }

    public static Report Draft(
        int number, string name, Folder? folder, Func<SeedBatch, Dataset> datasetFactory,
        string[] columns, int daysAgo, SeedBatch batch)
    {
        var createdAt = DateTime.UtcNow.AddDays(-daysAgo);
        var report = Empty(number, name, folder, daysAgo);

        var draft = new ReportRevision { RefId = Guid.NewGuid(), Kind = RevisionKind.Draft, CreatedAt = createdAt };
        AddDataset(draft, batch, name, datasetFactory, columns);
        report.Revisions.Add(draft);

        return report;
    }

    public static Report PublishedWithDraft(
        int number, string name, Folder? folder, Func<SeedBatch, Dataset> datasetFactory,
        string[] columns, int versions, int daysAgo, SeedBatch batch)
    {
        var report = Published(number, name, folder, datasetFactory, columns, versions, daysAgo, batch);

        var draftCreatedAt = DateTime.UtcNow.AddDays(-1);
        var draft = new ReportRevision { RefId = Guid.NewGuid(), Kind = RevisionKind.Draft, CreatedAt = draftCreatedAt };
        AddDataset(draft, batch, name, datasetFactory, columns);
        report.Revisions.Add(draft);
        report.UpdatedAt = draftCreatedAt;

        return report;
    }

    /// <summary>Never checked out or published.</summary>
    public static Report Empty(int number, string name, Folder? folder, int daysAgo)
    {
        var createdAt = DateTime.UtcNow.AddDays(-daysAgo);
        return new Report
        {
            RefId = Guid.NewGuid(),
            Number = number,
            Name = name,
            Folder = folder,
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
        };
    }

    /// <summary>Adds a fresh dataset and a single tab holding a title and a table of it.</summary>
    public static void AddDataset(
        ReportRevision revision, SeedBatch batch, string title, Func<SeedBatch, Dataset> datasetFactory, string[] columnNames)
    {
        var dataset = datasetFactory(batch);
        revision.Datasets.Add(dataset);

        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Tab 1", Order = 0 };
        revision.Tabs.Add(tab);

        tab.Widgets.Add(SeedWidgets.Title(title));
        var table = SeedWidgets.Placeholder(tab, WidgetType.DataTable, 0, 1, 8, 5);
        batch.AddTable(table, dataset, title, columnNames);
    }
}
