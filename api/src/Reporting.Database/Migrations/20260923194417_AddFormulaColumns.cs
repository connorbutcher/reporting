using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Reporting.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddFormulaColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FormulaFunctionDefinitions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Name = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    ImplementationKey = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Category = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Description = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Example = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    ReturnKind = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    PropagatesNull = table.Column<bool>(type: "bit", nullable: false),
                    IsEnabled = table.Column<bool>(type: "bit", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FormulaFunctionDefinitions", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "FormulaFunctionParameters",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    FormulaFunctionDefinitionId = table.Column<int>(type: "int", nullable: false),
                    Position = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    Kind = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    IsOptional = table.Column<bool>(type: "bit", nullable: false),
                    IsVariadic = table.Column<bool>(type: "bit", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FormulaFunctionParameters", x => x.Id);
                    table.ForeignKey(
                        name: "FK_FormulaFunctionParameters_FormulaFunctionDefinitions_FormulaFunctionDefinitionId",
                        column: x => x.FormulaFunctionDefinitionId,
                        principalTable: "FormulaFunctionDefinitions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.InsertData(
                table: "FormulaFunctionDefinitions",
                columns: new[] { "Id", "Category", "Description", "Example", "ImplementationKey", "IsEnabled", "Name", "PropagatesNull", "ReturnKind", "SortOrder" },
                values: new object[,]
                {
                    { 1, "Math", "Rounds to a number of decimal places (default 0); halves round away from zero.", "ROUND([Price] * 1.2, 2)", "ROUND", true, "ROUND", true, "Number", 0 },
                    { 2, "Math", "Rounds away from zero to a number of decimal places.", "ROUNDUP([Length], 1)", "ROUNDUP", true, "ROUNDUP", true, "Number", 1 },
                    { 3, "Math", "Rounds toward zero to a number of decimal places.", "ROUNDDOWN([Length], 1)", "ROUNDDOWN", true, "ROUNDDOWN", true, "Number", 2 },
                    { 4, "Math", "Rounds up to the next whole number.", "CEILING([Pallets])", "CEILING", true, "CEILING", true, "Number", 3 },
                    { 5, "Math", "Rounds down to the previous whole number.", "FLOOR([Age])", "FLOOR", true, "FLOOR", true, "Number", 4 },
                    { 6, "Math", "The absolute value: the number without its sign.", "ABS([Actual] - [Target])", "ABS", true, "ABS", true, "Number", 5 },
                    { 7, "Math", "-1, 0 or 1 according to the number's sign.", "SIGN([Variance])", "SIGN", true, "SIGN", true, "Number", 6 },
                    { 8, "Math", "The square root. Blank for a negative number.", "SQRT([Area])", "SQRT", true, "SQRT", true, "Number", 7 },
                    { 9, "Math", "A number raised to a power.", "POWER([Radius], 2)", "POWER", true, "POWER", true, "Number", 8 },
                    { 10, "Math", "The remainder after dividing. Blank when dividing by zero.", "MOD([Count], 12)", "MOD", true, "MOD", true, "Number", 9 },
                    { 11, "Math", "e raised to a power.", "EXP([Rate])", "EXP", true, "EXP", true, "Number", 10 },
                    { 12, "Math", "The natural logarithm. Blank unless the number is positive.", "LN([Value])", "LN", true, "LN", true, "Number", 11 },
                    { 13, "Math", "The logarithm to a base (default 10). Blank unless the number is positive.", "LOG([Value], 2)", "LOG", true, "LOG", true, "Number", 12 },
                    { 14, "Math", "The smallest of the numbers, ignoring blanks.", "MIN([Reading 1], [Reading 2], [Reading 3])", "MIN", true, "MIN", false, "Number", 13 },
                    { 15, "Math", "The largest of the numbers, ignoring blanks.", "MAX([Reading 1], [Reading 2], [Reading 3])", "MAX", true, "MAX", false, "Number", 14 },
                    { 16, "Math", "The total of the numbers, ignoring blanks.", "SUM([Labour], [Materials], [Freight])", "SUM", true, "SUM", false, "Number", 15 },
                    { 17, "Math", "The mean of the numbers, ignoring blanks.", "AVERAGE([Reading 1], [Reading 2], [Reading 3])", "AVERAGE", true, "AVERAGE", false, "Number", 16 },
                    { 18, "Math", "The middle of the numbers, ignoring blanks.", "MEDIAN([Reading 1], [Reading 2], [Reading 3])", "MEDIAN", true, "MEDIAN", false, "Number", 17 },
                    { 19, "Math", "Limits a number to lie between a minimum and a maximum.", "CLAMP([Score], 0, 100)", "CLAMP", true, "CLAMP", true, "Number", 18 },
                    { 20, "Math", "Divides, giving the fallback (default blank) instead of failing when the divisor is zero or blank.", "DIVIDE([Scrap], [Produced], 0)", "DIVIDE", true, "DIVIDE", false, "Number", 19 },
                    { 21, "Math", "One number as a percentage of another. Blank when the whole is zero.", "PERCENTOF([Defects], [Inspected])", "PERCENTOF", true, "PERCENTOF", true, "Number", 20 },
                    { 22, "Math", "The percentage change from an old value to a new one. Blank when the old value is zero.", "PERCENTCHANGE([Last Month], [This Month])", "PERCENTCHANGE", true, "PERCENTCHANGE", true, "Number", 21 },
                    { 23, "Math", "The constant π.", "PI() * POWER([Radius], 2)", "PI", true, "PI", true, "Number", 22 },
                    { 24, "Text", "Converts text to upper case.", "UPPER([Region])", "UPPER", true, "UPPER", true, "Text", 23 },
                    { 25, "Text", "Converts text to lower case.", "LOWER([Email])", "LOWER", true, "LOWER", true, "Text", 24 },
                    { 26, "Text", "Capitalises the first letter of every word.", "PROPER([Name])", "PROPER", true, "PROPER", true, "Text", 25 },
                    { 27, "Text", "Removes leading and trailing spaces and collapses repeated inner spaces.", "TRIM([Part Number])", "TRIM", true, "TRIM", true, "Text", 26 },
                    { 28, "Text", "The number of characters in the text.", "LEN([Serial])", "LEN", true, "LEN", true, "Number", 27 },
                    { 29, "Text", "The first characters of the text.", "LEFT([Serial], 3)", "LEFT", true, "LEFT", true, "Text", 28 },
                    { 30, "Text", "The last characters of the text.", "RIGHT([Serial], 4)", "RIGHT", true, "RIGHT", true, "Text", 29 },
                    { 31, "Text", "Characters from the middle of the text, starting at a 1-based position.", "MID([Serial], 4, 2)", "MID", true, "MID", true, "Text", 30 },
                    { 32, "Text", "Joins values into one piece of text; blanks contribute nothing.", "CONCAT([First Name], \" \", [Last Name])", "CONCAT", true, "CONCAT", false, "Text", 31 },
                    { 33, "Text", "Joins values with a delimiter between them, skipping blanks.", "TEXTJOIN(\", \", [City], [Region], [Country])", "TEXTJOIN", true, "TEXTJOIN", false, "Text", 32 },
                    { 34, "Text", "Whether the text contains another piece of text (ignoring case).", "CONTAINS([Notes], \"urgent\")", "CONTAINS", true, "CONTAINS", true, "Bool", 33 },
                    { 35, "Text", "Whether the text begins with another piece of text (ignoring case).", "STARTSWITH([Serial], \"ENG\")", "STARTSWITH", true, "STARTSWITH", true, "Bool", 34 },
                    { 36, "Text", "Whether the text ends with another piece of text (ignoring case).", "ENDSWITH([File], \".pdf\")", "ENDSWITH", true, "ENDSWITH", true, "Bool", 35 },
                    { 37, "Text", "Replaces every occurrence of some text with other text.", "REPLACE([Part], \"-\", \"\")", "REPLACE", true, "REPLACE", true, "Text", 36 },
                    { 38, "Text", "The 1-based position of some text within other text (ignoring case); 0 when it isn't there.", "FIND(\"-\", [Serial])", "FIND", true, "FIND", true, "Number", 37 },
                    { 39, "Text", "Repeats the text a number of times.", "REPEAT(\"*\", [Rating])", "REPEAT", true, "REPEAT", true, "Text", 38 },
                    { 40, "Text", "Pads the text on the left up to a length, with spaces or the given character.", "PADLEFT(TEXT([Id]), 6, \"0\")", "PADLEFT", true, "PADLEFT", true, "Text", 39 },
                    { 41, "Date", "The year of a date.", "YEAR([Build Date])", "YEAR", true, "YEAR", true, "Number", 40 },
                    { 42, "Date", "The month of a date, 1 to 12.", "MONTH([Build Date])", "MONTH", true, "MONTH", true, "Number", 41 },
                    { 43, "Date", "The day of the month, 1 to 31.", "DAY([Build Date])", "DAY", true, "DAY", true, "Number", 42 },
                    { 44, "Date", "The hour of a date and time, 0 to 23.", "HOUR([Logged At])", "HOUR", true, "HOUR", true, "Number", 43 },
                    { 45, "Date", "The calendar quarter of a date, 1 to 4.", "QUARTER([Build Date])", "QUARTER", true, "QUARTER", true, "Number", 44 },
                    { 46, "Date", "The day of the week, 1 (Sunday) to 7 (Saturday).", "WEEKDAY([Build Date])", "WEEKDAY", true, "WEEKDAY", true, "Number", 45 },
                    { 47, "Date", "The ISO week number of the year, 1 to 53.", "ISOWEEK([Build Date])", "ISOWEEK", true, "ISOWEEK", true, "Number", 46 },
                    { 48, "Date", "Builds a date from a year, month and day. Blank when they don't make a real date.", "DATE([Year], [Month], 1)", "DATE", true, "DATE", true, "Date", 47 },
                    { 49, "Date", "Adds an amount of a unit (year, month, week, day, hour, minute or second) to a date.", "DATEADD(\"day\", 30, [Invoice Date])", "DATEADD", true, "DATEADD", true, "Date", 48 },
                    { 50, "Date", "The whole units (year, month, week, day, hour, minute or second) from one date to another; negative when the end is earlier.", "DATEDIFF(\"day\", [Ordered], [Shipped])", "DATEDIFF", true, "DATEDIFF", true, "Number", 49 },
                    { 51, "Date", "The first day of the date's month.", "STARTOFMONTH([Build Date])", "STARTOFMONTH", true, "STARTOFMONTH", true, "Date", 50 },
                    { 52, "Date", "The last day of the date's month.", "ENDOFMONTH([Build Date])", "ENDOFMONTH", true, "ENDOFMONTH", true, "Date", 51 },
                    { 53, "Logic", "One value when a condition is true and another when it's false. A blank condition counts as false.", "IF([Diameter] > 100, \"Oversize\", \"OK\")", "IF", true, "IF", false, "Any", 52 },
                    { 54, "Logic", "The first value that isn't blank.", "COALESCE([Override], [Default], 0)", "COALESCE", true, "COALESCE", false, "Any", 53 },
                    { 55, "Logic", "Whether a value is blank.", "ISBLANK([Inspected By])", "ISBLANK", true, "ISBLANK", false, "Bool", 54 },
                    { 56, "Logic", "True when every condition is true; false as soon as one is false, even if another is blank.", "AND([Passed], [Signed Off])", "AND", true, "AND", false, "Bool", 55 },
                    { 57, "Logic", "True when any condition is true; false only when all are false.", "OR([Late], [Damaged])", "OR", true, "OR", false, "Bool", 56 },
                    { 58, "Logic", "Reverses a condition.", "NOT([Passed])", "NOT", true, "NOT", false, "Bool", 57 },
                    { 59, "Logic", "Whether a number lies between a minimum and a maximum, inclusive.", "BETWEEN([Diameter], 99.9, 100.1)", "BETWEEN", true, "BETWEEN", true, "Bool", 58 },
                    { 60, "Logic", "Whether a value equals any of the listed options.", "ONEOF([Region], \"North\", \"East\")", "ONEOF", true, "ONEOF", true, "Bool", 59 },
                    { 61, "Conversion", "Converts a value to text, optionally with a .NET format such as \"0.00\", \"N0\" or \"yyyy-MM-dd\".", "TEXT([Build Date], \"dd MMM yyyy\")", "TEXT", true, "TEXT", true, "Text", 60 },
                    { 62, "Conversion", "Reads text as a number. Blank when it isn't one.", "VALUE([Reading Text])", "VALUE", true, "VALUE", true, "Number", 61 }
                });

            migrationBuilder.InsertData(
                table: "FormulaFunctionParameters",
                columns: new[] { "Id", "FormulaFunctionDefinitionId", "IsOptional", "IsVariadic", "Kind", "Name", "Position" },
                values: new object[,]
                {
                    { 1, 1, false, false, "Number", "number", 0 },
                    { 2, 1, true, false, "Number", "digits", 1 },
                    { 3, 2, false, false, "Number", "number", 0 },
                    { 4, 2, true, false, "Number", "digits", 1 },
                    { 5, 3, false, false, "Number", "number", 0 },
                    { 6, 3, true, false, "Number", "digits", 1 },
                    { 7, 4, false, false, "Number", "number", 0 },
                    { 8, 5, false, false, "Number", "number", 0 },
                    { 9, 6, false, false, "Number", "number", 0 },
                    { 10, 7, false, false, "Number", "number", 0 },
                    { 11, 8, false, false, "Number", "number", 0 },
                    { 12, 9, false, false, "Number", "base", 0 },
                    { 13, 9, false, false, "Number", "exponent", 1 },
                    { 14, 10, false, false, "Number", "number", 0 },
                    { 15, 10, false, false, "Number", "divisor", 1 },
                    { 16, 11, false, false, "Number", "number", 0 },
                    { 17, 12, false, false, "Number", "number", 0 },
                    { 18, 13, false, false, "Number", "number", 0 },
                    { 19, 13, true, false, "Number", "base", 1 },
                    { 20, 14, false, true, "Number", "number", 0 },
                    { 21, 15, false, true, "Number", "number", 0 },
                    { 22, 16, false, true, "Number", "number", 0 },
                    { 23, 17, false, true, "Number", "number", 0 },
                    { 24, 18, false, true, "Number", "number", 0 },
                    { 25, 19, false, false, "Number", "number", 0 },
                    { 26, 19, false, false, "Number", "min", 1 },
                    { 27, 19, false, false, "Number", "max", 2 },
                    { 28, 20, false, false, "Number", "numerator", 0 },
                    { 29, 20, false, false, "Number", "denominator", 1 },
                    { 30, 20, true, false, "Number", "fallback", 2 },
                    { 31, 21, false, false, "Number", "part", 0 },
                    { 32, 21, false, false, "Number", "whole", 1 },
                    { 33, 22, false, false, "Number", "old", 0 },
                    { 34, 22, false, false, "Number", "new", 1 },
                    { 35, 24, false, false, "Text", "text", 0 },
                    { 36, 25, false, false, "Text", "text", 0 },
                    { 37, 26, false, false, "Text", "text", 0 },
                    { 38, 27, false, false, "Text", "text", 0 },
                    { 39, 28, false, false, "Text", "text", 0 },
                    { 40, 29, false, false, "Text", "text", 0 },
                    { 41, 29, false, false, "Number", "count", 1 },
                    { 42, 30, false, false, "Text", "text", 0 },
                    { 43, 30, false, false, "Number", "count", 1 },
                    { 44, 31, false, false, "Text", "text", 0 },
                    { 45, 31, false, false, "Number", "start", 1 },
                    { 46, 31, false, false, "Number", "length", 2 },
                    { 47, 32, false, true, "Any", "value", 0 },
                    { 48, 33, false, false, "Text", "delimiter", 0 },
                    { 49, 33, false, true, "Any", "value", 1 },
                    { 50, 34, false, false, "Text", "text", 0 },
                    { 51, 34, false, false, "Text", "find", 1 },
                    { 52, 35, false, false, "Text", "text", 0 },
                    { 53, 35, false, false, "Text", "prefix", 1 },
                    { 54, 36, false, false, "Text", "text", 0 },
                    { 55, 36, false, false, "Text", "suffix", 1 },
                    { 56, 37, false, false, "Text", "text", 0 },
                    { 57, 37, false, false, "Text", "find", 1 },
                    { 58, 37, false, false, "Text", "replacement", 2 },
                    { 59, 38, false, false, "Text", "find", 0 },
                    { 60, 38, false, false, "Text", "text", 1 },
                    { 61, 38, true, false, "Number", "start", 2 },
                    { 62, 39, false, false, "Text", "text", 0 },
                    { 63, 39, false, false, "Number", "count", 1 },
                    { 64, 40, false, false, "Text", "text", 0 },
                    { 65, 40, false, false, "Number", "length", 1 },
                    { 66, 40, true, false, "Text", "pad", 2 },
                    { 67, 41, false, false, "Date", "date", 0 },
                    { 68, 42, false, false, "Date", "date", 0 },
                    { 69, 43, false, false, "Date", "date", 0 },
                    { 70, 44, false, false, "Date", "date", 0 },
                    { 71, 45, false, false, "Date", "date", 0 },
                    { 72, 46, false, false, "Date", "date", 0 },
                    { 73, 47, false, false, "Date", "date", 0 },
                    { 74, 48, false, false, "Number", "year", 0 },
                    { 75, 48, false, false, "Number", "month", 1 },
                    { 76, 48, false, false, "Number", "day", 2 },
                    { 77, 49, false, false, "Text", "unit", 0 },
                    { 78, 49, false, false, "Number", "amount", 1 },
                    { 79, 49, false, false, "Date", "date", 2 },
                    { 80, 50, false, false, "Text", "unit", 0 },
                    { 81, 50, false, false, "Date", "start", 1 },
                    { 82, 50, false, false, "Date", "end", 2 },
                    { 83, 51, false, false, "Date", "date", 0 },
                    { 84, 52, false, false, "Date", "date", 0 },
                    { 85, 53, false, false, "Bool", "condition", 0 },
                    { 86, 53, false, false, "Any", "then", 1 },
                    { 87, 53, false, false, "Any", "else", 2 },
                    { 88, 54, false, true, "Any", "value", 0 },
                    { 89, 55, false, false, "Any", "value", 0 },
                    { 90, 56, false, true, "Bool", "condition", 0 },
                    { 91, 57, false, true, "Bool", "condition", 0 },
                    { 92, 58, false, false, "Bool", "condition", 0 },
                    { 93, 59, false, false, "Number", "number", 0 },
                    { 94, 59, false, false, "Number", "min", 1 },
                    { 95, 59, false, false, "Number", "max", 2 },
                    { 96, 60, false, false, "Any", "value", 0 },
                    { 97, 60, false, true, "Any", "option", 1 },
                    { 98, 61, false, false, "Any", "value", 0 },
                    { 99, 61, true, false, "Text", "format", 1 },
                    { 100, 62, false, false, "Text", "text", 0 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_FormulaFunctionDefinitions_Name",
                table: "FormulaFunctionDefinitions",
                column: "Name",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_FormulaFunctionParameters_FormulaFunctionDefinitionId_Position",
                table: "FormulaFunctionParameters",
                columns: new[] { "FormulaFunctionDefinitionId", "Position" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FormulaFunctionParameters");

            migrationBuilder.DropTable(
                name: "FormulaFunctionDefinitions");

            migrationBuilder.DropColumn(
                name: "FormulaError",
                table: "DatasetColumns");

            migrationBuilder.DropColumn(
                name: "FormulaExpression",
                table: "DatasetColumns");
        }
    }
}
