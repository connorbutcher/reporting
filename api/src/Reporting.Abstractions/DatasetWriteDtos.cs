namespace Reporting.Abstractions;

public class SaveDatasetDto
{
    public string Name { get; set; } = string.Empty;
}

/// <summary>Creates a dataset: its name plus the source system it draws from.</summary>
public class CreateDatasetDto
{
    public string Name { get; set; } = string.Empty;
    public int SourceId { get; set; }
}

/// <summary>Repoints a dataset at a different source; its configuration resets to that source's default.</summary>
public class SetDatasetSourceDto
{
    public int SourceId { get; set; }
}

public class SaveDatasetColumnDto
{
    public string Name { get; set; } = string.Empty;
    public DatasetColumnType Type { get; set; } = DatasetColumnType.String;
}

/// <summary>Creates or edits a formula column: its declared result type and its expression text —
/// everything else about it (which columns it depends on) is derived from the expression.</summary>
public class SaveFormulaColumnDto
{
    public string Name { get; set; } = string.Empty;
    public DatasetColumnType ResultType { get; set; } = DatasetColumnType.Double;
    public string Expression { get; set; } = string.Empty;
}

/// <summary>A formula to evaluate against a sample of existing rows without saving it — the builder's
/// live preview.</summary>
public class PreviewFormulaDto
{
    public DatasetColumnType ResultType { get; set; } = DatasetColumnType.Double;
    public string Expression { get; set; } = string.Empty;

    /// <summary>Set while editing an existing formula column, so it isn't flagged as referencing itself.</summary>
    public Guid? EditingColumnId { get; set; }
}

public class SaveDatasetRowDto
{
    /// <summary>Keyed by column id; unknown columns are ignored.</summary>
    public Dictionary<Guid, string> Values { get; set; } = new();
}

/// <summary>The new left-to-right order, given as column ids.</summary>
public class ReorderColumnsDto
{
    public List<Guid> ColumnIds { get; set; } = new();
}
