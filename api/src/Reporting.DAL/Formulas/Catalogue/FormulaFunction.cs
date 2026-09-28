using Reporting.DAL.Formulas.Functions;
using Reporting.Database;

namespace Reporting.DAL.Formulas.Catalogue;

/// <summary>A catalogue function ready to call: its database definition joined to the server implementation that runs it.</summary>
public sealed class FormulaFunction
{
    public FormulaFunction(FormulaFunctionDefinition definition, IFormulaFunctionImplementation implementation)
    {
        Definition = definition;
        Implementation = implementation;
        var parameters = definition.Parameters.OrderBy(p => p.Position).ToArray();
        Parameters = parameters;

        // Worked out once: the analyzer and evaluator ask on every call of the function.
        IsVariadic = parameters.Length > 0 && parameters[^1].IsVariadic;
        MinArguments = parameters.Count(p => !p.IsOptional);
        MaxArguments = IsVariadic ? null : parameters.Length;
    }

    public FormulaFunctionDefinition Definition { get; }

    public IFormulaFunctionImplementation Implementation { get; }

    /// <summary>The parameters in argument order.</summary>
    public IReadOnlyList<FormulaFunctionParameter> Parameters { get; }

    public bool IsVariadic { get; }

    /// <summary>The fewest arguments a call needs: every parameter that isn't optional.</summary>
    public int MinArguments { get; }

    /// <summary>The most arguments a call may have; null when the last parameter repeats.</summary>
    public int? MaxArguments { get; }

    public string Name
    {
        get
        {
            return Definition.Name;
        }
    }

    /// <summary>How a call is written, for messages: <c>ROUND(number, [digits])</c>; a repeating parameter shows as <c>number, …</c>.</summary>
    public string Signature
    {
        get
        {
            var parts = new List<string>(Parameters.Count);
            foreach (var parameter in Parameters)
            {
                parts.Add(DescribeParameter(parameter));
            }

            return $"{Name}({string.Join(", ", parts)})";
        }
    }

    /// <summary>The parameter the argument at <paramref name="index"/> answers to (the repeating last one for any beyond the list).</summary>
    public FormulaFunctionParameter ParameterFor(int index)
    {
        return Parameters[Math.Min(index, Parameters.Count - 1)];
    }

    private static string DescribeParameter(FormulaFunctionParameter parameter)
    {
        if (parameter.IsVariadic)
        {
            return $"{parameter.Name}, …";
        }

        return parameter.IsOptional ? $"[{parameter.Name}]" : parameter.Name;
    }
}
