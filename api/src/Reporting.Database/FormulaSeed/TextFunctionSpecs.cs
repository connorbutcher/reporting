using Cat = Reporting.Abstractions.FormulaFunctionCategory;
using K = Reporting.Abstractions.FormulaValueKind;
using static Reporting.Database.FormulaSeed.FormulaFunctionSpecs;

namespace Reporting.Database.FormulaSeed;

/// <summary>The text functions of the formula catalogue: their signatures and how they treat blanks. The code that runs each is on the server, under the same name.</summary>
public static class TextFunctionSpecs
{
    public static IReadOnlyList<FormulaFunctionSpec> All()
    {
        return
        [
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
        ];
    }
}
