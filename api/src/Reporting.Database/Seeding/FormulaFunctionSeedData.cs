using Reporting.Database.FormulaSeed;

namespace Reporting.Database;

/// <summary>
/// The functions a formula can call. Seeds the tables and backs the DAL's in-memory catalogue. Each name must
/// have a server implementation, and list order gives the ids, so new functions go in
/// <see cref="AddedFunctionSpecs"/>.
/// </summary>
public static class FormulaFunctionSeedData
{
    public static (List<FormulaFunctionDefinition> Functions, List<FormulaFunctionParameter> Parameters) Rows()
    {
        var specs = Specs();
        var functions = new List<FormulaFunctionDefinition>(specs.Count);
        var parameters = new List<FormulaFunctionParameter>();

        for (var index = 0; index < specs.Count; index++)
        {
            var spec = specs[index];
            var function = ToDefinition(spec, index);
            functions.Add(function);
            AddParameters(parameters, function.Id, spec.Parameters);
        }

        return (functions, parameters);
    }

    private static List<FormulaFunctionSpec> Specs()
    {
        var specs = new List<FormulaFunctionSpec>();
        specs.AddRange(MathFunctionSpecs.All());
        specs.AddRange(TextFunctionSpecs.All());
        specs.AddRange(DateFunctionSpecs.All());
        specs.AddRange(LogicFunctionSpecs.All());
        specs.AddRange(ConversionFunctionSpecs.All());
        specs.AddRange(AddedFunctionSpecs.All());
        return specs;
    }

    private static FormulaFunctionDefinition ToDefinition(FormulaFunctionSpec spec, int index)
    {
        return new FormulaFunctionDefinition
        {
            Id = index + 1,
            Name = spec.Name,
            ImplementationKey = spec.Name,
            Category = spec.Category,
            Description = spec.Description,
            Example = spec.Example,
            ReturnKind = spec.Returns,
            PropagatesNull = spec.PropagatesNull,
            IsEnabled = true,
            SortOrder = index
        };
    }

    private static void AddParameters(List<FormulaFunctionParameter> parameters, int functionId, FormulaParameterSpec[] specs)
    {
        for (var position = 0; position < specs.Length; position++)
        {
            var spec = specs[position];
            parameters.Add(new FormulaFunctionParameter
            {
                Id = parameters.Count + 1,
                FormulaFunctionDefinitionId = functionId,
                Position = position,
                Name = spec.Name,
                Kind = spec.Kind,
                IsOptional = spec.IsOptional,
                IsVariadic = spec.IsVariadic
            });
        }
    }
}
