using Microsoft.EntityFrameworkCore;

namespace Reporting.Database;

public class ReportingDbContext : DbContext
{
    public ReportingDbContext(DbContextOptions<ReportingDbContext> options) : base(options)
    {
    }

    public DbSet<Folder> Folders => Set<Folder>();
    public DbSet<Report> Reports => Set<Report>();
    public DbSet<ReportRevision> ReportRevisions => Set<ReportRevision>();
    public DbSet<Widget> Widgets => Set<Widget>();
    public DbSet<Dataset> Datasets => Set<Dataset>();
    public DbSet<DatasetColumn> DatasetColumns => Set<DatasetColumn>();
    public DbSet<DatasetRow> DatasetRows => Set<DatasetRow>();
    public DbSet<DatasetCell> DatasetCells => Set<DatasetCell>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Every entity keeps a stable Guid RefId as its external/logical key, unique so it can be
        // looked up like the old primary key. Widget is the exception (handled below): its RefId is
        // preserved across version copies, so it repeats and is only unique within a revision.
        modelBuilder.Entity<Folder>().HasIndex(f => f.RefId).IsUnique();
        modelBuilder.Entity<Report>().HasIndex(r => r.RefId).IsUnique();
        modelBuilder.Entity<ReportRevision>().HasIndex(rv => rv.RefId).IsUnique();
        modelBuilder.Entity<Dataset>().HasIndex(d => d.RefId).IsUnique();
        modelBuilder.Entity<DatasetColumn>().HasIndex(c => c.RefId).IsUnique();
        modelBuilder.Entity<DatasetRow>().HasIndex(r => r.RefId).IsUnique();

        modelBuilder.Entity<Folder>()
            .HasOne(f => f.ParentFolder)
            .WithMany()
            .HasForeignKey(f => f.ParentFolderId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Report>()
            .HasIndex(r => r.Number)
            .IsUnique();

        modelBuilder.Entity<Report>()
            .HasOne(r => r.Folder)
            .WithMany()
            .HasForeignKey(r => r.FolderId)
            .OnDelete(DeleteBehavior.Restrict);

        modelBuilder.Entity<Report>()
            .HasMany(r => r.Revisions)
            .WithOne(rv => rv.Report)
            .HasForeignKey(rv => rv.ReportId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<ReportRevision>()
            .Property(rv => rv.Columns)
            .HasDefaultValue(12);

        modelBuilder.Entity<ReportRevision>()
            .Property(rv => rv.Rows)
            .HasDefaultValue(10);

        modelBuilder.Entity<ReportRevision>()
            .Property(rv => rv.Kind)
            .HasConversion<string>();

        modelBuilder.Entity<ReportRevision>()
            .HasMany(rv => rv.Widgets)
            .WithOne(w => w.ReportRevision)
            .HasForeignKey(w => w.ReportRevisionId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Widget>()
            .Property(w => w.Type)
            .HasConversion<string>();

        // A widget's RefId is stable across versions, so it repeats across revisions of a report —
        // unique only within a single revision, which is all the client's per-revision diff needs.
        modelBuilder.Entity<Widget>()
            .HasIndex(w => new { w.ReportRevisionId, w.RefId })
            .IsUnique();

        modelBuilder.Entity<Dataset>()
            .HasMany(d => d.Columns)
            .WithOne(c => c.Dataset)
            .HasForeignKey(c => c.DatasetId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Dataset>()
            .HasMany(d => d.Rows)
            .WithOne(r => r.Dataset)
            .HasForeignKey(r => r.DatasetId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DatasetColumn>()
            .Property(c => c.Type)
            .HasConversion<string>();

        modelBuilder.Entity<DatasetRow>()
            .HasMany(r => r.Cells)
            .WithOne(c => c.Row)
            .HasForeignKey(c => c.RowId)
            .OnDelete(DeleteBehavior.Cascade);

        // A row holds at most one cell per column.
        modelBuilder.Entity<DatasetCell>()
            .HasIndex(c => new { c.RowId, c.ColumnId })
            .IsUnique();

        // Filters always narrow by column first, then compare one typed value, so
        // each index leads with ColumnId.
        modelBuilder.Entity<DatasetCell>().HasIndex(c => new { c.ColumnId, c.NumberValue });
        modelBuilder.Entity<DatasetCell>().HasIndex(c => new { c.ColumnId, c.DateValue });
        modelBuilder.Entity<DatasetCell>().HasIndex(c => new { c.ColumnId, c.StringValue });
    }
}
