using Microsoft.EntityFrameworkCore;
using Reporting.Api.Domain;

namespace Reporting.Api.Data;

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

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
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
    }
}
