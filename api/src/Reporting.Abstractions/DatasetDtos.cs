using System.Text.Json;

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
    public JsonElement? Configuration { get; set; }
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

// --- write models ----------------------------------------------------------

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
