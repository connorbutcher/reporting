namespace Reporting.Abstractions;

public enum BoxWhisker
{
    /// <summary>WhiskerFactor × IQR past the quartiles; values beyond are outliers.</summary>
    Tukey,

    /// <summary>The group's actual min and max; no outliers.</summary>
    MinMax,

    /// <summary>WhiskerFactor × standard deviation either side of the mean; values beyond are outliers.</summary>
    StdDev
}
