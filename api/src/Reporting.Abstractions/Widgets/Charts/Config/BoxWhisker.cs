namespace Reporting.Abstractions;

/// <summary>Where a box plot's whiskers end, and whether points beyond them are drawn as outliers.</summary>
public enum BoxWhisker
{
    /// <summary>Whiskers reach a multiple (see WhiskerFactor, default 1.5) of the IQR past the quartiles; values beyond are outliers.</summary>
    Tukey,

    /// <summary>Whiskers reach the group's actual minimum and maximum; nothing is treated as an outlier.</summary>
    MinMax,

    /// <summary>Whiskers reach a multiple (see WhiskerFactor, default 3) of the standard deviation either side of the mean; values beyond are outliers.</summary>
    StdDev
}
