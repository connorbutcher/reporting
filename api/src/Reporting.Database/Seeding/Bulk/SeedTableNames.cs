using Microsoft.EntityFrameworkCore;

namespace Reporting.Database;

/// <summary>The row and cell tables' names as EF maps them, quoted for raw SQL and SqlBulkCopy.</summary>
internal sealed class SeedTableNames
{
    public SeedTableNames(ReportingDbContext db)
    {
        Rows = Quoted(db, typeof(DatasetRow));
        Cells = Quoted(db, typeof(DatasetCell));
    }

    public string Rows { get; }

    public string Cells { get; }

    private static string Quoted(ReportingDbContext db, Type entity)
    {
        var type = db.Model.FindEntityType(entity)!;
        var schema = type.GetSchema() ?? "dbo";
        return $"[{schema}].[{type.GetTableName()}]";
    }
}
