using Reporting.Abstractions;
using Reporting.DAL.Formulas.Evaluation;

namespace Reporting.DAL.Formulas.Planning;

public static class FormulaOutcomeFit
{
    /// <summary>Shapes a computed value to its column's type, so dependents see what the stored cell would hold.</summary>
    public static FormulaOutcome To(object? value, DatasetColumnType type)
    {
        if (value is null)
        {
            return new FormulaOutcome(null, null);
        }

        switch (type)
        {
            case DatasetColumnType.String:
                return new FormulaOutcome(FormulaValueText.ToText(value), null);
            case DatasetColumnType.Int when value is double number:
                return new FormulaOutcome(Math.Round(number, MidpointRounding.AwayFromZero), null);
        }

        if (FormulaValueKinds.Matches(value, FormulaValueKinds.KindOf(type)))
        {
            return new FormulaOutcome(value, null);
        }

        return new FormulaOutcome(
            null, $"The formula produced {FormulaValueText.Describe(value)}, which doesn't fit a {type} column.");
    }
}
