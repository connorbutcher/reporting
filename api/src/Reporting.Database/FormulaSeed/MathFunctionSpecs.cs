using Cat = Reporting.Abstractions.FormulaFunctionCategory;
using K = Reporting.Abstractions.FormulaValueKind;
using static Reporting.Database.FormulaSeed.FormulaFunctionSpecs;

namespace Reporting.Database.FormulaSeed;

/// <summary>The math functions of the formula catalogue: their signatures and how they treat blanks. The code that runs each is on the server, under the same name.</summary>
public static class MathFunctionSpecs
{
    public static IReadOnlyList<FormulaFunctionSpec> All()
    {
        return
        [
            Strict("ROUND", Cat.Math, K.Number, "Rounds to a number of decimal places (default 0); halves round away from zero.", "ROUND([Price] * 1.2, 2)", Req("number", K.Number), Opt("digits", K.Number)),
            Strict("ROUNDUP", Cat.Math, K.Number, "Rounds away from zero to a number of decimal places.", "ROUNDUP([Length], 1)", Req("number", K.Number), Opt("digits", K.Number)),
            Strict("ROUNDDOWN", Cat.Math, K.Number, "Rounds toward zero to a number of decimal places.", "ROUNDDOWN([Length], 1)", Req("number", K.Number), Opt("digits", K.Number)),
            Strict("CEILING", Cat.Math, K.Number, "Rounds up to the next whole number.", "CEILING([Pallets])", Req("number", K.Number)),
            Strict("FLOOR", Cat.Math, K.Number, "Rounds down to the previous whole number.", "FLOOR([Age])", Req("number", K.Number)),
            Strict("ABS", Cat.Math, K.Number, "The absolute value: the number without its sign.", "ABS([Actual] - [Target])", Req("number", K.Number)),
            Strict("SIGN", Cat.Math, K.Number, "-1, 0 or 1 according to the number's sign.", "SIGN([Variance])", Req("number", K.Number)),
            Strict("SQRT", Cat.Math, K.Number, "The square root. Blank for a negative number.", "SQRT([Area])", Req("number", K.Number)),
            Strict("POWER", Cat.Math, K.Number, "A number raised to a power.", "POWER([Radius], 2)", Req("base", K.Number), Req("exponent", K.Number)),
            Strict("MOD", Cat.Math, K.Number, "The remainder after dividing. Blank when dividing by zero.", "MOD([Count], 12)", Req("number", K.Number), Req("divisor", K.Number)),
            Strict("EXP", Cat.Math, K.Number, "e raised to a power.", "EXP([Rate])", Req("number", K.Number)),
            Strict("LN", Cat.Math, K.Number, "The natural logarithm. Blank unless the number is positive.", "LN([Value])", Req("number", K.Number)),
            Strict("LOG", Cat.Math, K.Number, "The logarithm to a base (default 10). Blank unless the number is positive.", "LOG([Value], 2)", Req("number", K.Number), Opt("base", K.Number)),
            Lenient("MIN", Cat.Math, K.Number, "The smallest of the numbers, ignoring blanks.", "MIN([Reading 1], [Reading 2], [Reading 3])", Many("number", K.Number)),
            Lenient("MAX", Cat.Math, K.Number, "The largest of the numbers, ignoring blanks.", "MAX([Reading 1], [Reading 2], [Reading 3])", Many("number", K.Number)),
            Lenient("SUM", Cat.Math, K.Number, "The total of the numbers, ignoring blanks.", "SUM([Labour], [Materials], [Freight])", Many("number", K.Number)),
            Lenient("AVERAGE", Cat.Math, K.Number, "The mean of the numbers, ignoring blanks.", "AVERAGE([Reading 1], [Reading 2], [Reading 3])", Many("number", K.Number)),
            Lenient("MEDIAN", Cat.Math, K.Number, "The middle of the numbers, ignoring blanks.", "MEDIAN([Reading 1], [Reading 2], [Reading 3])", Many("number", K.Number)),
            Strict("CLAMP", Cat.Math, K.Number, "Limits a number to lie between a minimum and a maximum.", "CLAMP([Score], 0, 100)", Req("number", K.Number), Req("min", K.Number), Req("max", K.Number)),
            Lenient("DIVIDE", Cat.Math, K.Number, "Divides, giving the fallback (default blank) instead of failing when the divisor is zero or blank.", "DIVIDE([Scrap], [Produced], 0)", Req("numerator", K.Number), Req("denominator", K.Number), Opt("fallback", K.Number)),
            Strict("PERCENTOF", Cat.Math, K.Number, "One number as a percentage of another. Blank when the whole is zero.", "PERCENTOF([Defects], [Inspected])", Req("part", K.Number), Req("whole", K.Number)),
            Strict("PERCENTCHANGE", Cat.Math, K.Number, "The percentage change from an old value to a new one. Blank when the old value is zero.", "PERCENTCHANGE([Last Month], [This Month])", Req("old", K.Number), Req("new", K.Number)),
            Strict("PI", Cat.Math, K.Number, "The constant π.", "PI() * POWER([Radius], 2)"),
        ];
    }
}
