using Reporting.Api.Domain;

namespace Reporting.Api.Contracts;

public class DatasetSummaryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
}

public class DatasetFieldSchemaDto
{
    public string DisplayName { get; set; } = string.Empty;
    public FieldDataType DataType { get; set; }
}

public class DatasetSchemaDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<DatasetFieldSchemaDto> Fields { get; set; } = new();
}

public class DatasetFieldDto
{
    public Guid Id { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public FieldDataType DataType { get; set; }
    public object? Value { get; set; }
}

public class DatasetRecordDto
{
    public Guid Id { get; set; }
    public List<DatasetFieldDto> Fields { get; set; } = new();
}

public class DatasetDataDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public List<DatasetRecordDto> Records { get; set; } = new();
}
