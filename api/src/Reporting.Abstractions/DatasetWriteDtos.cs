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
