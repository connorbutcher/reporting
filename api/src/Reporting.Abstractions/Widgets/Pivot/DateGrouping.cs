namespace Reporting.Abstractions;

/// <summary>The period a date field is grouped into, rather than one group per distinct value.</summary>
public enum DateGrouping
{
    Day,
    Week,
    Month,
    Quarter,
    Year
}
