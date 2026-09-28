using Reporting.Abstractions;

namespace Reporting.DAL.Formulas.Analysis;

public static class FormulaErrors
{
    /// <summary>A problem at a place in the formula text.</summary>
    public static FormulaErrorDto At(string message, int position, int length)
    {
        return new FormulaErrorDto { Message = message, Position = position, Length = length };
    }
}
