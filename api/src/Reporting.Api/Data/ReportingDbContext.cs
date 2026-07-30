using Microsoft.EntityFrameworkCore;
using Reporting.Api.Domain;

namespace Reporting.Api.Data;

public class ReportingDbContext : DbContext
{
    public ReportingDbContext(DbContextOptions<ReportingDbContext> options) : base(options)
    {
    }

    public DbSet<Report> Reports => Set<Report>();
    public DbSet<Widget> Widgets => Set<Widget>();
    public DbSet<Dataset> Datasets => Set<Dataset>();
    public DbSet<DatasetRecord> DatasetRecords => Set<DatasetRecord>();
    public DbSet<DatasetFieldValue> DatasetFieldValues => Set<DatasetFieldValue>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<Report>()
            .HasMany(r => r.Widgets)
            .WithOne(w => w.Report)
            .HasForeignKey(w => w.ReportId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<Widget>()
            .Property(w => w.Type)
            .HasConversion<string>();

        modelBuilder.Entity<Dataset>()
            .HasMany(d => d.Records)
            .WithOne(r => r.Dataset)
            .HasForeignKey(r => r.DatasetId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DatasetRecord>()
            .HasMany(r => r.Fields)
            .WithOne(f => f.Record)
            .HasForeignKey(f => f.RecordId)
            .OnDelete(DeleteBehavior.Cascade);

        modelBuilder.Entity<DatasetFieldValue>()
            .Property(f => f.DataType)
            .HasConversion<string>();

        // Real TPH discriminator column, kept separate from the domain-facing DataType
        // enum so DataType stays a plain data column set by each derived type's constructor.
        modelBuilder.Entity<DatasetFieldValue>()
            .HasDiscriminator<string>("Discriminator")
            .HasValue<StringFieldValue>(nameof(StringFieldValue))
            .HasValue<IntFieldValue>(nameof(IntFieldValue))
            .HasValue<DoubleFieldValue>(nameof(DoubleFieldValue))
            .HasValue<BoolFieldValue>(nameof(BoolFieldValue))
            .HasValue<DateTimeFieldValue>(nameof(DateTimeFieldValue));
    }
}
