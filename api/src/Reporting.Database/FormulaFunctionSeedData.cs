using Reporting.Abstractions;
using Cat = Reporting.Abstractions.FormulaFunctionCategory;
using K = Reporting.Abstractions.FormulaValueKind;

namespace Reporting.Database;

/// <summary>
/// The default function catalogue: every function a formula can call, with its signature and blank handling.
/// It seeds the FormulaFunctionDefinitions/FormulaFunctionParameters tables, and the DAL builds the same
/// rows in memory when there's no database, so the two can't drift. Each function's <c>ImplementationKey</c>
/// (its name, here) must have a matching implementation registered on the server.
/// </summary>
public static class FormulaFunctionSeedData
{
    public static (List<FormulaFunctionDefinition> Functions, List<FormulaFunctionParameter> Parameters) Rows()
    {
        var functions = new List<FormulaFunctionDefinition>();
        var parameters = new List<FormulaFunctionParameter>();

        foreach (var (spec, index) in Specs().Select((s, i) => (s, i)))
        {
            var function = new FormulaFunctionDefinition
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
            functions.Add(function);

            for (var i = 0; i < spec.Parameters.Length; i++)
            {
                var p = spec.Parameters[i];
                parameters.Add(new FormulaFunctionParameter
                {
                    Id = parameters.Count + 1,
                    FormulaFunctionDefinitionId = function.Id,
                    Position = i,
                    Name = p.Name,
                    Kind = p.Kind,
                    IsOptional = p.IsOptional,
                    IsVariadic = p.IsVariadic
                });
            }
        }

        return (functions, parameters);
    }

    private sealed record Param(string Name, FormulaValueKind Kind, bool IsOptional = false, bool IsVariadic = false);

    private sealed record Spec(
        string Name,
        FormulaFunctionCategory Category,
        FormulaValueKind Returns,
        bool PropagatesNull,
        string Description,
        string Example,
        Param[] Parameters);

    private static Param Req(string name, FormulaValueKind kind) => new(name, kind);
    private static Param Opt(string name, FormulaValueKind kind) => new(name, kind, IsOptional: true);
    private static Param Many(string name, FormulaValueKind kind) => new(name, kind, IsVariadic: true);

    /// <summary>A function that gives a blank in any argument a blank result.</summary>
    private static Spec Strict(string name, Cat category, K returns, string description, string example, params Param[] parameters) =>
        new(name, category, returns, true, description, example, parameters);

    /// <summary>A function that receives blanks and decides what they mean.</summary>
    private static Spec Lenient(string name, Cat category, K returns, string description, string example, params Param[] parameters) =>
        new(name, category, returns, false, description, example, parameters);

    private static IEnumerable<Spec> Specs() =>
    [
        // --- math ---
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

        // --- text ---
        Strict("UPPER", Cat.Text, K.Text, "Converts text to upper case.", "UPPER([Region])", Req("text", K.Text)),
        Strict("LOWER", Cat.Text, K.Text, "Converts text to lower case.", "LOWER([Email])", Req("text", K.Text)),
        Strict("PROPER", Cat.Text, K.Text, "Capitalises the first letter of every word.", "PROPER([Name])", Req("text", K.Text)),
        Strict("TRIM", Cat.Text, K.Text, "Removes leading and trailing spaces and collapses repeated inner spaces.", "TRIM([Part Number])", Req("text", K.Text)),
        Strict("LEN", Cat.Text, K.Number, "The number of characters in the text.", "LEN([Serial])", Req("text", K.Text)),
        Strict("LEFT", Cat.Text, K.Text, "The first characters of the text.", "LEFT([Serial], 3)", Req("text", K.Text), Req("count", K.Number)),
        Strict("RIGHT", Cat.Text, K.Text, "The last characters of the text.", "RIGHT([Serial], 4)", Req("text", K.Text), Req("count", K.Number)),
        Strict("MID", Cat.Text, K.Text, "Characters from the middle of the text, starting at a 1-based position.", "MID([Serial], 4, 2)", Req("text", K.Text), Req("start", K.Number), Req("length", K.Number)),
        Lenient("CONCAT", Cat.Text, K.Text, "Joins values into one piece of text; blanks contribute nothing.", "CONCAT([First Name], \" \", [Last Name])", Many("value", K.Any)),
        Lenient("TEXTJOIN", Cat.Text, K.Text, "Joins values with a delimiter between them, skipping blanks.", "TEXTJOIN(\", \", [City], [Region], [Country])", Req("delimiter", K.Text), Many("value", K.Any)),
        Strict("CONTAINS", Cat.Text, K.Bool, "Whether the text contains another piece of text (ignoring case).", "CONTAINS([Notes], \"urgent\")", Req("text", K.Text), Req("find", K.Text)),
        Strict("STARTSWITH", Cat.Text, K.Bool, "Whether the text begins with another piece of text (ignoring case).", "STARTSWITH([Serial], \"ENG\")", Req("text", K.Text), Req("prefix", K.Text)),
        Strict("ENDSWITH", Cat.Text, K.Bool, "Whether the text ends with another piece of text (ignoring case).", "ENDSWITH([File], \".pdf\")", Req("text", K.Text), Req("suffix", K.Text)),
        Strict("REPLACE", Cat.Text, K.Text, "Replaces every occurrence of some text with other text.", "REPLACE([Part], \"-\", \"\")", Req("text", K.Text), Req("find", K.Text), Req("replacement", K.Text)),
        Strict("FIND", Cat.Text, K.Number, "The 1-based position of some text within other text (ignoring case); 0 when it isn't there.", "FIND(\"-\", [Serial])", Req("find", K.Text), Req("text", K.Text), Opt("start", K.Number)),
        Strict("REPEAT", Cat.Text, K.Text, "Repeats the text a number of times.", "REPEAT(\"*\", [Rating])", Req("text", K.Text), Req("count", K.Number)),
        Strict("PADLEFT", Cat.Text, K.Text, "Pads the text on the left up to a length, with spaces or the given character.", "PADLEFT(TEXT([Id]), 6, \"0\")", Req("text", K.Text), Req("length", K.Number), Opt("pad", K.Text)),

        // --- date ---
        Strict("YEAR", Cat.Date, K.Number, "The year of a date.", "YEAR([Build Date])", Req("date", K.Date)),
        Strict("MONTH", Cat.Date, K.Number, "The month of a date, 1 to 12.", "MONTH([Build Date])", Req("date", K.Date)),
        Strict("DAY", Cat.Date, K.Number, "The day of the month, 1 to 31.", "DAY([Build Date])", Req("date", K.Date)),
        Strict("HOUR", Cat.Date, K.Number, "The hour of a date and time, 0 to 23.", "HOUR([Logged At])", Req("date", K.Date)),
        Strict("QUARTER", Cat.Date, K.Number, "The calendar quarter of a date, 1 to 4.", "QUARTER([Build Date])", Req("date", K.Date)),
        Strict("WEEKDAY", Cat.Date, K.Number, "The day of the week, 1 (Sunday) to 7 (Saturday).", "WEEKDAY([Build Date])", Req("date", K.Date)),
        Strict("ISOWEEK", Cat.Date, K.Number, "The ISO week number of the year, 1 to 53.", "ISOWEEK([Build Date])", Req("date", K.Date)),
        Strict("DATE", Cat.Date, K.Date, "Builds a date from a year, month and day. Blank when they don't make a real date.", "DATE([Year], [Month], 1)", Req("year", K.Number), Req("month", K.Number), Req("day", K.Number)),
        Strict("DATEADD", Cat.Date, K.Date, "Adds an amount of a unit (year, month, week, day, hour, minute or second) to a date.", "DATEADD(\"day\", 30, [Invoice Date])", Req("unit", K.Text), Req("amount", K.Number), Req("date", K.Date)),
        Strict("DATEDIFF", Cat.Date, K.Number, "The whole units (year, month, week, day, hour, minute or second) from one date to another; negative when the end is earlier.", "DATEDIFF(\"day\", [Ordered], [Shipped])", Req("unit", K.Text), Req("start", K.Date), Req("end", K.Date)),
        Strict("STARTOFMONTH", Cat.Date, K.Date, "The first day of the date's month.", "STARTOFMONTH([Build Date])", Req("date", K.Date)),
        Strict("ENDOFMONTH", Cat.Date, K.Date, "The last day of the date's month.", "ENDOFMONTH([Build Date])", Req("date", K.Date)),

        // --- logic ---
        Lenient("IF", Cat.Logic, K.Any, "One value when a condition is true and another when it's false. A blank condition counts as false.", "IF([Diameter] > 100, \"Oversize\", \"OK\")", Req("condition", K.Bool), Req("then", K.Any), Req("else", K.Any)),
        Lenient("COALESCE", Cat.Logic, K.Any, "The first value that isn't blank.", "COALESCE([Override], [Default], 0)", Many("value", K.Any)),
        Lenient("ISBLANK", Cat.Logic, K.Bool, "Whether a value is blank.", "ISBLANK([Inspected By])", Req("value", K.Any)),
        Lenient("AND", Cat.Logic, K.Bool, "True when every condition is true; false as soon as one is false, even if another is blank.", "AND([Passed], [Signed Off])", Many("condition", K.Bool)),
        Lenient("OR", Cat.Logic, K.Bool, "True when any condition is true; false only when all are false.", "OR([Late], [Damaged])", Many("condition", K.Bool)),
        Lenient("NOT", Cat.Logic, K.Bool, "Reverses a condition.", "NOT([Passed])", Req("condition", K.Bool)),
        Strict("BETWEEN", Cat.Logic, K.Bool, "Whether a number lies between a minimum and a maximum, inclusive.", "BETWEEN([Diameter], 99.9, 100.1)", Req("number", K.Number), Req("min", K.Number), Req("max", K.Number)),
        Strict("ONEOF", Cat.Logic, K.Bool, "Whether a value equals any of the listed options.", "ONEOF([Region], \"North\", \"East\")", Req("value", K.Any), Many("option", K.Any)),

        // --- conversion ---
        Strict("TEXT", Cat.Conversion, K.Text, "Converts a value to text, optionally with a .NET format such as \"0.00\", \"N0\" or \"yyyy-MM-dd\".", "TEXT([Build Date], \"dd MMM yyyy\")", Req("value", K.Any), Opt("format", K.Text)),
        Strict("VALUE", Cat.Conversion, K.Number, "Reads text as a number. Blank when it isn't one.", "VALUE([Reading Text])", Req("text", K.Text)),
    ];
}
