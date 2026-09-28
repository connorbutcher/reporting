using Cat = Reporting.Abstractions.FormulaFunctionCategory;
using K = Reporting.Abstractions.FormulaValueKind;

namespace Reporting.Database.FormulaSeed;

/// <summary>Shorthand for writing the catalogue's function specs.</summary>
public static class FormulaFunctionSpecs
{
    public static FormulaParameterSpec Req(string name, K kind)
    {
        return new FormulaParameterSpec(name, kind);
    }

    public static FormulaParameterSpec Opt(string name, K kind)
    {
        return new FormulaParameterSpec(name, kind, IsOptional: true);
    }

    public static FormulaParameterSpec Many(string name, K kind)
    {
        return new FormulaParameterSpec(name, kind, IsVariadic: true);
    }

    /// <summary>A function that gives a blank in any argument a blank result.</summary>
    public static FormulaFunctionSpec Strict(string name, Cat category, K returns, string description, string example, params FormulaParameterSpec[] parameters)
    {
        return new FormulaFunctionSpec(name, category, returns, true, description, example, parameters);
    }

    /// <summary>A function that receives blanks and decides what they mean.</summary>
    public static FormulaFunctionSpec Lenient(string name, Cat category, K returns, string description, string example, params FormulaParameterSpec[] parameters)
    {
        return new FormulaFunctionSpec(name, category, returns, false, description, example, parameters);
    }
}
