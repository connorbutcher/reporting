namespace Reporting.Database;

/// <summary>A dataset whose rows are generated on demand and written straight to the database, skipping the change tracker.</summary>
internal interface ISeedRowSource
{
    Dataset Dataset { get; }

    /// <summary>The columns each generated row fills, in the order of its values.</summary>
    IReadOnlyList<DatasetColumn> Columns { get; }

    int RowCount { get; }

    /// <summary>Raw cell text per row, as an import would provide it; null leaves the cell out.</summary>
    IEnumerable<string?[]> Rows();
}
