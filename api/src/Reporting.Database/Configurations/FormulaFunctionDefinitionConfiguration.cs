using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Reporting.Database;

public class FormulaFunctionDefinitionConfiguration : IEntityTypeConfiguration<FormulaFunctionDefinition>
{
    public void Configure(EntityTypeBuilder<FormulaFunctionDefinition> builder)
    {
        builder.Property(f => f.Category).HasConversion<string>();
        builder.Property(f => f.ReturnKind).HasConversion<string>();
        builder.Property(f => f.Name).HasMaxLength(64);
        builder.Property(f => f.ImplementationKey).HasMaxLength(64);
        builder.HasIndex(f => f.Name).IsUnique();

        builder.HasMany(f => f.Parameters)
            .WithOne(p => p.FormulaFunctionDefinition)
            .HasForeignKey(p => p.FormulaFunctionDefinitionId)
            .OnDelete(DeleteBehavior.Cascade);

        builder.HasData(FormulaFunctionSeedData.Rows().Functions);
    }
}
