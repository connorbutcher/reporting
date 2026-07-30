using System.Text.Json.Serialization;

namespace Reporting.Api.Contracts;

[JsonPolymorphic(TypeDiscriminatorPropertyName = "type")]
[JsonDerivedType(typeof(DataTableWidgetConfig), typeDiscriminator: "dataTable")]
public abstract class WidgetConfig
{
}

public class DataTableWidgetConfig : WidgetConfig
{
    public Guid DatasetId { get; set; }
}
