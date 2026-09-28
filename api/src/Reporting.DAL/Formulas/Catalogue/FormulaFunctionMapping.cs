using Reporting.Abstractions;

namespace Reporting.DAL.Formulas.Catalogue;

/// <summary>Maps catalogue functions to the DTOs the formula builder's palette reads.</summary>
public static class FormulaFunctionMapping
{
    public static List<FormulaFunctionDto> ToDtos(this FormulaFunctionCatalogue catalogue)
    {
        var dtos = new List<FormulaFunctionDto>(catalogue.All.Count);
        foreach (var function in catalogue.All)
        {
            dtos.Add(ToDto(function));
        }

        return dtos;
    }

    private static FormulaFunctionDto ToDto(FormulaFunction function)
    {
        var parameters = new List<FormulaParameterDto>(function.Parameters.Count);
        foreach (var parameter in function.Parameters)
        {
            parameters.Add(new FormulaParameterDto
            {
                Name = parameter.Name,
                Kind = parameter.Kind,
                IsOptional = parameter.IsOptional,
                IsVariadic = parameter.IsVariadic
            });
        }

        return new FormulaFunctionDto
        {
            Name = function.Name,
            Category = function.Definition.Category,
            Description = function.Definition.Description,
            Example = function.Definition.Example,
            ReturnKind = function.Definition.ReturnKind,
            Parameters = parameters
        };
    }
}
