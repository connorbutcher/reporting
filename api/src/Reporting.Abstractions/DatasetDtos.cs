using System.Text.Json;

namespace Reporting.Abstractions;

public class DatasetSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class DatasetColumnDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public DatasetColumnType Type { get; set; }
    public int Order { get; set; }
    public JsonElement? Configuration { get; set; }
}

public class DatasetSchemaDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
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
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<DatasetRowDto> Rows { get; set; } = new();
}

// --- write models ----------------------------------------------------------

public class SaveDatasetDto
{
    public string Name { get; set; } = string.Empty;
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
