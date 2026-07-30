using System.ComponentModel.DataAnnotations.Schema;
using System.Text.Json;

namespace Reporting.Api.Domain;

public enum FieldDataType
{
    String,
    Int,
    Double,
    Bool,
    DateTime
}

public abstract class DatasetFieldValue
{
    public Guid Id { get; set; }
    public Guid RecordId { get; set; }
    public DatasetRecord? Record { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public FieldDataType DataType { get; protected set; }

    // The single mapped storage column; each derived type's typed Value
    // property (de)serializes through this so the schema stays one shared column.
    public string ValueJson { get; set; } = "null";

    public abstract object? GetValue();
}

public class StringFieldValue : DatasetFieldValue
{
    public StringFieldValue() => DataType = FieldDataType.String;

    [NotMapped]
    public string? Value
    {
        get => JsonSerializer.Deserialize<string>(ValueJson);
        set => ValueJson = JsonSerializer.Serialize(value);
    }

    public override object? GetValue() => Value;
}

public class IntFieldValue : DatasetFieldValue
{
    public IntFieldValue() => DataType = FieldDataType.Int;

    [NotMapped]
    public int Value
    {
        get => JsonSerializer.Deserialize<int>(ValueJson);
        set => ValueJson = JsonSerializer.Serialize(value);
    }

    public override object? GetValue() => Value;
}

public class DoubleFieldValue : DatasetFieldValue
{
    public DoubleFieldValue() => DataType = FieldDataType.Double;

    [NotMapped]
    public double Value
    {
        get => JsonSerializer.Deserialize<double>(ValueJson);
        set => ValueJson = JsonSerializer.Serialize(value);
    }

    public override object? GetValue() => Value;
}

public class BoolFieldValue : DatasetFieldValue
{
    public BoolFieldValue() => DataType = FieldDataType.Bool;

    [NotMapped]
    public bool Value
    {
        get => JsonSerializer.Deserialize<bool>(ValueJson);
        set => ValueJson = JsonSerializer.Serialize(value);
    }

    public override object? GetValue() => Value;
}

public class DateTimeFieldValue : DatasetFieldValue
{
    public DateTimeFieldValue() => DataType = FieldDataType.DateTime;

    [NotMapped]
    public DateTime Value
    {
        get => JsonSerializer.Deserialize<DateTime>(ValueJson);
        set => ValueJson = JsonSerializer.Serialize(value);
    }

    public override object? GetValue() => Value;
}
