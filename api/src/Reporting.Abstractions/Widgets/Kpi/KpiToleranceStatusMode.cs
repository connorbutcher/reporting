namespace Reporting.Abstractions;

/// <summary>Whether "out of limits" tallies only <see cref="ToleranceStatus.Fail"/>, or Fail and Concession together.</summary>
public enum KpiToleranceStatusMode
{
    Fail,
    FailOrConcession
}
