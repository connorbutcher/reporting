namespace Reporting.DAL.Formulas.Evaluation;

/// <summary>Equality and ordering across the value kinds.</summary>
public static class FormulaValueComparison
{
    /// <summary>Equality across the value kinds. Text ignores case; values of different kinds are never equal.</summary>
    public static bool AreEqual(object left, object right)
    {
        switch (left)
        {
            case string leftText when right is string rightText:
                return string.Equals(leftText, rightText, StringComparison.OrdinalIgnoreCase);
            case double leftNumber when right is double rightNumber:
                return leftNumber == rightNumber;
            case bool leftFlag when right is bool rightFlag:
                return leftFlag == rightFlag;
            case DateTime leftDate when right is DateTime rightDate:
                return leftDate == rightDate;
            default:
                return false;
        }
    }

    /// <summary>Ordering across the value kinds; both sides must be the same kind (and not bool).</summary>
    public static int Compare(object left, object right)
    {
        switch (left)
        {
            case string leftText when right is string rightText:
                return string.Compare(leftText, rightText, StringComparison.OrdinalIgnoreCase);
            case double leftNumber when right is double rightNumber:
                return leftNumber.CompareTo(rightNumber);
            case DateTime leftDate when right is DateTime rightDate:
                return leftDate.CompareTo(rightDate);
            default:
                throw new FormulaEvaluationException(
                    $"Can't compare {FormulaValueText.Describe(left)} with {FormulaValueText.Describe(right)}.");
        }
    }
}
