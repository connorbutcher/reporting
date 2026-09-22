using System.Globalization;
using Reporting.Abstractions;

namespace Reporting.Database;

public static class DbSeeder
{
    /// <summary>A cell to be created once its row and column have database-assigned int ids.</summary>
    private sealed record PendingCell(DatasetRow Row, DatasetColumn Column, string Raw);

    /// <summary>
    /// Seeds the identity/permission baseline: the stand-in default user the app runs as
    /// until auth lands, and the single grant that makes the root open to every
    /// authenticated user. Idempotent and independent of the demo-content seed, so it runs
    /// on every startup and tops up whatever is missing.
    /// </summary>
    public static void SeedIdentity(ReportingDbContext db)
    {
        var changed = false;

        if (!db.Users.Any(u => u.RefId == WellKnownIds.DefaultUser))
        {
            var user = new User
            {
                RefId = WellKnownIds.DefaultUser,
                Email = "dev@local",
                DisplayName = "Local Developer",
                CreatedAt = DateTime.UtcNow
            };
            db.Users.Add(user);
            // Needed before the default user has an id to attach the grant below to.
            db.SaveChanges();

            // A global admin so every existing flow keeps working before enforcement lands. Remove
            // the grant (and add one explicitly elsewhere) to exercise the permission checks.
            db.AppPermissionGrants.Add(new AppPermissionGrant
            {
                Permission = AppPermission.GlobalAdmin,
                UserId = user.Id,
                CreatedAt = DateTime.UtcNow,
                CreatedByUserId = 0
            });
            changed = true;
        }

        var hasRootBaseline = db.AccessGrants.Any(g =>
            g.SecurableType == SecurableType.Root && g.SubjectType == GrantSubjectType.Everyone);
        if (!hasRootBaseline)
        {
            db.AccessGrants.Add(new AccessGrant
            {
                // Root/Everyone: no typed securable or subject foreign key is set.
                SecurableType = SecurableType.Root,
                SubjectType = GrantSubjectType.Everyone,
                Level = AccessLevel.Viewer,
                CreatedAt = DateTime.UtcNow,
                CreatedByUserId = 0
            });
            changed = true;
        }

        if (changed) db.SaveChanges();

        SeedDemoDirectory(db);
    }

    /// <summary>
    /// A handful of demo users and a group so the permission editor's pickers and grant flows
    /// have something to work with before a real directory is connected. Idempotent, keyed by
    /// email/name; remove alongside the dev current-user stub when authentication lands.
    /// </summary>
    private static void SeedDemoDirectory(ReportingDbContext db)
    {
        var demoUsers = new[]
        {
            ("alice@local", "Alice Whitfield"),
            ("bob@local", "Bob Okafor"),
            ("carol@local", "Carol Lindqvist"),
        };

        var added = false;
        foreach (var (email, name) in demoUsers)
        {
            if (db.Users.Any(u => u.Email == email)) continue;
            db.Users.Add(new User { RefId = Guid.NewGuid(), Email = email, DisplayName = name, CreatedAt = DateTime.UtcNow });
            added = true;
        }
        if (added) db.SaveChanges();

        if (!db.UserGroups.Any(g => g.Name == "QA Leads"))
        {
            var alice = db.Users.FirstOrDefault(u => u.Email == "alice@local");
            var group = new UserGroup { RefId = Guid.NewGuid(), Name = "QA Leads" };
            if (alice is not null) group.Members.Add(new UserGroupMember { User = alice });
            db.UserGroups.Add(group);
            db.SaveChanges();
        }
    }

    /// <summary>A data table whose config JSON (datasetId + column ids) is filled in once its dataset has a primary key.</summary>
    private sealed record PendingTable(Widget Widget, Dataset Dataset, string Title, string[] ColumnNames);

    /// <summary>A chart widget whose config JSON is built once its dataset has a database-assigned int id.</summary>
    private sealed record PendingChart(Widget Widget, Func<string> BuildJson);

    public static void Seed(ReportingDbContext db)
    {
        if (db.Reports.Any()) return;

        // Each revision owns its own dataset. Two things aren't known until the graph is first saved:
        // a cell's column int id, and a table widget's dataset int id (which its config references).
        // So build everything first, save, then fill cells and patch the table configs.
        var pending = new List<PendingCell>();
        var pendingTables = new List<PendingTable>();

        db.Reports.Add(BuildDemoReport(pending, pendingTables));
        SeedFoldersAndReports(db, pending, pendingTables);

        db.SaveChanges();

        foreach (var (row, column, raw) in pending)
        {
            row.Cells.Add(CellValues.Create(column.Id, raw, column.Type));
        }
        foreach (var table in pendingTables)
        {
            table.Widget.ConfigJson = TableConfigJson(table.Title, table.Dataset, table.ColumnNames);
        }
        db.SaveChanges();
    }

    /// <summary>
    /// Adds the box-plot showcase report ("Torque Calibration Study") if it isn't already present.
    /// Idempotent and independent of the main demo seed — so it tops up an existing database (which
    /// <see cref="Seed"/> skips once any report exists) without wiping the user's own reports. Its
    /// number is the next free one, so it never collides with what's already there.
    /// </summary>
    public static void SeedBoxPlotShowcase(ReportingDbContext db)
    {
        const string name = "Torque Calibration Study";
        if (db.Reports.Any(r => r.Name == name)) return;

        var pending = new List<PendingCell>();
        var pendingTables = new List<PendingTable>();
        var pendingCharts = new List<PendingChart>();

        var nextNumber = (db.Reports.Max(r => (int?)r.Number) ?? 0) + 1;
        db.Reports.Add(BuildTorqueStudyReport(pending, pendingTables, pendingCharts, nextNumber));

        db.SaveChanges();

        foreach (var (row, column, raw) in pending)
        {
            row.Cells.Add(CellValues.Create(column.Id, raw, column.Type));
        }
        foreach (var table in pendingTables)
        {
            table.Widget.ConfigJson = TableConfigJson(table.Title, table.Dataset, table.ColumnNames);
        }
        foreach (var (widget, buildJson) in pendingCharts)
        {
            widget.ConfigJson = buildJson();
        }
        db.SaveChanges();
    }

    /// <summary>
    /// Adds the stacked-bar showcase report ("Build Cost Breakdown") if it isn't already present.
    /// Idempotent and independent of the main demo seed (same pattern as <see cref="SeedBoxPlotShowcase"/>),
    /// so it tops up an existing database without touching the user's own reports. Demonstrates the
    /// bar chart's multiple value columns stacked into one column per category.
    /// </summary>
    public static void SeedStackedBarShowcase(ReportingDbContext db)
    {
        const string name = "Build Cost Breakdown";
        if (db.Reports.Any(r => r.Name == name)) return;

        var pending = new List<PendingCell>();
        var pendingTables = new List<PendingTable>();
        var pendingCharts = new List<PendingChart>();

        var nextNumber = (db.Reports.Max(r => (int?)r.Number) ?? 0) + 1;
        db.Reports.Add(BuildCostBreakdownReport(pending, pendingTables, pendingCharts, nextNumber));

        db.SaveChanges();

        foreach (var (row, column, raw) in pending)
        {
            row.Cells.Add(CellValues.Create(column.Id, raw, column.Type));
        }
        foreach (var table in pendingTables)
        {
            table.Widget.ConfigJson = TableConfigJson(table.Title, table.Dataset, table.ColumnNames);
        }
        foreach (var (widget, buildJson) in pendingCharts)
        {
            widget.ConfigJson = buildJson();
        }
        db.SaveChanges();
    }

    /// <summary>
    /// Adds the histogram showcase report ("Bore Diameter Capability") if it isn't already present.
    /// Idempotent and independent of the main demo seed (same pattern as <see cref="SeedBoxPlotShowcase"/>),
    /// so it tops up an existing database without touching the user's own reports. Demonstrates the
    /// histogram's binning and a spec band drawn across the distribution, plus a machine-split overlay.
    /// </summary>
    public static void SeedHistogramShowcase(ReportingDbContext db)
    {
        const string name = "Bore Diameter Capability";
        if (db.Reports.Any(r => r.Name == name)) return;

        var pending = new List<PendingCell>();
        var pendingTables = new List<PendingTable>();
        var pendingCharts = new List<PendingChart>();

        var nextNumber = (db.Reports.Max(r => (int?)r.Number) ?? 0) + 1;
        db.Reports.Add(BuildBoreCapabilityReport(pending, pendingTables, pendingCharts, nextNumber));

        db.SaveChanges();

        foreach (var (row, column, raw) in pending)
        {
            row.Cells.Add(CellValues.Create(column.Id, raw, column.Type));
        }
        foreach (var table in pendingTables)
        {
            table.Widget.ConfigJson = TableConfigJson(table.Title, table.Dataset, table.ColumnNames);
        }
        foreach (var (widget, buildJson) in pendingCharts)
        {
            widget.ConfigJson = buildJson();
        }
        db.SaveChanges();
    }

    /// <summary>
    /// Adds the pivot showcase report ("Production Summary") if it isn't already present. Idempotent
    /// and independent of the main demo seed (same pattern as <see cref="SeedBoxPlotShowcase"/>), so
    /// it tops up an existing database without touching the user's own reports. Demonstrates the pivot
    /// grouping by one and by two dimensions, with several measures and a grand-total row.
    /// </summary>
    public static void SeedPivotShowcase(ReportingDbContext db)
    {
        const string name = "Production Summary";
        if (db.Reports.Any(r => r.Name == name)) return;

        var pending = new List<PendingCell>();
        var pendingTables = new List<PendingTable>();
        var pendingCharts = new List<PendingChart>();

        var nextNumber = (db.Reports.Max(r => (int?)r.Number) ?? 0) + 1;
        db.Reports.Add(BuildProductionSummaryReport(pending, pendingTables, pendingCharts, nextNumber));

        db.SaveChanges();

        foreach (var (row, column, raw) in pending)
        {
            row.Cells.Add(CellValues.Create(column.Id, raw, column.Type));
        }
        foreach (var table in pendingTables)
        {
            table.Widget.ConfigJson = TableConfigJson(table.Title, table.Dataset, table.ColumnNames);
        }
        foreach (var (widget, buildJson) in pendingCharts)
        {
            widget.ConfigJson = buildJson();
        }
        db.SaveChanges();
    }

    /// <summary>
    /// Adds the grand feature-tour report ("Engine Build — Feature Tour") if it isn't already present.
    /// Idempotent and independent of the other seeds (same pattern as <see cref="SeedBoxPlotShowcase"/>).
    /// One engine-build dataset shown through every widget and option the builder offers — a data table,
    /// a widget-filtered table, a pivot, scatter/line/bar/combination/box/histogram charts, tolerance
    /// bands, tooltip columns, dual value axes, a report-level filter, and four tabs.
    /// </summary>
    public static void SeedFeatureShowcase(ReportingDbContext db)
    {
        const string name = "Engine Build — Feature Tour";
        if (db.Reports.Any(r => r.Name == name)) return;

        var pending = new List<PendingCell>();
        var pendingTables = new List<PendingTable>();
        var pendingCharts = new List<PendingChart>();
        var pendingFilters = new List<Action>();

        var nextNumber = (db.Reports.Max(r => (int?)r.Number) ?? 0) + 1;
        db.Reports.Add(BuildFeatureShowcaseReport(pending, pendingTables, pendingCharts, pendingFilters, nextNumber));

        db.SaveChanges();

        foreach (var (row, column, raw) in pending)
        {
            row.Cells.Add(CellValues.Create(column.Id, raw, column.Type));
        }
        foreach (var table in pendingTables)
        {
            table.Widget.ConfigJson = TableConfigJson(table.Title, table.Dataset, table.ColumnNames);
        }
        foreach (var (widget, buildJson) in pendingCharts)
        {
            widget.ConfigJson = buildJson();
        }
        // Report-level filters live on the revision and reference the dataset's now-assigned int id.
        foreach (var apply in pendingFilters)
        {
            apply();
        }
        db.SaveChanges();
    }

    /// <summary>
    /// Adds the cross-reference showcase report ("Engine Build Cross-Reference") if it isn't already
    /// present. Idempotent and independent of the other seeds (same pattern as <see cref="SeedBoxPlotShowcase"/>).
    /// Three engine-build-related datasets — builds, dyno test runs, and concessions — all keyed on Job
    /// Number, each shown in its own table plus an overlay chart pulling a series from two of them. A
    /// report-level filter narrows all three datasets to the same subset of builds at once, so one
    /// restriction (only the V8/V12 builds) drops matching rows from every table and the chart together.
    /// </summary>
    public static void SeedCrossReferenceShowcase(ReportingDbContext db)
    {
        const string name = "Engine Build Cross-Reference";
        if (db.Reports.Any(r => r.Name == name)) return;

        var pending = new List<PendingCell>();
        var pendingTables = new List<PendingTable>();
        var pendingCharts = new List<PendingChart>();
        var pendingFilters = new List<Action>();

        var nextNumber = (db.Reports.Max(r => (int?)r.Number) ?? 0) + 1;
        db.Reports.Add(BuildCrossReferenceReport(pending, pendingTables, pendingCharts, pendingFilters, nextNumber));

        db.SaveChanges();

        foreach (var (row, column, raw) in pending)
        {
            row.Cells.Add(CellValues.Create(column.Id, raw, column.Type));
        }
        foreach (var table in pendingTables)
        {
            table.Widget.ConfigJson = TableConfigJson(table.Title, table.Dataset, table.ColumnNames);
        }
        foreach (var (widget, buildJson) in pendingCharts)
        {
            widget.ConfigJson = buildJson();
        }
        // Report-level filters live on the revision and reference each dataset's now-assigned int id.
        foreach (var apply in pendingFilters)
        {
            apply();
        }
        db.SaveChanges();
    }

    /// <summary>
    /// Adds a title + data-table widget bound to a fresh dataset built for this revision. The table's
    /// config is deferred (see <see cref="PendingTable"/>) because it references the dataset's not-yet-known id.
    /// </summary>
    private static void AddDataset(
        ReportRevision revision,
        List<PendingCell> pending,
        List<PendingTable> pendingTables,
        string title,
        Func<List<PendingCell>, Dataset> datasetFactory,
        string[] columnNames)
    {
        var dataset = datasetFactory(pending);
        revision.Datasets.Add(dataset);

        // Widgets live on a tab; each seeded revision gets a single default tab to carry them.
        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Tab 1", Order = 0 };
        revision.Tabs.Add(tab);

        tab.Widgets.Add(TitleWidget(title));
        var table = new Widget
        {
            RefId = Guid.NewGuid(),
            Type = WidgetType.DataTable,
            X = 0,
            Y = 1,
            W = 8,
            H = 5,
            ConfigJson = "{}",
        };
        tab.Widgets.Add(table);
        pendingTables.Add(new PendingTable(table, dataset, title, columnNames));
    }

    private static Dataset BuildEngineBuilds(List<PendingCell> pending)
    {
        var dataset = new Dataset
        {
            Name = "Engine Builds",
            DatasetSourceId = DatasetSourceIds.Assembly,
            SourceConfigJson = "{\"source\":\"assembly\",\"typeId\":4471,\"phaseIds\":[1,2,3]}",
        };

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
            AddRow(dataset, pending, new Dictionary<DatasetColumn, string>
            {
                [job] = r.Item1,
                [serial] = r.Item2,
                [part] = r.Item3,
                [engineType] = r.Item4,
                [buildDate] = Iso(r.Item5),
                [inspector] = r.Item6,
                [bore] = Num(r.Item7),
                [mainBearing] = Num(r.Item8),
                [bigEnd] = Num(r.Item9),
                [pistonBore] = Num(r.Item10),
                [endFloat] = Num(r.Item11),
                [deckHeight] = Num(r.Item12),
                [compression] = Num(r.Item13),
                [rework] = r.Item14.ToString(CultureInfo.InvariantCulture),
                [concessions] = r.Item15.ToString(CultureInfo.InvariantCulture),
            });
        }

        return dataset;
    }

    private static Dataset BuildTestRuns(List<PendingCell> pending)
    {
        var dataset = new Dataset
        {
            Name = "Engine Test Runs",
            DatasetSourceId = DatasetSourceIds.Disassembly,
            SourceConfigJson = "{\"source\":\"disassembly\",\"typeId\":5120,\"phaseIds\":[7,8]}",
        };

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
            AddRow(dataset, pending, new Dictionary<DatasetColumn, string>
            {
                [job] = r.Item1,
                [serial] = r.Item2,
                [part] = r.Item3,
                [runDate] = Iso(r.Item4),
                [cell] = r.Item5,
                [power] = Num(r.Item6),
                [torque] = Num(r.Item7),
                [oil] = Num(r.Item8),
                [coolant] = Num(r.Item9),
                [duration] = Num(r.Item10),
                [passed] = r.Item11.ToString(CultureInfo.InvariantCulture),
            });
        }

        return dataset;
    }

    /// <summary>A starter report showing the build sheet columns an engineer cares about first.</summary>
    private static Report BuildDemoReport(List<PendingCell> pending, List<PendingTable> pendingTables)
    {
        var now = DateTime.UtcNow;
        var report = new Report { RefId = Guid.NewGuid(), Number = 1, Name = "Engine Build Report", CreatedAt = now, UpdatedAt = now };

        var revision = new ReportRevision
        {
            RefId = Guid.NewGuid(),
            Kind = RevisionKind.Draft,
            CreatedAt = now,
        };

        var wanted = new[]
        {
            "Job Number", "Serial Number", "Part Number", "Main Bearing Clearance",
            "Big End Clearance", "Build Concessions Signed Off",
        };

        AddDataset(revision, pending, pendingTables, "Build Clearances", BuildEngineBuilds, wanted);

        report.Revisions.Add(revision);
        return report;
    }

    /// <summary>
    /// A folder tree plus a handful of reports in different states (draft-only,
    /// published, published-with-a-draft-back-out, and no revisions at all) —
    /// so the home page has enough variety to be worth demoing.
    /// </summary>
    private static void SeedFoldersAndReports(ReportingDbContext db, List<PendingCell> pending, List<PendingTable> pendingTables)
    {
        var now = DateTime.UtcNow;

        var engineBuilds = new Folder { RefId = Guid.NewGuid(), Name = "Engine Builds", CreatedAt = now, UpdatedAt = now };
        var q1 = new Folder
        {
            RefId = Guid.NewGuid(),
            Name = "2026 Q1",
            ParentFolder = engineBuilds,
            CreatedAt = now,
            UpdatedAt = now,
        };
        var chassisQa = new Folder { RefId = Guid.NewGuid(), Name = "Chassis QA", CreatedAt = now, UpdatedAt = now };
        var concessions = new Folder { RefId = Guid.NewGuid(), Name = "Concessions", CreatedAt = now, UpdatedAt = now };
        db.Folders.AddRange(engineBuilds, q1, chassisQa, concessions);

        var buildColumns = new[]
        {
            "Job Number", "Serial Number", "Part Number", "Main Bearing Clearance",
            "Big End Clearance", "Build Concessions Signed Off",
        };
        var testColumns = new[] { "Job Number", "Serial Number", "Peak Power", "Peak Torque", "Passed" };

        var number = 2;

        db.Reports.Add(PublishedReport(
            number++, "Main Bearing Audit", engineBuilds, BuildEngineBuilds, buildColumns, versions: 3, daysAgo: 21, pending, pendingTables));

        db.Reports.Add(PublishedReport(
            number++, "Piston Clearance Report", q1, BuildEngineBuilds, buildColumns, versions: 1, daysAgo: 9, pending, pendingTables));

        db.Reports.Add(DraftReport(
            number++, "Chassis Torque Audit", chassisQa, BuildTestRuns, testColumns, daysAgo: 2, pending, pendingTables));

        db.Reports.Add(PublishedWithDraftReport(
            number++, "Chassis Alignment Check", chassisQa, BuildEngineBuilds, buildColumns, versions: 2, daysAgo: 5, pending, pendingTables));

        db.Reports.Add(EmptyReport(number++, "Bore Diameter Concessions", concessions, daysAgo: 14));

        db.Reports.Add(DraftReport(
            number, "Final Assembly QA — Batch 12", null, BuildTestRuns, testColumns, daysAgo: 1, pending, pendingTables));
    }

    /// <summary>
    /// A standalone draft report showcasing the box-and-whisker chart: a repeated torque
    /// measurement taken across four assembly stations and two shifts, whose distributions
    /// differ enough — in centre, spread, and a scatter of deliberate outliers — to make a
    /// compelling box plot. Carries two box plots (one per station, one split by shift) plus
    /// the raw table behind them.
    /// </summary>
    private static Report BuildTorqueStudyReport(
        List<PendingCell> pending, List<PendingTable> pendingTables, List<PendingChart> pendingCharts, int number)
    {
        var now = DateTime.UtcNow;
        var report = new Report
        {
            RefId = Guid.NewGuid(),
            Number = number,
            Name = "Torque Calibration Study",
            CreatedAt = now,
            UpdatedAt = now,
        };

        var revision = new ReportRevision { RefId = Guid.NewGuid(), Kind = RevisionKind.Draft, CreatedAt = now };
        var dataset = BuildTorqueStudy(pending);
        revision.Datasets.Add(dataset);

        // A one-row limits dataset gives the value axis its spec band (LSL/USL) — the reference the
        // out-of-spec box highlighting and the Cp/Cpk capability figures are measured against.
        var specRowRef = Guid.NewGuid();
        var spec = new Dataset
        {
            Name = "Torque Spec",
            DatasetSourceId = DatasetSourceIds.Assembly,
            SourceConfigJson = "{\"source\":\"assembly\",\"typeId\":7788,\"phaseIds\":[9]}",
        };
        var characteristic = Column(spec, "Characteristic", DatasetColumnType.String, 0);
        var lsl = Column(spec, "LSL", DatasetColumnType.Double, 1, "{\"decimals\":2,\"suffix\":\" Nm\"}");
        var usl = Column(spec, "USL", DatasetColumnType.Double, 2, "{\"decimals\":2,\"suffix\":\" Nm\"}");
        var specRow = new DatasetRow { RefId = specRowRef };
        spec.Rows.Add(specRow);
        pending.Add(new PendingCell(specRow, characteristic, "Seal Torque"));
        pending.Add(new PendingCell(specRow, lsl, Num(11.00)));
        pending.Add(new PendingCell(specRow, usl, Num(13.00)));
        revision.Datasets.Add(spec);

        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Box plots", Order = 0 };
        revision.Tabs.Add(tab);

        var stationRef = dataset.Columns.First(c => c.Name == "Station").RefId;
        var shiftRef = dataset.Columns.First(c => c.Name == "Shift").RefId;
        var torqueRef = dataset.Columns.First(c => c.Name == "Seal Torque").RefId;
        const string yLabel = "Seal Torque (Nm)";

        tab.Widgets.Add(TitleWidget("Seal Torque Calibration Study", 0, 0, 48, 2));

        // Hero box plot: one box per station with the spec band, so a station whose spread breaches
        // ±1 Nm is highlighted; mean marker, n, and Cp/Cpk make it a capability view.
        var byStation = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.BoxPlot, X = 0, Y = 2, W = 28, H = 17, ConfigJson = "{}" };
        tab.Widgets.Add(byStation);
        pendingCharts.Add(new PendingChart(byStation, () =>
            BoxPlotConfigJson("Seal torque by station", dataset, stationRef, torqueRef, null, "tukey", yLabel,
                showMean: true, showSampleSize: true, showCapability: true,
                bandsJson: SpecBandJson(spec.Id, specRowRef, lsl.RefId, usl.RefId))));

        // The same measure split by shift, with the individual measurements jittered over each box.
        var byShift = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.BoxPlot, X = 28, Y = 2, W = 20, H = 17, ConfigJson = "{}" };
        tab.Widgets.Add(byShift);
        pendingCharts.Add(new PendingChart(byShift, () =>
            BoxPlotConfigJson("By station & shift", dataset, stationRef, torqueRef, shiftRef, "tukey", yLabel,
                showMean: true, showPoints: true)));

        // The rows behind the plots, so the distribution is inspectable.
        var tableColumns = new[] { "Sample ID", "Station", "Shift", "Operator", "Seal Torque", "Measured At" };
        var table = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.DataTable, X = 0, Y = 19, W = 48, H = 11, ConfigJson = "{}" };
        tab.Widgets.Add(table);
        pendingTables.Add(new PendingTable(table, dataset, "Torque measurements", tableColumns));

        report.Revisions.Add(revision);
        return report;
    }

    /// <summary>
    /// A repeated-measurement dataset built for the box plot: one row per torque check, tagged
    /// with the station and shift it was taken on. Each station/shift draws from its own normal
    /// distribution (differing centre and spread), with a handful of extreme readings injected so
    /// the Tukey whiskers flag them as outliers. Deterministic — a fixed RNG seed keeps the seeded
    /// data identical across rebuilds.
    /// </summary>
    private static Dataset BuildTorqueStudy(List<PendingCell> pending)
    {
        var dataset = new Dataset
        {
            Name = "Torque Calibration Study",
            DatasetSourceId = DatasetSourceIds.Assembly,
            SourceConfigJson = "{\"source\":\"assembly\",\"typeId\":7788,\"phaseIds\":[5,6]}",
        };

        var sampleId = Column(dataset, "Sample ID", DatasetColumnType.String, 0);
        var station = Column(dataset, "Station", DatasetColumnType.String, 1);
        var shift = Column(dataset, "Shift", DatasetColumnType.String, 2);
        var operatorCol = Column(dataset, "Operator", DatasetColumnType.String, 3);
        var torque = Column(dataset, "Seal Torque", DatasetColumnType.Double, 4, "{\"decimals\":2,\"suffix\":\" Nm\"}");
        var measuredAt = Column(dataset, "Measured At", DatasetColumnType.DateTime, 5, "{\"dateFormat\":\"d MMM yyyy\"}");

        // (station, day mean, day sd) — night runs a touch higher and more variable (see below).
        var stations = new[]
        {
            ("Station A", 12.00, 0.30),
            ("Station B", 12.55, 0.70),
            ("Station C", 11.55, 0.45),
            ("Station D", 12.10, 1.05),
        };
        var operators = new[] { "J. Reyes", "K. Novak", "P. Osei", "L. Haddad" };

        // Fixed seed → identical data every rebuild.
        var rng = new Random(20260902);
        var start = new DateTime(2026, 5, 4);
        var sample = 1;
        var day = 0;

        void Emit(string stationName, string shiftName, string op, double value, int dayOffset)
        {
            AddRow(dataset, pending, new Dictionary<DatasetColumn, string>
            {
                [sampleId] = $"TQ-{sample:0000}",
                [station] = stationName,
                [shift] = shiftName,
                [operatorCol] = op,
                [torque] = Num(Math.Round(value, 2)),
                [measuredAt] = Iso(start.AddDays(dayOffset)),
            });
            sample++;
        }

        // Standard-normal sample via Box–Muller, so each group is a believable spread rather than noise.
        double NextNormal()
        {
            var u1 = 1.0 - rng.NextDouble();
            var u2 = 1.0 - rng.NextDouble();
            return Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Cos(2.0 * Math.PI * u2);
        }

        const int perGroup = 14;
        foreach (var (stationName, mean, sd) in stations)
        {
            for (var s = 0; s < 2; s++)
            {
                var night = s == 1;
                var shiftName = night ? "Night" : "Day";
                // Night shift drifts a little high and runs wider — a small, visible shift between boxes.
                var groupMean = night ? mean + 0.18 : mean;
                var groupSd = night ? sd * 1.25 : sd;

                for (var i = 0; i < perGroup; i++)
                {
                    var value = Math.Clamp(groupMean + groupSd * NextNormal(), 8.0, 17.0);
                    Emit(stationName, shiftName, operators[(sample) % operators.Length], value, day);
                    day++;
                }
            }
        }

        // A scatter of deliberate outliers so Tukey whiskers have something to flag.
        Emit("Station A", "Day", "J. Reyes", 13.55, day++);
        Emit("Station B", "Night", "K. Novak", 15.90, day++);
        Emit("Station C", "Night", "P. Osei", 9.85, day++);
        Emit("Station D", "Day", "L. Haddad", 8.70, day++);
        Emit("Station D", "Day", "L. Haddad", 15.40, day);

        return dataset;
    }

    /// <summary>
    /// The stacked-bar showcase report: one dataset of per-build cost components, a hero stacked
    /// column chart (the four costs stacked per model) and a grouped variant of the same measures,
    /// plus the rows behind them. A single-revision draft, like the torque study.
    /// </summary>
    private static Report BuildCostBreakdownReport(
        List<PendingCell> pending, List<PendingTable> pendingTables, List<PendingChart> pendingCharts, int number)
    {
        var now = DateTime.UtcNow;
        var report = new Report
        {
            RefId = Guid.NewGuid(),
            Number = number,
            Name = "Build Cost Breakdown",
            CreatedAt = now,
            UpdatedAt = now,
        };

        var revision = new ReportRevision { RefId = Guid.NewGuid(), Kind = RevisionKind.Draft, CreatedAt = now };
        var dataset = BuildCostBreakdown(pending);
        revision.Datasets.Add(dataset);

        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Cost breakdown", Order = 0 };
        revision.Tabs.Add(tab);

        var modelRef = dataset.Columns.First(c => c.Name == "Engine Model").RefId;
        var costRefs = new[] { "Material Cost", "Machining Cost", "Assembly Labour", "QA & Test" }
            .Select(n => dataset.Columns.First(c => c.Name == n).RefId)
            .ToArray();
        const string yLabel = "Cost (£)";

        tab.Widgets.Add(TitleWidget("Build Cost Breakdown", 0, 0, 48, 2));

        // Hero stacked column: the four cost components stacked into one bar per model, so the
        // average build cost and its composition read at a glance — multiple value columns + stacking.
        var stackedChart = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.BarChart, X = 0, Y = 2, W = 28, H = 17, ConfigJson = "{}" };
        tab.Widgets.Add(stackedChart);
        pendingCharts.Add(new PendingChart(stackedChart, () =>
            BarChartConfigJson("Average build cost by model", dataset, modelRef, costRefs, "average", stacked: true, horizontal: false, yLabel)));

        // The same four measures grouped side by side, so each component is comparable across models.
        var groupedChart = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.BarChart, X = 28, Y = 2, W = 20, H = 17, ConfigJson = "{}" };
        tab.Widgets.Add(groupedChart);
        pendingCharts.Add(new PendingChart(groupedChart, () =>
            BarChartConfigJson("Cost components compared", dataset, modelRef, costRefs, "average", stacked: false, horizontal: false, yLabel)));

        // The rows behind the charts, so the per-build costs are inspectable.
        var tableColumns = new[] { "Build ID", "Engine Model", "Material Cost", "Machining Cost", "Assembly Labour", "QA & Test" };
        var table = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.DataTable, X = 0, Y = 19, W = 48, H = 11, ConfigJson = "{}" };
        tab.Widgets.Add(table);
        pendingTables.Add(new PendingTable(table, dataset, "Per-build costs", tableColumns));

        report.Revisions.Add(revision);
        return report;
    }

    /// <summary>
    /// A per-build cost dataset built for the stacked bar: one row per engine build, tagged with its
    /// model and line, carrying four cost components (material, machining, assembly labour, QA/test).
    /// Larger engines cost more across the board; each cost jitters a little around its model's base
    /// so the aggregates differ per build. Deterministic — a fixed RNG seed keeps the data stable.
    /// </summary>
    private static Dataset BuildCostBreakdown(List<PendingCell> pending)
    {
        var dataset = new Dataset
        {
            Name = "Build Cost Breakdown",
            DatasetSourceId = DatasetSourceIds.Assembly,
            SourceConfigJson = "{\"source\":\"assembly\",\"typeId\":7788,\"phaseIds\":[3,4]}",
        };

        var buildId = Column(dataset, "Build ID", DatasetColumnType.String, 0);
        var model = Column(dataset, "Engine Model", DatasetColumnType.String, 1);
        var line = Column(dataset, "Line", DatasetColumnType.String, 2);
        var material = Column(dataset, "Material Cost", DatasetColumnType.Double, 3, Gbp);
        var machining = Column(dataset, "Machining Cost", DatasetColumnType.Double, 4, Gbp);
        var labour = Column(dataset, "Assembly Labour", DatasetColumnType.Double, 5, Gbp);
        var qa = Column(dataset, "QA & Test", DatasetColumnType.Double, 6, Gbp);

        // (model, material, machining, labour, QA) base costs in £ — larger engines cost more.
        var models = new[]
        {
            ("I4 2.0L", 1800.0, 900.0, 620.0, 340.0),
            ("I6 3.0L", 2600.0, 1300.0, 860.0, 450.0),
            ("V8 5.0L", 4200.0, 2100.0, 1400.0, 700.0),
            ("V12 6.5L", 6800.0, 3400.0, 2200.0, 1100.0),
        };
        var lines = new[] { "Line 1", "Line 2" };

        // Fixed seed → identical data every rebuild.
        var rng = new Random(20260903);
        var build = 1;
        const int perModel = 8;

        double Jitter(double baseCost) => Math.Round(baseCost * (0.94 + rng.NextDouble() * 0.12), 0);

        foreach (var (modelName, mat, mac, lab, q) in models)
        {
            for (var i = 0; i < perModel; i++)
            {
                AddRow(dataset, pending, new Dictionary<DatasetColumn, string>
                {
                    [buildId] = $"BC-{build:0000}",
                    [model] = modelName,
                    [line] = lines[i % lines.Length],
                    [material] = Num(Jitter(mat)),
                    [machining] = Num(Jitter(mac)),
                    [labour] = Num(Jitter(lab)),
                    [qa] = Num(Jitter(q)),
                });
                build++;
            }
        }

        return dataset;
    }

    /// <summary>
    /// A standalone draft report showcasing the histogram: a single machined dimension (bore
    /// diameter) measured across many engine builds on three machines. The pooled distribution is a
    /// believable bell whose tails cross the spec limits, and one machine sits high while another
    /// runs low — so the hero histogram (with its spec band) reads as a process-capability view and
    /// the machine-split overlay shows where each machine's distribution sits. Carries both plus the
    /// raw table behind them.
    /// </summary>
    private static Report BuildBoreCapabilityReport(
        List<PendingCell> pending, List<PendingTable> pendingTables, List<PendingChart> pendingCharts, int number)
    {
        var now = DateTime.UtcNow;
        var report = new Report
        {
            RefId = Guid.NewGuid(),
            Number = number,
            Name = "Bore Diameter Capability",
            CreatedAt = now,
            UpdatedAt = now,
        };

        var revision = new ReportRevision { RefId = Guid.NewGuid(), Kind = RevisionKind.Draft, CreatedAt = now };
        var dataset = BuildBoreStudy(pending);
        revision.Datasets.Add(dataset);

        // A one-row limits dataset gives the binned (X) axis its spec band (LSL/USL) — the reference
        // lines the distribution's capability is read against, drawn straight across the histogram.
        var specRowRef = Guid.NewGuid();
        var spec = new Dataset
        {
            Name = "Bore Diameter Spec",
            DatasetSourceId = DatasetSourceIds.Assembly,
            SourceConfigJson = "{\"source\":\"assembly\",\"typeId\":7788,\"phaseIds\":[7]}",
        };
        var characteristic = Column(spec, "Characteristic", DatasetColumnType.String, 0);
        var lsl = Column(spec, "LSL", DatasetColumnType.Double, 1, Mm(2));
        var usl = Column(spec, "USL", DatasetColumnType.Double, 2, Mm(2));
        var specRow = new DatasetRow { RefId = specRowRef };
        spec.Rows.Add(specRow);
        pending.Add(new PendingCell(specRow, characteristic, "Bore Diameter"));
        pending.Add(new PendingCell(specRow, lsl, Num(101.55)));
        pending.Add(new PendingCell(specRow, usl, Num(101.65)));
        revision.Datasets.Add(spec);

        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Distribution", Order = 0 };
        revision.Tabs.Add(tab);

        var boreRef = dataset.Columns.First(c => c.Name == "Bore Diameter").RefId;
        var machineRef = dataset.Columns.First(c => c.Name == "Machine").RefId;
        const string xLabel = "Bore Diameter (mm)";

        tab.Widgets.Add(TitleWidget("Bore Diameter Capability", 0, 0, 48, 2));

        // Hero histogram: the pooled bore-diameter distribution with the spec band drawn across it,
        // so the process centre, spread, and the tails that fall outside spec read at a glance.
        var overall = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.Histogram, X = 0, Y = 2, W = 28, H = 17, ConfigJson = "{}" };
        tab.Widgets.Add(overall);
        pendingCharts.Add(new PendingChart(overall, () =>
            HistogramConfigJson("Bore diameter distribution", dataset, boreRef, null, xLabel, "Number of builds",
                binMode: "count", binCount: 20, normalize: "count",
                bandsJson: SpecBandJson(spec.Id, specRowRef, lsl.RefId, usl.RefId, axis: "x"))));

        // The same measure split per machine and shown as a relative frequency, so three differently
        // sized batches are comparable and the high/low machine drift is obvious.
        var byMachine = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.Histogram, X = 28, Y = 2, W = 20, H = 17, ConfigJson = "{}" };
        tab.Widgets.Add(byMachine);
        pendingCharts.Add(new PendingChart(byMachine, () =>
            HistogramConfigJson("By machine (relative)", dataset, boreRef, machineRef, xLabel, "Share of builds",
                binMode: "count", binCount: 20, normalize: "frequency")));

        // The rows behind the histograms, so the individual measurements are inspectable.
        var tableColumns = new[] { "Sample ID", "Machine", "Bore Diameter", "Measured At" };
        var table = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.DataTable, X = 0, Y = 19, W = 48, H = 11, ConfigJson = "{}" };
        tab.Widgets.Add(table);
        pendingTables.Add(new PendingTable(table, dataset, "Bore measurements", tableColumns));

        report.Revisions.Add(revision);
        return report;
    }

    /// <summary>
    /// A single-measurement dataset built for the histogram: one row per machined bore, tagged with
    /// the machine it was cut on. Each machine draws from its own normal distribution — one centred,
    /// one drifted high and wider, one drifted low — so the pooled bell has tails past both spec
    /// limits. Deterministic: a fixed RNG seed keeps the seeded data identical across rebuilds.
    /// </summary>
    private static Dataset BuildBoreStudy(List<PendingCell> pending)
    {
        var dataset = new Dataset
        {
            Name = "Bore Diameter Capability",
            DatasetSourceId = DatasetSourceIds.Assembly,
            SourceConfigJson = "{\"source\":\"assembly\",\"typeId\":7788,\"phaseIds\":[7,8]}",
        };

        var sampleId = Column(dataset, "Sample ID", DatasetColumnType.String, 0);
        var machine = Column(dataset, "Machine", DatasetColumnType.String, 1);
        var bore = Column(dataset, "Bore Diameter", DatasetColumnType.Double, 2, Mm(3));
        var measuredAt = Column(dataset, "Measured At", DatasetColumnType.DateTime, 3, "{\"dateFormat\":\"d MMM yyyy\"}");

        // (machine, mean, sd) — the nominal bore is 101.60 mm with a ±0.05 spec. CNC-02 sits high and
        // runs wider (tail past the USL); CNC-03 sits low (tail past the LSL); CNC-01 is well centred.
        var machines = new[]
        {
            ("CNC-01", 101.601, 0.011),
            ("CNC-02", 101.618, 0.016),
            ("CNC-03", 101.589, 0.013),
        };

        // Fixed seed → identical data every rebuild.
        var rng = new Random(20260907);
        var start = new DateTime(2026, 6, 1);
        var sample = 1;
        var day = 0;

        // Standard-normal sample via Box–Muller, so each machine is a believable spread rather than noise.
        double NextNormal()
        {
            var u1 = 1.0 - rng.NextDouble();
            var u2 = 1.0 - rng.NextDouble();
            return Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Cos(2.0 * Math.PI * u2);
        }

        const int perMachine = 44;
        foreach (var (machineName, mean, sd) in machines)
        {
            for (var i = 0; i < perMachine; i++)
            {
                var value = Math.Clamp(mean + sd * NextNormal(), 101.53, 101.67);
                AddRow(dataset, pending, new Dictionary<DatasetColumn, string>
                {
                    [sampleId] = $"BD-{sample:0000}",
                    [machine] = machineName,
                    [bore] = Num(Math.Round(value, 3)),
                    [measuredAt] = Iso(start.AddDays(day)),
                });
                sample++;
                day++;
            }
        }

        return dataset;
    }

    /// <summary>
    /// A histogram widget's config JSON, built once the dataset has a primary key. The dataset is
    /// referenced by that int id; the binned column (and any split column) by their stable RefIds.
    /// A null <paramref name="seriesRef"/> plots one distribution; otherwise each distinct value of
    /// that column becomes an overlaid series. Bins are a fixed count over the data's own range.
    /// </summary>
    private static string HistogramConfigJson(
        string title, Dataset dataset, Guid valueRef, Guid? seriesRef,
        string xAxisLabel, string yAxisLabel, string binMode, int binCount, string normalize,
        bool cumulative = false, string bandsJson = "[]")
    {
        var bindingId = Guid.NewGuid();
        var series = seriesRef is { } s ? $"\"{s}\"" : "null";
        static string B(bool value) => value ? "true" : "false";
        return $$"""
            {"type":"histogram","title":"{{title}}","showTitle":true,
             "bindings":[{"id":"{{bindingId}}","datasetId":{{dataset.Id}},"xColumnId":"{{valueRef}}","yColumnId":null,"seriesColumnId":{{series}},"yAxisId":null,"label":"","color":null,"symbol":null,"dashStyle":null,"filter":null}],
             "yAxes":[{"id":"primary","label":"{{yAxisLabel}}","side":"left"}],
             "xAxisLabel":"{{xAxisLabel}}","yAxisLabel":"{{yAxisLabel}}",
             "zoom":false,"showLegend":{{B(seriesRef is not null)}},"pointSize":8,
             "showGridLines":true,"showValueLabels":false,
             "toleranceBands":{{bandsJson}},"tooltipColumns":[],
             "binMode":"{{binMode}}","binCount":{{binCount}},"binWidth":1,"rangeMin":null,"rangeMax":null,
             "normalize":"{{normalize}}","cumulative":{{B(cumulative)}},"horizontal":false}
            """;
    }

    /// <summary>
    /// A standalone draft report showcasing the pivot table: a run of engine builds tagged with model
    /// and assembly line, carrying a build cost, build hours, and a rework count. A hero pivot groups
    /// by model then line and reduces each group to several measures (count, total cost, average
    /// hours, worst rework); a companion pivot rolls the same measures up to model alone. Both carry a
    /// grand-total row, and the raw builds sit beneath them.
    /// </summary>
    private static Report BuildProductionSummaryReport(
        List<PendingCell> pending, List<PendingTable> pendingTables, List<PendingChart> pendingCharts, int number)
    {
        var now = DateTime.UtcNow;
        var report = new Report
        {
            RefId = Guid.NewGuid(),
            Number = number,
            Name = "Production Summary",
            CreatedAt = now,
            UpdatedAt = now,
        };

        var revision = new ReportRevision { RefId = Guid.NewGuid(), Kind = RevisionKind.Draft, CreatedAt = now };
        var dataset = BuildProductionRuns(pending);
        revision.Datasets.Add(dataset);

        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Summary", Order = 0 };
        revision.Tabs.Add(tab);

        Guid Ref(string columnName) => dataset.Columns.First(c => c.Name == columnName).RefId;
        var modelRef = Ref("Engine Model");
        var lineRef = Ref("Assembly Line");
        var costRef = Ref("Build Cost");
        var hoursRef = Ref("Build Hours");
        var reworkRef = Ref("Rework Count");

        // The measures both pivots share: how many builds, their total cost, their average hours, and
        // the worst rework count — one of each aggregate kind so the showcase covers them all.
        (Guid? Column, string Aggregate, string Label)[] measures =
        [
            (null, "count", "Builds"),
            (costRef, "sum", "Total cost"),
            (hoursRef, "average", "Avg hours"),
            (reworkRef, "max", "Worst rework"),
        ];

        tab.Widgets.Add(TitleWidget("Production Summary", 0, 0, 48, 2));

        // Hero pivot: grouped by model then line, so each build line reads as its own row nested
        // under its model, with the four measures across and a grand total beneath.
        var byModelLine = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.PivotTable, X = 0, Y = 2, W = 28, H = 17, ConfigJson = "{}" };
        tab.Widgets.Add(byModelLine);
        pendingCharts.Add(new PendingChart(byModelLine, () =>
            PivotConfigJson("Builds by model & line", dataset, [modelRef, lineRef], measures)));

        // Companion pivot: the same measures rolled up to model alone — the higher-level summary.
        var byModel = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.PivotTable, X = 28, Y = 2, W = 20, H = 17, ConfigJson = "{}" };
        tab.Widgets.Add(byModel);
        pendingCharts.Add(new PendingChart(byModel, () =>
            PivotConfigJson("Builds by model", dataset, [modelRef], measures)));

        // The rows behind the pivots, so the individual builds are inspectable.
        var tableColumns = new[] { "Build ID", "Engine Model", "Assembly Line", "Build Cost", "Build Hours", "Rework Count" };
        var table = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.DataTable, X = 0, Y = 19, W = 48, H = 11, ConfigJson = "{}" };
        tab.Widgets.Add(table);
        pendingTables.Add(new PendingTable(table, dataset, "Production runs", tableColumns));

        report.Revisions.Add(revision);
        return report;
    }

    /// <summary>
    /// A per-build dataset built for the pivot: one row per engine build, tagged with its model and
    /// assembly line, carrying a build cost, build hours, and a rework count. Larger engines cost more
    /// and take longer; Line 2 runs a little slower and reworks a little more, so the grouped figures
    /// differ per model and line. Deterministic — a fixed RNG seed keeps the data stable.
    /// </summary>
    private static Dataset BuildProductionRuns(List<PendingCell> pending)
    {
        var dataset = new Dataset
        {
            Name = "Production Runs",
            DatasetSourceId = DatasetSourceIds.Assembly,
            SourceConfigJson = "{\"source\":\"assembly\",\"typeId\":7788,\"phaseIds\":[2,3]}",
        };

        var buildId = Column(dataset, "Build ID", DatasetColumnType.String, 0);
        var model = Column(dataset, "Engine Model", DatasetColumnType.String, 1);
        var line = Column(dataset, "Assembly Line", DatasetColumnType.String, 2);
        var cost = Column(dataset, "Build Cost", DatasetColumnType.Double, 3, Gbp);
        var hours = Column(dataset, "Build Hours", DatasetColumnType.Double, 4, "{\"decimals\":1,\"suffix\":\" h\"}");
        var rework = Column(dataset, "Rework Count", DatasetColumnType.Int, 5);

        // (model, base cost £, base hours) — larger engines cost more and take longer to build.
        var models = new[]
        {
            ("I4 2.0L", 3600.0, 18.0),
            ("I6 3.0L", 5200.0, 24.0),
            ("V8 5.0L", 8400.0, 33.0),
        };
        var lines = new[] { "Line 1", "Line 2" };

        // Fixed seed → identical data every rebuild.
        var rng = new Random(20260908);
        var build = 1;
        const int perGroup = 8;

        double Jitter(double baseValue, double spread) => baseValue * (1 - spread + rng.NextDouble() * spread * 2);

        foreach (var (modelName, baseCost, baseHours) in models)
        {
            foreach (var lineName in lines)
            {
                // Line 2 runs a touch slower and reworks a little more than Line 1 — a visible gap
                // between the two lines' grouped figures.
                var slow = lineName == "Line 2";
                for (var i = 0; i < perGroup; i++)
                {
                    var hoursValue = Jitter(baseHours * (slow ? 1.08 : 1.0), 0.10);
                    var reworkValue = rng.Next(0, slow ? 5 : 3);
                    AddRow(dataset, pending, new Dictionary<DatasetColumn, string>
                    {
                        [buildId] = $"PR-{build:0000}",
                        [model] = modelName,
                        [line] = lineName,
                        [cost] = Num(Math.Round(Jitter(baseCost, 0.08), 0)),
                        [hours] = Num(Math.Round(hoursValue, 1)),
                        [rework] = reworkValue.ToString(CultureInfo.InvariantCulture),
                    });
                    build++;
                }
            }
        }

        return dataset;
    }

    /// <summary>
    /// A pivot-table widget's config JSON, built once the dataset has a primary key. The dataset is
    /// referenced by that int id; the row-dimension and measure columns by their stable RefIds. Each
    /// measure carries an explicit header; a null measure column is a row count.
    /// </summary>
    private static string PivotConfigJson(
        string title, Dataset dataset, Guid[] rowFieldRefs,
        (Guid? Column, string Aggregate, string Label)[] measures)
    {
        var rows = string.Join(",", rowFieldRefs.Select(r => $"\"{r}\""));
        var measuresJson = string.Join(",", measures.Select(m =>
        {
            var column = m.Column is { } c ? $"\"{c}\"" : "null";
            return $$"""{"id":"{{Guid.NewGuid()}}","columnId":{{column}},"aggregate":"{{m.Aggregate}}","label":"{{m.Label}}"}""";
        }));
        return $$"""
            {"type":"pivotTable","title":"{{title}}","showTitle":true,
             "datasetId":{{dataset.Id}},
             "rowFields":[{{rows}}],
             "measures":[{{measuresJson}}],
             "showGrandTotal":true,"filter":null}
            """;
    }

    /// <summary>
    /// A bar-chart widget's config JSON, built once the dataset has a primary key. The dataset is
    /// referenced by that int id; the category and each measure by their stable RefIds.
    /// <paramref name="valueRefs"/> becomes the binding's <c>valueColumnIds</c> — one series per
    /// measure — with the first mirrored into <c>yColumnId</c> for single-measure readers. When
    /// <paramref name="stacked"/> a category's measures pile into one column, else they group side by side.
    /// </summary>
    private static string BarChartConfigJson(
        string title, Dataset dataset, Guid categoryRef, Guid[] valueRefs, string aggregate,
        bool stacked, bool horizontal, string yAxisLabel, Guid? seriesRef = null)
    {
        var bindingId = Guid.NewGuid();
        var valueIds = string.Join(",", valueRefs.Select(r => $"\"{r}\""));
        var series = seriesRef is { } s ? $"\"{s}\"" : "null";
        static string B(bool value) => value ? "true" : "false";
        return $$"""
            {"type":"barChart","title":"{{title}}","showTitle":true,
             "aggregate":"{{aggregate}}","stacked":{{B(stacked)}},"horizontal":{{B(horizontal)}},
             "bindings":[{"id":"{{bindingId}}","datasetId":{{dataset.Id}},"xColumnId":"{{categoryRef}}","yColumnId":"{{valueRefs[0]}}","valueColumnIds":[{{valueIds}}],"seriesColumnId":{{series}},"yAxisId":null,"label":"","color":null,"symbol":null,"dashStyle":null,"filter":null}],
             "yAxes":[{"id":"primary","label":"{{yAxisLabel}}","side":"left"}],
             "xAxisLabel":"","yAxisLabel":"{{yAxisLabel}}",
             "zoom":false,"showLegend":true,"pointSize":8,
             "showGridLines":true,"showValueLabels":false,
             "toleranceBands":[],"tooltipColumns":[]}
            """;
    }

    /// <summary>
    /// A box-plot widget's config JSON, built once the dataset has a primary key. The dataset is
    /// referenced by that int id; columns by their stable RefIds. A null <paramref name="seriesRef"/>
    /// plots one box per category; otherwise each category splits into a box per series value.
    /// </summary>
    private static string BoxPlotConfigJson(
        string title, Dataset dataset, Guid categoryRef, Guid valueRef, Guid? seriesRef, string whisker, string yAxisLabel,
        bool showMean = false, bool showSampleSize = false, bool showPoints = false, bool showCapability = false,
        string bandsJson = "[]")
    {
        var bindingId = Guid.NewGuid();
        var series = seriesRef is { } s ? $"\"{s}\"" : "null";
        static string B(bool value) => value ? "true" : "false";
        return $$"""
            {"type":"boxPlot","title":"{{title}}","showTitle":true,
             "bindings":[{"id":"{{bindingId}}","datasetId":{{dataset.Id}},"xColumnId":"{{categoryRef}}","yColumnId":"{{valueRef}}","seriesColumnId":{{series}},"yAxisId":null,"label":"","color":null,"symbol":null,"dashStyle":null,"filter":null}],
             "yAxes":[{"id":"primary","label":"{{yAxisLabel}}","side":"left"}],
             "xAxisLabel":"","yAxisLabel":"{{yAxisLabel}}",
             "zoom":false,"showLegend":true,"pointSize":8,
             "showGridLines":true,"showValueLabels":false,
             "toleranceBands":{{bandsJson}},"tooltipColumns":[],
             "whisker":"{{whisker}}","whiskerFactor":1.5,"sort":"category",
             "showMean":{{B(showMean)}},"showSampleSize":{{B(showSampleSize)}},"showPoints":{{B(showPoints)}},"showCapability":{{B(showCapability)}},
             "horizontal":false}
            """;
    }

    /// <summary>
    /// A single tolerance band pointing at the spec row's LSL/USL columns, shaded and set to outline
    /// out-of-spec marks. Built once the limits dataset has its <paramref name="specDatasetId"/>. The
    /// band sits on the value axis for a box plot (<paramref name="axis"/> "y"); a histogram passes
    /// "x" so the lines fall on the binned variable it plots along.
    /// </summary>
    private static string SpecBandJson(int specDatasetId, Guid rowRef, Guid minRef, Guid maxRef, string axis = "y")
    {
        var bandId = Guid.NewGuid();
        return $$"""
            [{"id":"{{bandId}}","axis":"{{axis}}","yAxisId":null,"sourceDatasetId":{{specDatasetId}},"sourceRowId":"{{rowRef}}","minColumnId":"{{minRef}}","maxColumnId":"{{maxRef}}","fill":true,"outlinePoints":true}]
            """;
    }

    /// <summary>
    /// The feature-tour report: one engine-build dataset (plus a one-row clearance spec) laid out across
    /// four tabs so every widget and option is on show. Tab 1 pairs a full data table with a
    /// widget-filtered table and a pivot; tab 2 the point charts (a series-split scatter with tooltip
    /// columns, a colour-by-value scatter, and a line with a spec band); tab 3 a grouped bar and the
    /// combination chart (bars + a line on a second axis); tab 4 a box plot and a histogram, both against
    /// the clearance spec. A report-level filter drops the R&D-bench builds from every widget.
    /// </summary>
    private static Report BuildFeatureShowcaseReport(
        List<PendingCell> pending, List<PendingTable> pendingTables, List<PendingChart> pendingCharts,
        List<Action> pendingFilters, int number)
    {
        var now = DateTime.UtcNow;
        var report = new Report
        {
            RefId = Guid.NewGuid(),
            Number = number,
            Name = "Engine Build — Feature Tour",
            CreatedAt = now,
            UpdatedAt = now,
        };

        var revision = new ReportRevision { RefId = Guid.NewGuid(), Kind = RevisionKind.Draft, CreatedAt = now };
        var dataset = BuildEngineBuildLog(pending);
        revision.Datasets.Add(dataset);

        // A one-row limits dataset gives the clearance charts their spec band (LSL/USL) — the reference
        // the box plot's capability figures, the histogram's spec lines, and the line's band read against.
        var specRowRef = Guid.NewGuid();
        var spec = new Dataset
        {
            Name = "Bearing Clearance Spec",
            DatasetSourceId = DatasetSourceIds.Assembly,
            SourceConfigJson = "{\"source\":\"assembly\",\"typeId\":7788,\"phaseIds\":[9]}",
        };
        var characteristic = Column(spec, "Characteristic", DatasetColumnType.String, 0);
        var lsl = Column(spec, "LSL", DatasetColumnType.Double, 1, Mm(4));
        var usl = Column(spec, "USL", DatasetColumnType.Double, 2, Mm(4));
        var specRow = new DatasetRow { RefId = specRowRef };
        spec.Rows.Add(specRow);
        pending.Add(new PendingCell(specRow, characteristic, "Main Bearing Clearance"));
        pending.Add(new PendingCell(specRow, lsl, Num(0.030)));
        pending.Add(new PendingCell(specRow, usl, Num(0.060)));
        revision.Datasets.Add(spec);

        Guid Ref(string columnName) => dataset.Columns.First(c => c.Name == columnName).RefId;
        var buildIdRef = Ref("Build ID");
        var engineRef = Ref("Engine Type");
        var lineRef = Ref("Assembly Line");
        var inspectorRef = Ref("Inspector");
        var dateRef = Ref("Build Date");
        var powerRef = Ref("Peak Power");
        var torqueRef = Ref("Peak Torque");
        var clearanceRef = Ref("Main Bearing Clearance");
        var costRef = Ref("Build Cost");
        var hoursRef = Ref("Build Hours");
        var reworkRef = Ref("Rework Count");

        // Report-level filter: the R&D-bench builds are excluded from every widget on the report — set
        // once the dataset has its int id (which the filter references).
        pendingFilters.Add(() => revision.FiltersJson =
            ReportFiltersJson((dataset.Id, FilterGroupJson("and", ConditionJson(lineRef, "notEquals", "R&D Bench")))));

        // ---- Tab 1: the data, as a table, a filtered table, and a pivot ----
        var overview = new Tab { RefId = Guid.NewGuid(), Name = "Build log", Order = 0 };
        revision.Tabs.Add(overview);
        overview.Widgets.Add(TitleWidget("Engine Build — Feature Tour", 0, 0, 48, 2));
        overview.Widgets.Add(ParagraphWidget(
            "One dataset of engine builds, shown through every widget and option the builder offers — a table and a pivot, each chart kind, tolerance bands, per-widget and report-level filters, dual axes, and four tabs.",
            0, 2, 48, 3));

        var logColumns = new[]
        {
            "Build ID", "Engine Type", "Assembly Line", "Inspector", "Build Date", "Peak Power",
            "Peak Torque", "Main Bearing Clearance", "Build Cost", "Build Hours", "Rework Count", "Passed",
        };
        var logTable = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.DataTable, X = 0, Y = 5, W = 48, H = 13, ConfigJson = "{}" };
        overview.Widgets.Add(logTable);
        pendingTables.Add(new PendingTable(logTable, dataset, "Engine build log", logColumns));

        // A widget-level filter: the same table narrowed to builds that needed rework.
        var reworkTable = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.DataTable, X = 0, Y = 18, W = 24, H = 11, ConfigJson = "{}" };
        overview.Widgets.Add(reworkTable);
        pendingCharts.Add(new PendingChart(reworkTable, () =>
            TableConfigJson("Builds needing rework", dataset,
                new[] { "Build ID", "Engine Type", "Assembly Line", "Rework Count", "Passed" },
                FilterGroupJson("and", ConditionJson(reworkRef, "greaterThan", "0")))));

        // A pivot rolling the builds up by engine then line, with one measure of each aggregate kind.
        (Guid? Column, string Aggregate, string Label)[] measures =
        [
            (null, "count", "Builds"),
            (costRef, "sum", "Total cost"),
            (hoursRef, "average", "Avg hours"),
            (reworkRef, "max", "Worst rework"),
        ];
        var pivot = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.PivotTable, X = 24, Y = 18, W = 24, H = 11, ConfigJson = "{}" };
        overview.Widgets.Add(pivot);
        pendingCharts.Add(new PendingChart(pivot, () =>
            PivotConfigJson("Builds by engine & line", dataset, [engineRef, lineRef], measures)));

        // ---- Tab 2: the point charts ----
        var trends = new Tab { RefId = Guid.NewGuid(), Name = "Trends", Order = 1 };
        revision.Tabs.Add(trends);
        trends.Widgets.Add(TitleWidget("Performance trends", 0, 0, 48, 2));

        // Scatter: power against torque, one colour per engine type, with extra tooltip columns and zoom.
        var scatter = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.ScatterChart, X = 0, Y = 2, W = 24, H = 16, ConfigJson = "{}" };
        trends.Widgets.Add(scatter);
        pendingCharts.Add(new PendingChart(scatter, () =>
            PointChartConfigJson("scatterChart", "Power vs torque by engine",
                ChartBindingJson(dataset.Id, powerRef, yRef: torqueRef, seriesRef: engineRef),
                AxesJson(("primary", "Peak torque (Nm)", "left")),
                xAxisLabel: "Peak power (kW)",
                tooltipColumnsJson: TooltipColumnsJson(buildIdRef, inspectorRef),
                zoom: true)));

        // The same points coloured continuously by their torque value (an echarts visualMap).
        var heat = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.ScatterChart, X = 24, Y = 2, W = 24, H = 16, ConfigJson = "{}" };
        trends.Widgets.Add(heat);
        pendingCharts.Add(new PendingChart(heat, () =>
            PointChartConfigJson("scatterChart", "Torque shaded by value",
                ChartBindingJson(dataset.Id, powerRef, yRef: torqueRef),
                AxesJson(("primary", "Peak torque (Nm)", "left")),
                xAxisLabel: "Peak power (kW)", colorByValue: true, showLegend: false)));

        // A line over build date, split by line, with the clearance spec drawn across and out-of-spec
        // points outlined — a smoothed time series with a tolerance band.
        var line = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.LineChart, X = 0, Y = 18, W = 48, H = 11, ConfigJson = "{}" };
        trends.Widgets.Add(line);
        pendingCharts.Add(new PendingChart(line, () =>
            PointChartConfigJson("lineChart", "Bearing clearance over time",
                ChartBindingJson(dataset.Id, dateRef, yRef: clearanceRef, seriesRef: lineRef),
                AxesJson(("primary", "Clearance (mm)", "left")),
                xAxisLabel: "Build date",
                bandsJson: SpecBandJson(spec.Id, specRowRef, lsl.RefId, usl.RefId),
                smooth: true, showPoints: true)));

        // ---- Tab 3: the aggregating bar + the combination chart ----
        var costEffort = new Tab { RefId = Guid.NewGuid(), Name = "Cost & effort", Order = 2 };
        revision.Tabs.Add(costEffort);
        costEffort.Widgets.Add(TitleWidget("Cost & effort", 0, 0, 48, 2));

        // Grouped bar: average build cost per engine, split into a bar per assembly line.
        var bar = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.BarChart, X = 0, Y = 2, W = 24, H = 16, ConfigJson = "{}" };
        costEffort.Widgets.Add(bar);
        pendingCharts.Add(new PendingChart(bar, () =>
            BarChartConfigJson("Average build cost by engine", dataset, engineRef, [costRef], "average",
                stacked: false, horizontal: false, "Cost (£)", seriesRef: lineRef)));

        // The combination chart: average cost as bars on the left axis, average build hours as a line on
        // a second axis — two bindings, two value axes, one shared category.
        var combo = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.ComboChart, X = 24, Y = 2, W = 24, H = 16, ConfigJson = "{}" };
        costEffort.Widgets.Add(combo);
        pendingCharts.Add(new PendingChart(combo, () =>
            ComboChartConfigJson("Cost vs build hours by engine",
                string.Join(",",
                    ChartBindingJson(dataset.Id, engineRef, valueRefs: [costRef], renderAs: "bar", yAxisId: "primary", label: "Avg cost", color: "#2f6fed"),
                    ChartBindingJson(dataset.Id, engineRef, valueRefs: [hoursRef], renderAs: "line", yAxisId: "hours", label: "Avg hours", color: "#f97316")),
                AxesJson(("primary", "Cost (£)", "left"), ("hours", "Build hours", "right")),
                xAxisLabel: "", aggregate: "average", stacked: false, smooth: true, showPoints: true, areaFill: false)));

        // ---- Tab 4: the distribution charts ----
        var quality = new Tab { RefId = Guid.NewGuid(), Name = "Quality", Order = 3 };
        revision.Tabs.Add(quality);
        quality.Widgets.Add(TitleWidget("Quality & capability", 0, 0, 48, 2));

        // Box plot: clearance spread per engine, against the spec band, with mean, sample size, and Cp/Cpk.
        var box = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.BoxPlot, X = 0, Y = 2, W = 24, H = 16, ConfigJson = "{}" };
        quality.Widgets.Add(box);
        pendingCharts.Add(new PendingChart(box, () =>
            BoxPlotConfigJson("Bearing clearance by engine", dataset, engineRef, clearanceRef, null, "tukey", "Clearance (mm)",
                showMean: true, showSampleSize: true, showCapability: true,
                bandsJson: SpecBandJson(spec.Id, specRowRef, lsl.RefId, usl.RefId))));

        // Histogram: the pooled clearance distribution with the spec drawn across the binned axis.
        var histogram = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.Histogram, X = 24, Y = 2, W = 24, H = 16, ConfigJson = "{}" };
        quality.Widgets.Add(histogram);
        pendingCharts.Add(new PendingChart(histogram, () =>
            HistogramConfigJson("Bearing clearance distribution", dataset, clearanceRef, null, "Clearance (mm)", "Number of builds",
                binMode: "count", binCount: 24, normalize: "count",
                bandsJson: SpecBandJson(spec.Id, specRowRef, lsl.RefId, usl.RefId, axis: "x"))));

        report.Revisions.Add(revision);
        return report;
    }

    /// <summary>
    /// The dataset behind the feature tour: one row per engine build, tagged with its engine type and
    /// assembly line, carrying performance (power, torque), a machined clearance, cost and effort, a
    /// rework count and a pass flag. Larger engines make more power and cost more; Line 2 runs slower
    /// and reworks more; clearance is a believable spread whose tails cross the spec. A handful of
    /// R&D-bench builds are included for the report-level filter to exclude. Deterministic RNG seed.
    /// </summary>
    private static Dataset BuildEngineBuildLog(List<PendingCell> pending)
    {
        var dataset = new Dataset
        {
            Name = "Engine Build Log",
            DatasetSourceId = DatasetSourceIds.Assembly,
            SourceConfigJson = "{\"source\":\"assembly\",\"typeId\":4471,\"phaseIds\":[1,2,3,4]}",
        };

        var buildId = Column(dataset, "Build ID", DatasetColumnType.String, 0);
        var engine = Column(dataset, "Engine Type", DatasetColumnType.String, 1);
        var line = Column(dataset, "Assembly Line", DatasetColumnType.String, 2);
        var inspector = Column(dataset, "Inspector", DatasetColumnType.String, 3);
        var buildDate = Column(dataset, "Build Date", DatasetColumnType.DateTime, 4, "{\"dateFormat\":\"d MMM yyyy\"}");
        var power = Column(dataset, "Peak Power", DatasetColumnType.Double, 5, "{\"decimals\":1,\"suffix\":\" kW\"}");
        var torque = Column(dataset, "Peak Torque", DatasetColumnType.Double, 6, "{\"decimals\":1,\"suffix\":\" Nm\"}");
        var clearance = Column(dataset, "Main Bearing Clearance", DatasetColumnType.Double, 7, Mm(4));
        var cost = Column(dataset, "Build Cost", DatasetColumnType.Double, 8, Gbp);
        var hours = Column(dataset, "Build Hours", DatasetColumnType.Double, 9, "{\"decimals\":1,\"suffix\":\" h\"}");
        var rework = Column(dataset, "Rework Count", DatasetColumnType.Int, 10);
        var passed = Column(dataset, "Passed", DatasetColumnType.Bool, 11, "{\"trueLabel\":\"Pass\",\"falseLabel\":\"Fail\"}");

        // (engine, power kW, torque Nm, cost £, hours, clearance mean mm, clearance sd mm)
        var engines = new[]
        {
            ("I4 2.0L", 150.0, 280.0, 3600.0, 18.0, 0.045, 0.006),
            ("I6 3.0L", 230.0, 440.0, 5200.0, 24.0, 0.046, 0.007),
            ("V8 5.0L", 330.0, 610.0, 8400.0, 33.0, 0.048, 0.008),
            ("V12 6.5L", 480.0, 810.0, 12000.0, 40.0, 0.044, 0.005),
        };
        var lines = new[] { "Line 1", "Line 2" };
        var inspectors = new[] { "A. Whitfield", "R. Okafor", "M. Lindqvist", "S. Bhandari" };

        var rng = new Random(20260913);
        var start = new DateTime(2026, 1, 6);
        var build = 1;
        var day = 0;
        const int perGroup = 6;

        double NextNormal()
        {
            var u1 = 1.0 - rng.NextDouble();
            var u2 = 1.0 - rng.NextDouble();
            return Math.Sqrt(-2.0 * Math.Log(u1)) * Math.Cos(2.0 * Math.PI * u2);
        }

        void Emit(string engineName, string lineName, double basePower, double baseTorque, double baseCost,
            double baseHours, double clearMean, double clearSd)
        {
            var slow = lineName == "Line 2";
            var bench = lineName == "R&D Bench";
            var powerValue = basePower * (0.96 + rng.NextDouble() * 0.08);
            // Torque tracks power at roughly a fixed ratio, with a little independent scatter.
            var torqueValue = powerValue * (baseTorque / basePower) * (0.97 + rng.NextDouble() * 0.06);
            var clearValue = Math.Clamp(clearMean + clearSd * NextNormal(), 0.025, 0.072);
            var reworkValue = bench ? rng.Next(2, 6) : rng.Next(0, slow ? 5 : 3);
            var inSpec = clearValue is >= 0.030 and <= 0.060;
            AddRow(dataset, pending, new Dictionary<DatasetColumn, string>
            {
                [buildId] = $"EB-{build:0000}",
                [engine] = engineName,
                [line] = lineName,
                [inspector] = inspectors[build % inspectors.Length],
                [buildDate] = Iso(start.AddDays(day)),
                [power] = Num(Math.Round(powerValue, 1)),
                [torque] = Num(Math.Round(torqueValue, 1)),
                [clearance] = Num(Math.Round(clearValue, 4)),
                [cost] = Num(Math.Round(baseCost * (0.94 + rng.NextDouble() * 0.12), 0)),
                [hours] = Num(Math.Round(baseHours * (slow ? 1.08 : 1.0) * (0.92 + rng.NextDouble() * 0.16), 1)),
                [rework] = reworkValue.ToString(CultureInfo.InvariantCulture),
                [passed] = (inSpec && reworkValue <= 2).ToString(CultureInfo.InvariantCulture),
            });
            build++;
            day += 2;
        }

        foreach (var (engineName, basePower, baseTorque, baseCost, baseHours, clearMean, clearSd) in engines)
        {
            foreach (var lineName in lines)
            {
                for (var i = 0; i < perGroup; i++)
                {
                    Emit(engineName, lineName, basePower, baseTorque, baseCost, baseHours, clearMean, clearSd);
                }
            }
        }

        // A few R&D-bench builds the report-level filter excludes — wide, rough prototypes.
        for (var i = 0; i < 4; i++)
        {
            Emit("V8 5.0L", "R&D Bench", 330.0, 610.0, 8400.0, 33.0, 0.050, 0.014);
        }

        return dataset;
    }

    /// <summary>
    /// The cross-reference report: three engine-build-related datasets — builds, dyno test runs, and
    /// concessions — all keyed on Job Number, laid out as three tables plus a two-dataset overlay chart.
    /// A single report-level filter (expressed once per dataset, since only <see cref="BuildEngineBuilds"/>
    /// carries an "Engine Type" column) restricts every widget to the same subset of builds.
    /// </summary>
    private static Report BuildCrossReferenceReport(
        List<PendingCell> pending, List<PendingTable> pendingTables, List<PendingChart> pendingCharts,
        List<Action> pendingFilters, int number)
    {
        var now = DateTime.UtcNow;
        var report = new Report
        {
            RefId = Guid.NewGuid(),
            Number = number,
            Name = "Engine Build Cross-Reference",
            CreatedAt = now,
            UpdatedAt = now,
        };

        var revision = new ReportRevision { RefId = Guid.NewGuid(), Kind = RevisionKind.Draft, CreatedAt = now };

        var builds = BuildEngineBuilds(pending);
        revision.Datasets.Add(builds);
        var testRuns = BuildTestRuns(pending);
        revision.Datasets.Add(testRuns);
        var concessions = BuildEngineConcessions(pending);
        revision.Datasets.Add(concessions);

        Guid BuildsRef(string n) => builds.Columns.First(c => c.Name == n).RefId;
        Guid RunsRef(string n) => testRuns.Columns.First(c => c.Name == n).RefId;
        Guid ConcRef(string n) => concessions.Columns.First(c => c.Name == n).RefId;

        // The V8 5.0L and V12 6.5L builds — the same restriction expressed once per dataset, by
        // whichever column that dataset carries: Engine Builds has "Engine Type" directly, while the
        // other two only share "Job Number" with it, so the equivalent job numbers stand in there.
        var v8V12JobNumbers = new[]
        {
            "JOB-2026-0141", "JOB-2026-0142", "JOB-2026-0148", "JOB-2026-0173", "JOB-2026-0180",
        };
        pendingFilters.Add(() => revision.FiltersJson = ReportFiltersJson(
            (builds.Id, FilterGroupJson("and", ConditionJson(BuildsRef("Engine Type"), "in", "V8 5.0L", "V12 6.5L"))),
            (testRuns.Id, FilterGroupJson("and", ConditionJson(RunsRef("Job Number"), "in", v8V12JobNumbers))),
            (concessions.Id, FilterGroupJson("and", ConditionJson(ConcRef("Job Number"), "in", v8V12JobNumbers)))));

        var tab = new Tab { RefId = Guid.NewGuid(), Name = "Cross-reference", Order = 0 };
        revision.Tabs.Add(tab);

        tab.Widgets.Add(TitleWidget("Engine Build Cross-Reference", 0, 0, 48, 2));
        tab.Widgets.Add(ParagraphWidget(
            "Three datasets keyed on Job Number — builds, dyno test runs, and concessions — each shown in its own table below. One report-level filter narrows all three to the V8 5.0L and V12 6.5L builds at once, dropping the I6 3.0L rows from every table and from the chart's two overlaid series alike.",
            0, 2, 48, 3));

        var buildColumns = new[]
        {
            "Job Number", "Serial Number", "Engine Type", "Inspector", "Build Date", "Main Bearing Clearance", "Rework Count",
        };
        var buildsTable = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.DataTable, X = 0, Y = 5, W = 48, H = 9, ConfigJson = "{}" };
        tab.Widgets.Add(buildsTable);
        pendingTables.Add(new PendingTable(buildsTable, builds, "Engine builds", buildColumns));

        var runColumns = new[] { "Job Number", "Serial Number", "Test Cell", "Run Date", "Peak Power", "Peak Torque", "Passed" };
        var runsTable = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.DataTable, X = 0, Y = 14, W = 24, H = 9, ConfigJson = "{}" };
        tab.Widgets.Add(runsTable);
        pendingTables.Add(new PendingTable(runsTable, testRuns, "Dyno test runs", runColumns));

        var concColumns = new[] { "Job Number", "Serial Number", "Concession Date", "Category", "Raised By", "Cost Impact", "Status" };
        var concTable = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.DataTable, X = 24, Y = 14, W = 24, H = 9, ConfigJson = "{}" };
        tab.Widgets.Add(concTable);
        pendingTables.Add(new PendingTable(concTable, concessions, "Concessions", concColumns));

        // The overlay chart: bearing clearance from the builds dataset and peak power from the
        // test-run dataset, each on its own date column and value axis — one chart pulling series
        // from two different datasets, both narrowed by the same report-level filter above.
        var overlay = new Widget { RefId = Guid.NewGuid(), Type = WidgetType.LineChart, X = 0, Y = 23, W = 48, H = 12, ConfigJson = "{}" };
        tab.Widgets.Add(overlay);
        pendingCharts.Add(new PendingChart(overlay, () =>
            PointChartConfigJson("lineChart", "Clearance vs peak power over time",
                string.Join(",",
                    ChartBindingJson(builds.Id, BuildsRef("Build Date"), yRef: BuildsRef("Main Bearing Clearance"),
                        yAxisId: "primary", label: "Bearing clearance", color: "#2f6fed"),
                    ChartBindingJson(testRuns.Id, RunsRef("Run Date"), yRef: RunsRef("Peak Power"),
                        yAxisId: "power", label: "Peak power", color: "#f97316")),
                AxesJson(("primary", "Clearance (mm)", "left"), ("power", "Peak power (kW)", "right")),
                xAxisLabel: "Date", smooth: true, showPoints: true)));

        report.Revisions.Add(revision);
        return report;
    }

    /// <summary>
    /// A per-concession dataset built for the cross-reference report: one row per rework concession
    /// raised against a build, keyed by the same Job Number as <see cref="BuildEngineBuilds"/> and
    /// <see cref="BuildTestRuns"/> so the three read as one build campaign viewed three ways. Only the
    /// builds that actually needed rework get a row here.
    /// </summary>
    private static Dataset BuildEngineConcessions(List<PendingCell> pending)
    {
        var dataset = new Dataset
        {
            Name = "Engine Concessions",
            DatasetSourceId = DatasetSourceIds.Assembly,
            SourceConfigJson = "{\"source\":\"assembly\",\"typeId\":4471,\"phaseIds\":[10]}",
        };

        var job = Column(dataset, "Job Number", DatasetColumnType.String, 0);
        var serial = Column(dataset, "Serial Number", DatasetColumnType.String, 1);
        var raisedDate = Column(dataset, "Concession Date", DatasetColumnType.DateTime, 2, "{\"dateFormat\":\"d MMM yyyy\"}");
        var category = Column(dataset, "Category", DatasetColumnType.String, 3);
        var raisedBy = Column(dataset, "Raised By", DatasetColumnType.String, 4);
        var cost = Column(dataset, "Cost Impact", DatasetColumnType.Double, 5, Gbp);
        var status = Column(dataset, "Status", DatasetColumnType.Bool, 6, "{\"trueLabel\":\"Closed\",\"falseLabel\":\"Open\"}");

        var rows = new[]
        {
            ("JOB-2026-0142", "ENG-SN-88202", new DateTime(2026, 1, 25), "Main bearing rework", "A. Whitfield", 380.0, true),
            ("JOB-2026-0148", "ENG-SN-88213", new DateTime(2026, 2, 6), "Piston clearance rework", "R. Okafor", 610.0, false),
            ("JOB-2026-0168", "ENG-SN-88240", new DateTime(2026, 3, 24), "Big end rework", "M. Lindqvist", 540.0, true),
            ("JOB-2026-0173", "ENG-SN-88252", new DateTime(2026, 4, 6), "Deck height rework", "S. Bhandari", 720.0, false),
            ("JOB-2026-0180", "ENG-SN-88263", new DateTime(2026, 4, 27), "Main bearing rework", "S. Bhandari", 690.0, true),
        };

        foreach (var r in rows)
        {
            AddRow(dataset, pending, new Dictionary<DatasetColumn, string>
            {
                [job] = r.Item1,
                [serial] = r.Item2,
                [raisedDate] = Iso(r.Item3),
                [category] = r.Item4,
                [raisedBy] = r.Item5,
                [cost] = Num(r.Item6),
                [status] = r.Item7.ToString(CultureInfo.InvariantCulture),
            });
        }

        return dataset;
    }

    /// <summary>A paragraph of body text — a smaller, unweighted static-text widget for a report's intro.</summary>
    private static Widget ParagraphWidget(string text, int x, int y, int w, int h) => new()
    {
        RefId = Guid.NewGuid(),
        Type = WidgetType.StaticText,
        X = x,
        Y = y,
        W = w,
        H = h,
        ConfigJson = $$"""
            {"type":"staticText","title":"Text","showTitle":false,
             "content":"{{text}}","fontSize":14,"fontWeight":"normal",
             "italic":false,"underline":false,"strikethrough":false,"lineHeight":1.4,
             "color":"#475569","backgroundColor":null,"textAlign":"left","verticalAlign":"top",
             "wrap":true,"padding":8}
            """,
    };

    /// <summary>
    /// One chart series binding as JSON. A point binding passes <paramref name="yRef"/> (its Y column);
    /// a bar/combo binding passes <paramref name="valueRefs"/> (its measures), the first mirrored into
    /// <c>yColumnId</c>. <paramref name="renderAs"/> ("bar"/"line") is only read by the combination chart;
    /// <paramref name="yAxisId"/> assigns the series to one of the chart's value axes.
    /// </summary>
    private static string ChartBindingJson(
        int datasetId, Guid xRef, Guid? yRef = null, Guid[]? valueRefs = null, Guid? seriesRef = null,
        string? renderAs = null, string? yAxisId = null, string label = "", string? color = null,
        string? symbol = null, string? dashStyle = null, string filterJson = "null")
    {
        static string Q(string? s) => s is null ? "null" : $"\"{s}\"";
        static string G(Guid? g) => g is { } v ? $"\"{v}\"" : "null";
        var values = valueRefs is { Length: > 0 }
            ? "[" + string.Join(",", valueRefs.Select(r => $"\"{r}\"")) + "]"
            : "null";
        var yColumn = valueRefs is { Length: > 0 } ? G(valueRefs[0]) : G(yRef);
        return $$"""
            {"id":"{{Guid.NewGuid()}}","datasetId":{{datasetId}},"xColumnId":"{{xRef}}","yColumnId":{{yColumn}},"valueColumnIds":{{values}},"seriesColumnId":{{G(seriesRef)}},"renderAs":{{Q(renderAs)}},"yAxisId":{{Q(yAxisId)}},"label":"{{label}}","color":{{Q(color)}},"symbol":{{Q(symbol)}},"dashStyle":{{Q(dashStyle)}},"filter":{{filterJson}}}
            """;
    }

    /// <summary>The chart's value (Y) axes as JSON — one entry each, in order, the first being the primary.</summary>
    private static string AxesJson(params (string Id, string Label, string Side)[] axes)
        => "[" + string.Join(",", axes.Select(a => $$"""{"id":"{{a.Id}}","label":"{{a.Label}}","side":"{{a.Side}}"}""")) + "]";

    /// <summary>The point chart's extra tooltip columns as JSON, by their stable column RefIds.</summary>
    private static string TooltipColumnsJson(params Guid[] refs)
        => "[" + string.Join(",", refs.Select(r => $$"""{"columnId":"{{r}}"}""")) + "]";

    /// <summary>
    /// A scatter or line chart's config JSON. Bindings and axes are pre-built (so callers can overlay
    /// several datasets or add axes); line-only options are emitted only for a line chart.
    /// </summary>
    private static string PointChartConfigJson(
        string type, string title, string bindingsJson, string yAxesJson, string xAxisLabel,
        string tooltipColumnsJson = "[]", string bandsJson = "[]", bool colorByValue = false,
        bool zoom = true, bool showLegend = true, bool smooth = false, bool showPoints = true, bool areaFill = false)
    {
        static string B(bool value) => value ? "true" : "false";
        var lineOpts = type == "lineChart"
            ? $",\"smooth\":{B(smooth)},\"showPoints\":{B(showPoints)},\"areaFill\":{B(areaFill)}"
            : "";
        return $$"""
            {"type":"{{type}}","title":"{{title}}","showTitle":true,
             "bindings":[{{bindingsJson}}],
             "yAxes":{{yAxesJson}},
             "xAxisLabel":"{{xAxisLabel}}","yAxisLabel":"",
             "zoom":{{B(zoom)}},"zoomY":false,"showLegend":{{B(showLegend)}},"pointSize":9,
             "showGridLines":true,"showValueLabels":false,"colorByValue":{{B(colorByValue)}},
             "toleranceBands":{{bandsJson}},"tooltipColumns":{{tooltipColumnsJson}}{{lineOpts}}}
            """;
    }

    /// <summary>
    /// A combination chart's config JSON. Bindings (each carrying its own <c>renderAs</c> and value axis)
    /// and the value axes are pre-built by the caller; the shared aggregate reduces every series' category.
    /// </summary>
    private static string ComboChartConfigJson(
        string title, string bindingsJson, string yAxesJson, string xAxisLabel, string aggregate,
        bool stacked, bool smooth, bool showPoints, bool areaFill, string bandsJson = "[]")
    {
        static string B(bool value) => value ? "true" : "false";
        return $$"""
            {"type":"comboChart","title":"{{title}}","showTitle":true,
             "aggregate":"{{aggregate}}","stacked":{{B(stacked)}},"smooth":{{B(smooth)}},"showPoints":{{B(showPoints)}},"areaFill":{{B(areaFill)}},
             "bindings":[{{bindingsJson}}],
             "yAxes":{{yAxesJson}},
             "xAxisLabel":"{{xAxisLabel}}","yAxisLabel":"",
             "zoom":false,"showLegend":true,"pointSize":9,
             "showGridLines":true,"showValueLabels":false,
             "toleranceBands":{{bandsJson}},"tooltipColumns":[]}
            """;
    }

    /// <summary>One filter condition as JSON — a column tested by an operator against zero or more values.</summary>
    private static string ConditionJson(Guid columnRef, string op, params string[] values)
    {
        var vals = string.Join(",", values.Select(v => $"\"{v}\""));
        return $$"""{"kind":"condition","columnId":"{{columnRef}}","operator":"{{op}}","values":[{{vals}}]}""";
    }

    /// <summary>A filter group as JSON — conditions joined by "and"/"or".</summary>
    private static string FilterGroupJson(string join, params string[] conditions)
        => $$"""{"kind":"group","join":"{{join}}","children":[{{string.Join(",", conditions)}}]}""";

    /// <summary>The revision's report-level filters as JSON — one filter group per dataset.</summary>
    private static string ReportFiltersJson(params (int DatasetId, string FilterGroup)[] filters)
        => "[" + string.Join(",", filters.Select(f => $$"""{"datasetId":{{f.DatasetId}},"filter":{{f.FilterGroup}}}""")) + "]";

    private static Report PublishedReport(
        int number, string name, Folder? folder, Func<List<PendingCell>, Dataset> datasetFactory,
        string[] columns, int versions, int daysAgo, List<PendingCell> pending, List<PendingTable> pendingTables)
    {
        var createdAt = DateTime.UtcNow.AddDays(-daysAgo - (versions - 1) * 3);
        var updatedAt = DateTime.UtcNow.AddDays(-daysAgo);
        var report = new Report
        {
            RefId = Guid.NewGuid(),
            Number = number,
            Name = name,
            Folder = folder,
            CreatedAt = createdAt,
            UpdatedAt = updatedAt,
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
            AddDataset(revision, pending, pendingTables, name, datasetFactory, columns);
            report.Revisions.Add(revision);
        }

        return report;
    }

    private static Report DraftReport(
        int number, string name, Folder? folder, Func<List<PendingCell>, Dataset> datasetFactory,
        string[] columns, int daysAgo, List<PendingCell> pending, List<PendingTable> pendingTables)
    {
        var createdAt = DateTime.UtcNow.AddDays(-daysAgo);
        var report = new Report
        {
            RefId = Guid.NewGuid(),
            Number = number,
            Name = name,
            Folder = folder,
            CreatedAt = createdAt,
            UpdatedAt = createdAt,
        };

        var draft = new ReportRevision { RefId = Guid.NewGuid(), Kind = RevisionKind.Draft, CreatedAt = createdAt };
        AddDataset(draft, pending, pendingTables, name, datasetFactory, columns);
        report.Revisions.Add(draft);

        return report;
    }

    private static Report PublishedWithDraftReport(
        int number, string name, Folder? folder, Func<List<PendingCell>, Dataset> datasetFactory,
        string[] columns, int versions, int daysAgo, List<PendingCell> pending, List<PendingTable> pendingTables)
    {
        var report = PublishedReport(number, name, folder, datasetFactory, columns, versions, daysAgo, pending, pendingTables);

        var draftCreatedAt = DateTime.UtcNow.AddDays(-1);
        var draft = new ReportRevision { RefId = Guid.NewGuid(), Kind = RevisionKind.Draft, CreatedAt = draftCreatedAt };
        AddDataset(draft, pending, pendingTables, name, datasetFactory, columns);
        report.Revisions.Add(draft);
        report.UpdatedAt = draftCreatedAt;

        return report;
    }

    /// <summary>A placeholder report with no revisions at all — never checked out, never published.</summary>
    private static Report EmptyReport(int number, string name, Folder? folder, int daysAgo)
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

    private static Widget TitleWidget(string text) => TitleWidget(text, 0, 0, 8, 1);

    private static Widget TitleWidget(string text, int x, int y, int w, int h) => new()
    {
        RefId = Guid.NewGuid(),
        Type = WidgetType.StaticText,
        X = x,
        Y = y,
        W = w,
        H = h,
        ConfigJson = $$"""
            {"type":"staticText","title":"Text","showTitle":false,
             "content":"{{text}}","fontSize":22,"fontWeight":"bold",
             "italic":false,"underline":false,"strikethrough":false,"lineHeight":1.2,
             "color":"#152a55","backgroundColor":null,"textAlign":"left","verticalAlign":"middle",
             "wrap":true,"padding":8}
            """,
    };

    /// <summary>
    /// The data-table config JSON, built once the dataset has a primary key. The dataset is
    /// referenced by that int id; columns are still referenced by their stable RefIds.
    /// </summary>
    private static string TableConfigJson(string title, Dataset dataset, string[] columnNames, string filterJson = "null")
    {
        var columnIds = columnNames
            .Select(name => dataset.Columns.First(c => c.Name == name).RefId)
            .Select(id => $"{{\"columnId\":\"{id}\",\"sortable\":true}}");

        return $$"""
            {"type":"dataTable","datasetId":{{dataset.Id}},"title":"{{title}}",
             "showTitle":true,"showColumnHeaders":true,"resizableColumns":true,
             "stripedRows":true,"showGridlines":false,"rowHover":true,"density":"compact",
             "paginator":false,"rowsPerPage":10,"emptyMessage":"No rows to display.",
             "filter":{{filterJson}},
             "columns":[{{string.Join(",", columnIds)}}],"sortColumnId":null,"sortDirection":"asc"}
            """;
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
            RefId = Guid.NewGuid(),
            Name = name,
            Type = type,
            Order = order,
            ConfigurationJson = configurationJson,
        };
        dataset.Columns.Add(column);
        return column;
    }

    private static void AddRow(Dataset dataset, List<PendingCell> pending, Dictionary<DatasetColumn, string> values)
    {
        var row = new DatasetRow { RefId = Guid.NewGuid() };
        dataset.Rows.Add(row);

        foreach (var (column, raw) in values)
        {
            pending.Add(new PendingCell(row, column, raw));
        }
    }

    /// <summary>Millimetre measurement formatting at the given precision.</summary>
    private static string Mm(int decimals) => $"{{\"decimals\":{decimals},\"suffix\":\" mm\"}}";

    /// <summary>Whole-pound currency formatting for the cost columns.</summary>
    private static string Gbp => "{\"decimals\":0,\"prefix\":\"£\"}";

    private static string Num(double value) => value.ToString("R", CultureInfo.InvariantCulture);

    private static string Iso(DateTime value) => value.ToString("O", CultureInfo.InvariantCulture);
}
