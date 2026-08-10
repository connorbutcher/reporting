using System.Globalization;
using Reporting.Abstractions;

namespace Reporting.Database;

public static class DbSeeder
{
    public static void Seed(ReportingDbContext db)
    {
        if (db.Datasets.Any()) return;

        var builds = SeedEngineBuilds(db);
        var testRuns = SeedTestRuns(db);

        db.Reports.Add(BuildDemoReport(builds));
        SeedFoldersAndReports(db, builds, testRuns);
        db.SaveChanges();
    }

    private static Dataset SeedEngineBuilds(ReportingDbContext db)
    {
        var dataset = new Dataset { Id = Guid.NewGuid(), Name = "Engine Builds" };

        var job = Column(dataset, "Job Number", DatasetColumnType.String, 0);
        var serial = Column(dataset, "Serial Number", DatasetColumnType.String, 1);
        var part = Column(dataset, "Part Number", DatasetColumnType.String, 2);
        var engineType = Column(dataset, "Engine Type", DatasetColumnType.String, 3);
        var buildDate = Column(dataset, "Build Date", DatasetColumnType.DateTime, 4, "{\"dateFormat\":\"d MMM yyyy\"}");
        var inspector = Column(dataset, "Inspector", DatasetColumnType.String, 5);
        var bore = Column(dataset, "Bore Diameter", DatasetColumnType.Double, 6, Mm(3));
        var mainBearing = Column(dataset, "Main Bearing Clearance", DatasetColumnType.Double, 7, Mm(4));
        var bigEnd = Column(dataset, "Big End Clearance", DatasetColumnType.Double, 8, Mm(4));
        var pistonBore = Column(dataset, "Piston to Bore Clearance", DatasetColumnType.Double, 9, Mm(4));
        var endFloat = Column(dataset, "Crankshaft End Float", DatasetColumnType.Double, 10, Mm(3));
        var deckHeight = Column(dataset, "Deck Height", DatasetColumnType.Double, 11, Mm(3));
        var compression = Column(dataset, "Compression Ratio", DatasetColumnType.Double, 12, "{\"decimals\":2,\"suffix\":\":1\"}");
        var rework = Column(dataset, "Rework Count", DatasetColumnType.Int, 13);
        var concessions = Column(dataset, "Build Concessions Signed Off", DatasetColumnType.Bool, 14,
            "{\"trueLabel\":\"Signed off\",\"falseLabel\":\"Outstanding\"}");

        var rows = new[]
        {
            ("JOB-2026-0141", "ENG-SN-88201", "PN-4471-C", "V8 5.0L", new DateTime(2026, 1, 14), "A. Whitfield",
                101.600, 0.0432, 0.0381, 0.0620, 0.152, 231.775, 10.50, 0, true),
            ("JOB-2026-0142", "ENG-SN-88202", "PN-4471-C", "V8 5.0L", new DateTime(2026, 1, 21), "A. Whitfield",
                101.604, 0.0458, 0.0399, 0.0655, 0.164, 231.782, 10.48, 1, true),
            ("JOB-2026-0148", "ENG-SN-88213", "PN-4471-D", "V8 5.0L", new DateTime(2026, 2, 3), "R. Okafor",
                101.612, 0.0511, 0.0442, 0.0701, 0.181, 231.790, 10.42, 2, false),
            ("JOB-2026-0155", "ENG-SN-88224", "PN-5120-A", "I6 3.0L", new DateTime(2026, 2, 18), "R. Okafor",
                84.010, 0.0389, 0.0350, 0.0548, 0.139, 208.450, 11.20, 0, true),
            ("JOB-2026-0161", "ENG-SN-88231", "PN-5120-A", "I6 3.0L", new DateTime(2026, 3, 4), "M. Lindqvist",
                84.014, 0.0402, 0.0361, 0.0572, 0.147, 208.461, 11.18, 0, true),
            ("JOB-2026-0168", "ENG-SN-88240", "PN-5120-B", "I6 3.0L", new DateTime(2026, 3, 19), "M. Lindqvist",
                84.021, 0.0470, 0.0418, 0.0688, 0.176, 208.474, 11.05, 3, false),
            ("JOB-2026-0173", "ENG-SN-88252", "PN-6644-A", "V12 6.5L", new DateTime(2026, 4, 2), "S. Bhandari",
                94.505, 0.0421, 0.0374, 0.0601, 0.158, 254.120, 12.60, 1, true),
            ("JOB-2026-0180", "ENG-SN-88263", "PN-6644-A", "V12 6.5L", new DateTime(2026, 4, 22), "S. Bhandari",
                94.512, 0.0495, 0.0430, 0.0672, 0.169, 254.133, 12.55, 2, false),
        };

        foreach (var r in rows)
        {
            AddRow(dataset, new Dictionary<Guid, string>
            {
                [job.Id] = r.Item1,
                [serial.Id] = r.Item2,
                [part.Id] = r.Item3,
                [engineType.Id] = r.Item4,
                [buildDate.Id] = Iso(r.Item5),
                [inspector.Id] = r.Item6,
                [bore.Id] = Num(r.Item7),
                [mainBearing.Id] = Num(r.Item8),
                [bigEnd.Id] = Num(r.Item9),
                [pistonBore.Id] = Num(r.Item10),
                [endFloat.Id] = Num(r.Item11),
                [deckHeight.Id] = Num(r.Item12),
                [compression.Id] = Num(r.Item13),
                [rework.Id] = r.Item14.ToString(CultureInfo.InvariantCulture),
                [concessions.Id] = r.Item15.ToString(CultureInfo.InvariantCulture),
            });
        }

        db.Datasets.Add(dataset);
        return dataset;
    }

    private static Dataset SeedTestRuns(ReportingDbContext db)
    {
        var dataset = new Dataset { Id = Guid.NewGuid(), Name = "Engine Test Runs" };

        var job = Column(dataset, "Job Number", DatasetColumnType.String, 0);
        var serial = Column(dataset, "Serial Number", DatasetColumnType.String, 1);
        var part = Column(dataset, "Part Number", DatasetColumnType.String, 2);
        var runDate = Column(dataset, "Run Date", DatasetColumnType.DateTime, 3, "{\"dateFormat\":\"d MMM yyyy\"}");
        var cell = Column(dataset, "Test Cell", DatasetColumnType.String, 4);
        var power = Column(dataset, "Peak Power", DatasetColumnType.Double, 5, "{\"decimals\":1,\"suffix\":\" kW\"}");
        var torque = Column(dataset, "Peak Torque", DatasetColumnType.Double, 6, "{\"decimals\":1,\"suffix\":\" Nm\"}");
        var oil = Column(dataset, "Max Oil Pressure", DatasetColumnType.Double, 7, "{\"decimals\":2,\"suffix\":\" bar\"}");
        var coolant = Column(dataset, "Peak Coolant Temp", DatasetColumnType.Double, 8, "{\"decimals\":1,\"suffix\":\" \\u00B0C\"}");
        var duration = Column(dataset, "Run Duration", DatasetColumnType.Double, 9, "{\"decimals\":2,\"suffix\":\" h\"}");
        var passed = Column(dataset, "Passed", DatasetColumnType.Bool, 10, "{\"trueLabel\":\"Pass\",\"falseLabel\":\"Fail\"}");

        var rows = new[]
        {
            ("JOB-2026-0141", "ENG-SN-88201", "PN-4471-C", new DateTime(2026, 1, 16), "Cell 2", 331.4, 612.8, 4.85, 96.4, 2.50, true),
            ("JOB-2026-0142", "ENG-SN-88202", "PN-4471-C", new DateTime(2026, 1, 23), "Cell 2", 329.8, 608.1, 4.78, 98.1, 2.50, true),
            ("JOB-2026-0148", "ENG-SN-88213", "PN-4471-D", new DateTime(2026, 2, 6), "Cell 1", 318.2, 588.4, 4.41, 104.7, 1.75, false),
            ("JOB-2026-0155", "ENG-SN-88224", "PN-5120-A", new DateTime(2026, 2, 20), "Cell 3", 224.6, 441.2, 5.12, 92.8, 3.00, true),
            ("JOB-2026-0161", "ENG-SN-88231", "PN-5120-A", new DateTime(2026, 3, 6), "Cell 3", 226.1, 444.9, 5.08, 91.5, 3.00, true),
            ("JOB-2026-0168", "ENG-SN-88240", "PN-5120-B", new DateTime(2026, 3, 21), "Cell 1", 210.9, 418.6, 4.32, 108.3, 1.25, false),
            ("JOB-2026-0173", "ENG-SN-88252", "PN-6644-A", new DateTime(2026, 4, 5), "Cell 4", 486.7, 812.5, 5.44, 94.2, 4.00, true),
            ("JOB-2026-0180", "ENG-SN-88263", "PN-6644-A", new DateTime(2026, 4, 24), "Cell 4", 479.3, 803.7, 5.31, 97.6, 4.00, true),
        };

        foreach (var r in rows)
        {
            AddRow(dataset, new Dictionary<Guid, string>
            {
                [job.Id] = r.Item1,
                [serial.Id] = r.Item2,
                [part.Id] = r.Item3,
                [runDate.Id] = Iso(r.Item4),
                [cell.Id] = r.Item5,
                [power.Id] = Num(r.Item6),
                [torque.Id] = Num(r.Item7),
                [oil.Id] = Num(r.Item8),
                [coolant.Id] = Num(r.Item9),
                [duration.Id] = Num(r.Item10),
                [passed.Id] = r.Item11.ToString(CultureInfo.InvariantCulture),
            });
        }

        db.Datasets.Add(dataset);
        return dataset;
    }

    /// <summary>A starter report showing the build sheet columns an engineer cares about first.</summary>
    private static Report BuildDemoReport(Dataset builds)
    {
        var now = DateTime.UtcNow;
        var report = new Report { Id = Guid.NewGuid(), Number = 1, Name = "Engine Build Report", CreatedAt = now, UpdatedAt = now };

        var revision = new ReportRevision
        {
            Id = Guid.NewGuid(),
            ReportId = report.Id,
            Kind = RevisionKind.Draft,
            CreatedAt = now,
        };

        var wanted = new[]
        {
            "Job Number", "Serial Number", "Part Number", "Main Bearing Clearance",
            "Big End Clearance", "Build Concessions Signed Off",
        };

        revision.Widgets.Add(TitleWidget(revision.Id, "Engine Build Clearances"));
        revision.Widgets.Add(TableWidget(revision.Id, builds, "Build Clearances", wanted));

        report.Revisions.Add(revision);
        return report;
    }

    /// <summary>
    /// A folder tree plus a handful of reports in different states (draft-only,
    /// published, published-with-a-draft-back-out, and no revisions at all) —
    /// so the home page has enough variety to be worth demoing.
    /// </summary>
    private static void SeedFoldersAndReports(ReportingDbContext db, Dataset builds, Dataset testRuns)
    {
        var now = DateTime.UtcNow;

        var engineBuilds = new Folder { Id = Guid.NewGuid(), Name = "Engine Builds", CreatedAt = now, UpdatedAt = now };
        var q1 = new Folder
        {
            Id = Guid.NewGuid(),
            Name = "2026 Q1",
            ParentFolderId = engineBuilds.Id,
            CreatedAt = now,
            UpdatedAt = now,
        };
        var chassisQa = new Folder { Id = Guid.NewGuid(), Name = "Chassis QA", CreatedAt = now, UpdatedAt = now };
        var concessions = new Folder { Id = Guid.NewGuid(), Name = "Concessions", CreatedAt = now, UpdatedAt = now };
        db.Folders.AddRange(engineBuilds, q1, chassisQa, concessions);

        var buildColumns = new[]
        {
            "Job Number", "Serial Number", "Part Number", "Main Bearing Clearance",
            "Big End Clearance", "Build Concessions Signed Off",
        };
        var testColumns = new[] { "Job Number", "Serial Number", "Peak Power", "Peak Torque", "Passed" };

        var number = 2;

        db.Reports.Add(PublishedReport(
            number++, "Main Bearing Audit", engineBuilds.Id, builds, buildColumns, versions: 3, daysAgo: 21));

        db.Reports.Add(PublishedReport(
            number++, "Piston Clearance Report", q1.Id, builds, buildColumns, versions: 1, daysAgo: 9));

        db.Reports.Add(DraftReport(
            number++, "Chassis Torque Audit", chassisQa.Id, testRuns, testColumns, daysAgo: 2));

        db.Reports.Add(PublishedWithDraftReport(
            number++, "Chassis Alignment Check", chassisQa.Id, builds, buildColumns, versions: 2, daysAgo: 5));

        db.Reports.Add(EmptyReport(number++, "Bore Diameter Concessions", concessions.Id, daysAgo: 14));

        db.Reports.Add(DraftReport(
            number, "Final Assembly QA — Batch 12", null, testRuns, testColumns, daysAgo: 1));
    }

    private static Report PublishedReport(
        int number, string name, Guid? folderId, Dataset dataset, string[] columns, int versions, int daysAgo)
    {
        var createdAt = DateTime.UtcNow.AddDays(-daysAgo - (versions - 1) * 3);
        var updatedAt = DateTime.UtcNow.AddDays(-daysAgo);
        var report = new Report
        {
            Id = Guid.NewGuid(),
            Number = number,
            Name = name,
            FolderId = folderId,
            CreatedAt = createdAt,
            UpdatedAt = updatedAt,
        };

        for (var v = 1; v <= versions; v++)
        {
            var publishedAt = DateTime.UtcNow.AddDays(-daysAgo - (versions - v) * 3);
            var revision = new ReportRevision
            {
                Id = Guid.NewGuid(),
                ReportId = report.Id,
                Kind = RevisionKind.Published,
                VersionNumber = v,
                CreatedAt = publishedAt,
                PublishedAt = publishedAt,
                Notes = v == versions ? $"<p>Updated {name} with the latest data.</p>" : null,
            };
            revision.Widgets.Add(TitleWidget(revision.Id, name));
            revision.Widgets.Add(TableWidget(revision.Id, dataset, name, columns));
            report.Revisions.Add(revision);
        }

        return report;
    }

    private static Report DraftReport(
        int number, string name, Guid? folderId, Dataset dataset, string[] columns, int daysAgo)
    {
        var createdAt = DateTime.UtcNow.AddDays(-daysAgo);
        var report = new Report
        {
            Id = Guid.NewGuid(),
            Number = number,
            Name = name,
            FolderId = folderId,
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
        };

        var draft = new ReportRevision { Id = Guid.NewGuid(), ReportId = report.Id, Kind = RevisionKind.Draft, CreatedAt = createdAt };
        draft.Widgets.Add(TitleWidget(draft.Id, name));
        draft.Widgets.Add(TableWidget(draft.Id, dataset, name, columns));
        report.Revisions.Add(draft);

        return report;
    }

    private static Report PublishedWithDraftReport(
        int number, string name, Guid? folderId, Dataset dataset, string[] columns, int versions, int daysAgo)
    {
        var report = PublishedReport(number, name, folderId, dataset, columns, versions, daysAgo);

        var draftCreatedAt = DateTime.UtcNow.AddDays(-1);
        var draft = new ReportRevision { Id = Guid.NewGuid(), ReportId = report.Id, Kind = RevisionKind.Draft, CreatedAt = draftCreatedAt };
        draft.Widgets.Add(TitleWidget(draft.Id, name));
        draft.Widgets.Add(TableWidget(draft.Id, dataset, name, columns));
        report.Revisions.Add(draft);
        report.UpdatedAt = draftCreatedAt;

        return report;
    }

    /// <summary>A placeholder report with no revisions at all — never checked out, never published.</summary>
    private static Report EmptyReport(int number, string name, Guid? folderId, int daysAgo)
    {
        var createdAt = DateTime.UtcNow.AddDays(-daysAgo);
        return new Report
        {
            Id = Guid.NewGuid(),
            Number = number,
            Name = name,
            FolderId = folderId,
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
        };
    }

    private static Widget TitleWidget(Guid revisionId, string text) => new()
    {
        Id = Guid.NewGuid(),
        ReportRevisionId = revisionId,
        Type = WidgetType.StaticText,
        X = 0,
        Y = 0,
        W = 8,
        H = 1,
        ConfigJson = $$"""
            {"type":"staticText","title":"Text","showTitle":false,
             "content":"{{text}}","fontSize":22,"fontWeight":"bold",
             "italic":false,"underline":false,"strikethrough":false,"lineHeight":1.2,
             "color":"#152a55","backgroundColor":null,"textAlign":"left","verticalAlign":"middle",
             "wrap":true,"padding":8}
            """,
    };

    private static Widget TableWidget(Guid revisionId, Dataset dataset, string title, string[] columnNames)
    {
        var columnIds = columnNames
            .Select(name => dataset.Columns.First(c => c.Name == name).Id)
            .Select(id => $"{{\"columnId\":\"{id}\",\"sortable\":true}}");

        return new Widget
        {
            Id = Guid.NewGuid(),
            ReportRevisionId = revisionId,
            Type = WidgetType.DataTable,
            X = 0,
            Y = 1,
            W = 8,
            H = 5,
            ConfigJson = $$"""
                {"type":"dataTable","datasetId":"{{dataset.Id}}","title":"{{title}}",
                 "showTitle":true,"showColumnHeaders":true,"resizableColumns":true,
                 "stripedRows":true,"showGridlines":false,"rowHover":true,"density":"compact",
                 "paginator":false,"rowsPerPage":10,"emptyMessage":"No rows to display.",
                 "columns":[{{string.Join(",", columnIds)}}],"sortColumnId":null,"sortDirection":"asc"}
                """,
        };
    }

    private static DatasetColumn Column(
        Dataset dataset,
        string name,
        DatasetColumnType type,
        int order,
        string configurationJson = "{}")
    {
        var column = new DatasetColumn
        {
            Id = Guid.NewGuid(),
            DatasetId = dataset.Id,
            Name = name,
            Type = type,
            Order = order,
            ConfigurationJson = configurationJson,
        };
        dataset.Columns.Add(column);
        return column;
    }

    private static void AddRow(Dataset dataset, Dictionary<Guid, string> values)
    {
        var row = new DatasetRow { Id = Guid.NewGuid(), DatasetId = dataset.Id };
        var columnsById = dataset.Columns.ToDictionary(c => c.Id);

        foreach (var (columnId, raw) in values)
        {
            row.Cells.Add(CellValues.Create(row.Id, columnId, raw, columnsById[columnId].Type));
        }

        dataset.Rows.Add(row);
    }

    /// <summary>Millimetre measurement formatting at the given precision.</summary>
    private static string Mm(int decimals) => $"{{\"decimals\":{decimals},\"suffix\":\" mm\"}}";

    private static string Num(double value) => value.ToString("R", CultureInfo.InvariantCulture);

    private static string Iso(DateTime value) => value.ToString("O", CultureInfo.InvariantCulture);
}
