namespace Reporting.Abstractions;

public class DatasetSummaryDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>The source system this dataset draws from.</summary>
    public DatasetSourceKey Source { get; set; }
}

/// <summary>A selectable dataset source system, for the source pickers.</summary>
public class DatasetSourceDto
{
    public int Id { get; set; }
    public DatasetSourceKey Key { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class DatasetColumnDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DatasetColumnType Type { get; set; }
    public int Order { get; set; }

    /// <summary>
    /// The column's typed display configuration; the concrete shape matches <see cref="Type"/>
    /// (polymorphic on a "kind" discriminator). Always populated on read.
    /// </summary>
    public DatasetColumnConfig? Configuration { get; set; }

    /// <summary>Whether this column is server-computed — its cells aren't directly editable, and
    /// the editor grid should render them read-only.</summary>
    public bool IsComputed { get; set; }

    /// <summary>The formula's source text. Set only when <see cref="IsComputed"/>.</summary>
    public string? FormulaExpression { get; set; }

    /// <summary>True if the formula itself is broken (bad syntax, an unresolved column, a
    /// dependency cycle) — distinct from one row failing to evaluate, which just leaves that row's
    /// cell blank.</summary>
    public bool FormulaHasError { get; set; }

    public string? FormulaError { get; set; }
}

/// <summary>One sampled row's result in a formula preview — either a value or an error, never both.</summary>
public class FormulaPreviewRowDto
{
    public Guid RowId { get; set; }

    /// <summary>Formatted the same way a real cell value is; null if this row errored.</summary>
    public string? Value { get; set; }

    public string? Error { get; set; }
}

/// <summary>
/// The result of evaluating a not-yet-saved formula against a sample of a dataset's rows. When
/// <see cref="Error"/> is set the formula doesn't even validate (bad syntax, an unknown column) and
/// <see cref="Rows"/> is empty; otherwise <see cref="Rows"/> holds one entry per sampled row, each
/// either a value or its own per-row error.
/// </summary>
public class FormulaPreviewResultDto
{
    public string? Error { get; set; }
    public List<FormulaPreviewRowDto> Rows { get; set; } = new();
}

public class DatasetSchemaDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;

    /// <summary>The dataset source's primary key, for the source picker.</summary>
    public int SourceId { get; set; }

    /// <summary>The source system this dataset draws from.</summary>
    public DatasetSourceKey Source { get; set; }

    /// <summary>The source-specific configuration; its concrete shape matches <see cref="Source"/>.</summary>
    public DatasetSourceConfig SourceConfig { get; set; } = null!;

    public List<DatasetColumnDto> Columns { get; set; } = new();
}

public class DatasetRowDto
{
    public Guid Id { get; set; }

    // Keyed by DatasetColumn.Id; every value is stored and returned as a string.
    public Dictionary<Guid, string> Values { get; set; } = new();
}

public class DatasetDataDto
{
    public int Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<DatasetRowDto> Rows { get; set; } = new();
}

/// <summary>
/// A contiguous window of a dataset's rows, for the editor grid's lazy virtual
/// scroll: <see cref="Rows"/> is the slice starting at the requested offset, and
/// <see cref="Total"/> is the full row count so the grid can size its scrollbar.
/// </summary>
public class DatasetRowWindowDto
{
    public int Total { get; set; }
    public List<DatasetRowDto> Rows { get; set; } = new();
}
