using Reporting.Database.FormulaSeed;

namespace Reporting.Database;

/// <summary>
/// The default function catalogue: every function a formula can call, with its signature and blank handling.
/// It seeds the FormulaFunctionDefinitions/FormulaFunctionParameters tables, and the DAL builds the same
/// rows in memory when there's no database, so the two can't drift. Each function's <c>ImplementationKey</c>
/// (its name, here) must have a matching implementation registered on the server. The functions are listed
/// by category, in the order that gives each its id.
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
