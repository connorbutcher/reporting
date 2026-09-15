using Reporting.Abstractions;

namespace Reporting.Database;

public class DatasetColumn
{
    public int Id { get; set; }

    /// <summary>Stable external/reference id, used in widget/filter JSON and exposed through the API.</summary>
    public Guid RefId { get; set; }

    public int DatasetId { get; set; }
    public Dataset? Dataset { get; set; }
    public string Name { get; set; } = string.Empty;
    public DatasetColumnType Type { get; set; }

    // Left-to-right position of the column within the dataset.
    public int Order { get; set; }

    // Free-form per-column configuration (formatting, display hints, etc.).
    public string ConfigurationJson { get; set; } = "{}";

    /// <summary>
    /// Whether this column's cells are server-computed from <see cref="FormulaExpression"/> rather
    /// than editable — the row-write path silently ignores submitted values for it. False for every
    /// ordinary column.
    /// </summary>
    public bool IsComputed { get; set; }

    /// <summary>The formula's source text (e.g. "ROUND([Diameter] / [Reference], 3)"). Null unless
    /// <see cref="IsComputed"/>; the canonical, only stored form — everything else about the formula
    /// (its AST, the columns it depends on) is re-derived from this by <c>FormulaParser</c> on demand.</summary>
    public string? FormulaExpression { get; set; }

    /// <summary>
    /// True if the formula itself is broken (parse failure, unknown column, a dependency cycle) —
    /// distinct from a single row failing to evaluate, which just leaves that row's cell null. Set
    /// whenever the formula is saved or a dependency column changes under it.
    /// </summary>
    public bool FormulaHasError { get; set; }

    public string? FormulaError { get; set; }
}
