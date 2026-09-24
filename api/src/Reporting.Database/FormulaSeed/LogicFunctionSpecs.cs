using Cat = Reporting.Abstractions.FormulaFunctionCategory;
using K = Reporting.Abstractions.FormulaValueKind;
using static Reporting.Database.FormulaSeed.FormulaFunctionSpecs;

namespace Reporting.Database.FormulaSeed;

/// <summary>The logic functions of the formula catalogue: their signatures and how they treat blanks. The code that runs each is on the server, under the same name.</summary>
public static class LogicFunctionSpecs
{
    public static IReadOnlyList<FormulaFunctionSpec> All()
    {
        return
        [
            Lenient("IF", Cat.Logic, K.Any, "One value when a condition is true and another when it's false. A blank condition counts as false.", "IF([Diameter] > 100, \"Oversize\", \"OK\")", Req("condition", K.Bool), Req("then", K.Any), Req("else", K.Any)),
            Lenient("COALESCE", Cat.Logic, K.Any, "The first value that isn't blank.", "COALESCE([Override], [Default], 0)", Many("value", K.Any)),
            Lenient("ISBLANK", Cat.Logic, K.Bool, "Whether a value is blank.", "ISBLANK([Inspected By])", Req("value", K.Any)),
            Lenient("AND", Cat.Logic, K.Bool, "True when every condition is true; false as soon as one is false, even if another is blank.", "AND([Passed], [Signed Off])", Many("condition", K.Bool)),
            Lenient("OR", Cat.Logic, K.Bool, "True when any condition is true; false only when all are false.", "OR([Late], [Damaged])", Many("condition", K.Bool)),
            Lenient("NOT", Cat.Logic, K.Bool, "Reverses a condition.", "NOT([Passed])", Req("condition", K.Bool)),
            Strict("BETWEEN", Cat.Logic, K.Bool, "Whether a number lies between a minimum and a maximum, inclusive.", "BETWEEN([Diameter], 99.9, 100.1)", Req("number", K.Number), Req("min", K.Number), Req("max", K.Number)),
            Strict("ONEOF", Cat.Logic, K.Bool, "Whether a value equals any of the listed options.", "ONEOF([Region], \"North\", \"East\")", Req("value", K.Any), Many("option", K.Any)),
        ];
    }
}
