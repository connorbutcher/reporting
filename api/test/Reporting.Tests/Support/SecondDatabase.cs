using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Reporting.Database;

namespace Reporting.Tests;

/// <summary>Another in-memory SQLite database, for comparing two independent seeds.</summary>
public sealed class SecondDatabase : IDisposable
{
    private readonly SqliteConnection _connection;

    public SecondDatabase()
    {
        _connection = new SqliteConnection("DataSource=:memory:");
        _connection.Open();
        Context = new ReportingDbContext(new DbContextOptionsBuilder<ReportingDbContext>().UseSqlite(_connection).Options);
        Context.Database.EnsureCreated();
    }

    public ReportingDbContext Context { get; }

    public void Dispose()
    {
        Context.Dispose();
        _connection.Dispose();
    }
}
