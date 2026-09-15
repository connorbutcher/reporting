using Reporting.Abstractions;

namespace Reporting.DAL.Formulas;

public static class FormulaStaticKinds
{
    public static FormulaStaticKind ForColumnType(DatasetColumnType type) => type switch
    {
        DatasetColumnType.Int or DatasetColumnType.Double => FormulaStaticKind.Number,
        DatasetColumnType.Bool => FormulaStaticKind.Bool,
        DatasetColumnType.DateTime => FormulaStaticKind.Date,
        _ => FormulaStaticKind.String,
    };
}
