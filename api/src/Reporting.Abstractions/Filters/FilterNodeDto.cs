using System.Text.Json.Serialization;

namespace Reporting.Abstractions;

/// <summary>A tree, so nesting is expressible even though the UI offers one level of grouping.</summary>
[JsonPolymorphic(TypeDiscriminatorPropertyName = "kind")]
[JsonDerivedType(typeof(FilterGroupDto), typeDiscriminator: "group")]
[JsonDerivedType(typeof(FilterConditionDto), typeDiscriminator: "condition")]
public abstract class FilterNodeDto
{
}
