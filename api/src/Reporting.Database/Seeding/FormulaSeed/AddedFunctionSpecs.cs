using Cat = Reporting.Abstractions.FormulaFunctionCategory;
using K = Reporting.Abstractions.FormulaValueKind;
using static Reporting.Database.FormulaSeed.FormulaFunctionSpecs;

namespace Reporting.Database.FormulaSeed;

/// <summary>
/// Functions added after the catalogue was first seeded. A function's id is its position in the catalogue, so new
/// ones go after every earlier one (here, newest last) rather than into their category's list: inserting would
/// renumber existing rows and move any change an admin made to them onto a different function. The builder
/// still shows each under its category.
/// </summary>
public static class AddedFunctionSpecs
{
    public static IReadOnlyList<FormulaFunctionSpec> All()
    {
        return
        [
            Strict("MROUND", Cat.Math, K.Number, "Rounds to the nearest multiple of a number; halves round away from zero. Blank when the multiple is zero.", "MROUND([Price], 0.05)", Req("number", K.Number), Req("multiple", K.Number)),
            Lenient("PRODUCT", Cat.Math, K.Number, "The numbers multiplied together, ignoring blanks.", "PRODUCT([Count], [Price])", Many("number", K.Number)),
            Lenient("COUNT", Cat.Math, K.Number, "How many of the values aren't blank.", "COUNT([Reading 1], [Reading 2], [Reading 3])", Many("value", K.Any)),
            Lenient("STDEV", Cat.Math, K.Number, "The sample standard deviation of the numbers, ignoring blanks. Blank with fewer than two.", "STDEV([Reading 1], [Reading 2], [Reading 3])", Many("number", K.Number)),
            Lenient("VAR", Cat.Math, K.Number, "The sample variance of the numbers, ignoring blanks. Blank with fewer than two.", "VAR([Reading 1], [Reading 2], [Reading 3])", Many("number", K.Number)),
            Strict("PADRIGHT", Cat.Text, K.Text, "Pads the text on the right up to a length, with spaces or the given character.", "PADRIGHT([Part], 10, \".\")", Req("text", K.Text), Req("length", K.Number), Opt("pad", K.Text)),
            Strict("TEXTBEFORE", Cat.Text, K.Text, "The text before a delimiter (ignoring case): its first occurrence, the nth, or the nth from the end when negative. Blank when it isn't there.", "TEXTBEFORE([Email], \"@\")", Req("text", K.Text), Req("delimiter", K.Text), Opt("occurrence", K.Number)),
            Strict("TEXTAFTER", Cat.Text, K.Text, "The text after a delimiter (ignoring case): its first occurrence, the nth, or the nth from the end when negative. Blank when it isn't there.", "TEXTAFTER([Serial], \"-\", -1)", Req("text", K.Text), Req("delimiter", K.Text), Opt("occurrence", K.Number)),
            Strict("MINUTE", Cat.Date, K.Number, "The minute of a date and time, 0 to 59.", "MINUTE([Logged At])", Req("date", K.Date)),
            Strict("SECOND", Cat.Date, K.Number, "The second of a date and time, 0 to 59.", "SECOND([Logged At])", Req("date", K.Date)),
            Strict("DAYOFYEAR", Cat.Date, K.Number, "The day of the year, 1 to 366.", "DAYOFYEAR([Build Date])", Req("date", K.Date)),
            Strict("STARTOFWEEK", Cat.Date, K.Date, "The Monday that starts the date's week.", "STARTOFWEEK([Build Date])", Req("date", K.Date)),
            Strict("STARTOFQUARTER", Cat.Date, K.Date, "The first day of the date's calendar quarter.", "STARTOFQUARTER([Build Date])", Req("date", K.Date)),
            Strict("STARTOFYEAR", Cat.Date, K.Date, "The first day of the date's year.", "STARTOFYEAR([Build Date])", Req("date", K.Date)),
            Strict("NETWORKDAYS", Cat.Date, K.Number, "The working days (Monday to Friday) from one date to another, counting both; negative when the end is earlier.", "NETWORKDAYS([Ordered], [Shipped])", Req("start", K.Date), Req("end", K.Date)),
            Strict("WORKDAY", Cat.Date, K.Date, "The date a number of working days (Monday to Friday) after a date, or before it when negative.", "WORKDAY([Invoice Date], 10)", Req("date", K.Date), Req("days", K.Number)),
            Lenient("NULLIF", Cat.Logic, K.Any, "Blank when a value equals another, otherwise the value: turns a placeholder such as 0 or \"N/A\" into a blank.", "NULLIF([Inspected By], \"N/A\")", Req("value", K.Any), Req("match", K.Any)),
            Strict("XOR", Cat.Logic, K.Bool, "True when an odd number of the conditions are true.", "XOR([Late], [Damaged])", Many("condition", K.Bool)),
            Strict("DATEVALUE", Cat.Conversion, K.Date, "Reads text as a date, such as \"2026-03-15\". Blank when it isn't one.", "DATEVALUE([Date Text])", Req("text", K.Text)),
        ];
    }
}
