using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Reporting.Database;

public class FormulaFunctionParameterConfiguration : IEntityTypeConfiguration<FormulaFunctionParameter>
{
    public void Configure(EntityTypeBuilder<FormulaFunctionParameter> builder)
    {
        builder.Property(p => p.Kind).HasConversion<string>();
        builder.Property(p => p.Name).HasMaxLength(64);
        builder.HasIndex(p => new { p.FormulaFunctionDefinitionId, p.Position }).IsUnique();
        builder.HasData(FormulaFunctionSeedData.Rows().Parameters);
    }
}
