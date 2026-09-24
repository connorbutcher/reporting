using Cat = Reporting.Abstractions.FormulaFunctionCategory;
using K = Reporting.Abstractions.FormulaValueKind;
using static Reporting.Database.FormulaSeed.FormulaFunctionSpecs;

namespace Reporting.Database.FormulaSeed;

/// <summary>The conversion functions of the formula catalogue: their signatures and how they treat blanks. The code that runs each is on the server, under the same name.</summary>
public static class ConversionFunctionSpecs
{
    public static IReadOnlyList<FormulaFunctionSpec> All()
    {
        return
        [
            Strict("TEXT", Cat.Conversion, K.Text, "Converts a value to text, optionally with a .NET format such as \"0.00\", \"N0\" or \"yyyy-MM-dd\".", "TEXT([Build Date], \"dd MMM yyyy\")", Req("value", K.Any), Opt("format", K.Text)),
            Strict("VALUE", Cat.Conversion, K.Number, "Reads text as a number. Blank when it isn't one.", "VALUE([Reading Text])", Req("text", K.Text)),
        ];
    }
}
