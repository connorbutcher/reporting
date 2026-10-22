namespace Reporting.Database;

/// <summary>Writes a generated dataset's rows and cells once the dataset and its columns have ids.</summary>
internal interface ISeedRowWriter
{
    void Write(ReportingDbContext db, ISeedRowSource source);
}
