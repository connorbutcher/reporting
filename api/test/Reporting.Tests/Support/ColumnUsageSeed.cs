using Reporting.Database;

namespace Reporting.Tests;

public sealed record ColumnUsageSeed(ReportRevision Draft, Dataset Data, Tab Tab);
