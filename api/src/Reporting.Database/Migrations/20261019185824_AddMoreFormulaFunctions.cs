using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Reporting.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddMoreFormulaFunctions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "FormulaFunctionDefinitions",
                columns: new[] { "Id", "Category", "Description", "Example", "ImplementationKey", "IsEnabled", "Name", "PropagatesNull", "ReturnKind", "SortOrder" },
                values: new object[,]
                {
                    { 63, "Math", "Rounds to the nearest multiple of a number; halves round away from zero. Blank when the multiple is zero.", "MROUND([Price], 0.05)", "MROUND", true, "MROUND", true, "Number", 62 },
                    { 64, "Math", "The numbers multiplied together, ignoring blanks.", "PRODUCT([Count], [Price])", "PRODUCT", true, "PRODUCT", false, "Number", 63 },
                    { 65, "Math", "How many of the values aren't blank.", "COUNT([Reading 1], [Reading 2], [Reading 3])", "COUNT", true, "COUNT", false, "Number", 64 },
                    { 66, "Math", "The sample standard deviation of the numbers, ignoring blanks. Blank with fewer than two.", "STDEV([Reading 1], [Reading 2], [Reading 3])", "STDEV", true, "STDEV", false, "Number", 65 },
                    { 67, "Math", "The sample variance of the numbers, ignoring blanks. Blank with fewer than two.", "VAR([Reading 1], [Reading 2], [Reading 3])", "VAR", true, "VAR", false, "Number", 66 },
                    { 68, "Text", "Pads the text on the right up to a length, with spaces or the given character.", "PADRIGHT([Part], 10, \".\")", "PADRIGHT", true, "PADRIGHT", true, "Text", 67 },
                    { 69, "Text", "The text before a delimiter (ignoring case): its first occurrence, the nth, or the nth from the end when negative. Blank when it isn't there.", "TEXTBEFORE([Email], \"@\")", "TEXTBEFORE", true, "TEXTBEFORE", true, "Text", 68 },
                    { 70, "Text", "The text after a delimiter (ignoring case): its first occurrence, the nth, or the nth from the end when negative. Blank when it isn't there.", "TEXTAFTER([Serial], \"-\", -1)", "TEXTAFTER", true, "TEXTAFTER", true, "Text", 69 },
                    { 71, "Date", "The minute of a date and time, 0 to 59.", "MINUTE([Logged At])", "MINUTE", true, "MINUTE", true, "Number", 70 },
                    { 72, "Date", "The second of a date and time, 0 to 59.", "SECOND([Logged At])", "SECOND", true, "SECOND", true, "Number", 71 },
                    { 73, "Date", "The day of the year, 1 to 366.", "DAYOFYEAR([Build Date])", "DAYOFYEAR", true, "DAYOFYEAR", true, "Number", 72 },
                    { 74, "Date", "The Monday that starts the date's week.", "STARTOFWEEK([Build Date])", "STARTOFWEEK", true, "STARTOFWEEK", true, "Date", 73 },
                    { 75, "Date", "The first day of the date's calendar quarter.", "STARTOFQUARTER([Build Date])", "STARTOFQUARTER", true, "STARTOFQUARTER", true, "Date", 74 },
                    { 76, "Date", "The first day of the date's year.", "STARTOFYEAR([Build Date])", "STARTOFYEAR", true, "STARTOFYEAR", true, "Date", 75 },
                    { 77, "Date", "The working days (Monday to Friday) from one date to another, counting both; negative when the end is earlier.", "NETWORKDAYS([Ordered], [Shipped])", "NETWORKDAYS", true, "NETWORKDAYS", true, "Number", 76 },
                    { 78, "Date", "The date a number of working days (Monday to Friday) after a date, or before it when negative.", "WORKDAY([Invoice Date], 10)", "WORKDAY", true, "WORKDAY", true, "Date", 77 },
                    { 79, "Logic", "Blank when a value equals another, otherwise the value: turns a placeholder such as 0 or \"N/A\" into a blank.", "NULLIF([Inspected By], \"N/A\")", "NULLIF", true, "NULLIF", false, "Any", 78 },
                    { 80, "Logic", "True when an odd number of the conditions are true.", "XOR([Late], [Damaged])", "XOR", true, "XOR", true, "Bool", 79 },
                    { 81, "Conversion", "Reads text as a date, such as \"2026-03-15\". Blank when it isn't one.", "DATEVALUE([Date Text])", "DATEVALUE", true, "DATEVALUE", true, "Date", 80 }
                });

            migrationBuilder.InsertData(
                table: "FormulaFunctionParameters",
                columns: new[] { "Id", "FormulaFunctionDefinitionId", "IsOptional", "IsVariadic", "Kind", "Name", "Position" },
                values: new object[,]
                {
                    { 101, 63, false, false, "Number", "number", 0 },
                    { 102, 63, false, false, "Number", "multiple", 1 },
                    { 103, 64, false, true, "Number", "number", 0 },
                    { 104, 65, false, true, "Any", "value", 0 },
                    { 105, 66, false, true, "Number", "number", 0 },
                    { 106, 67, false, true, "Number", "number", 0 },
                    { 107, 68, false, false, "Text", "text", 0 },
                    { 108, 68, false, false, "Number", "length", 1 },
                    { 109, 68, true, false, "Text", "pad", 2 },
                    { 110, 69, false, false, "Text", "text", 0 },
                    { 111, 69, false, false, "Text", "delimiter", 1 },
                    { 112, 69, true, false, "Number", "occurrence", 2 },
                    { 113, 70, false, false, "Text", "text", 0 },
                    { 114, 70, false, false, "Text", "delimiter", 1 },
                    { 115, 70, true, false, "Number", "occurrence", 2 },
                    { 116, 71, false, false, "Date", "date", 0 },
                    { 117, 72, false, false, "Date", "date", 0 },
                    { 118, 73, false, false, "Date", "date", 0 },
                    { 119, 74, false, false, "Date", "date", 0 },
                    { 120, 75, false, false, "Date", "date", 0 },
                    { 121, 76, false, false, "Date", "date", 0 },
                    { 122, 77, false, false, "Date", "start", 0 },
                    { 123, 77, false, false, "Date", "end", 1 },
                    { 124, 78, false, false, "Date", "date", 0 },
                    { 125, 78, false, false, "Number", "days", 1 },
                    { 126, 79, false, false, "Any", "value", 0 },
                    { 127, 79, false, false, "Any", "match", 1 },
                    { 128, 80, false, true, "Bool", "condition", 0 },
                    { 129, 81, false, false, "Text", "text", 0 }
                });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 101);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 102);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 103);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 104);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 105);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 106);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 107);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 108);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 109);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 110);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 111);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 112);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 113);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 114);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 115);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 116);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 117);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 118);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 119);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 120);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 121);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 122);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 123);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 124);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 125);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 126);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 127);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 128);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionParameters",
                keyColumn: "Id",
                keyValue: 129);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionDefinitions",
                keyColumn: "Id",
                keyValue: 63);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionDefinitions",
                keyColumn: "Id",
                keyValue: 64);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionDefinitions",
                keyColumn: "Id",
                keyValue: 65);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionDefinitions",
                keyColumn: "Id",
                keyValue: 66);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionDefinitions",
                keyColumn: "Id",
                keyValue: 67);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionDefinitions",
                keyColumn: "Id",
                keyValue: 68);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionDefinitions",
                keyColumn: "Id",
                keyValue: 69);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionDefinitions",
                keyColumn: "Id",
                keyValue: 70);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionDefinitions",
                keyColumn: "Id",
                keyValue: 71);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionDefinitions",
                keyColumn: "Id",
                keyValue: 72);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionDefinitions",
                keyColumn: "Id",
                keyValue: 73);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionDefinitions",
                keyColumn: "Id",
                keyValue: 74);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionDefinitions",
                keyColumn: "Id",
                keyValue: 75);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionDefinitions",
                keyColumn: "Id",
                keyValue: 76);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionDefinitions",
                keyColumn: "Id",
                keyValue: 77);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionDefinitions",
                keyColumn: "Id",
                keyValue: 78);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionDefinitions",
                keyColumn: "Id",
                keyValue: 79);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionDefinitions",
                keyColumn: "Id",
                keyValue: 80);

            migrationBuilder.DeleteData(
                table: "FormulaFunctionDefinitions",
                keyColumn: "Id",
                keyValue: 81);
        }
    }
}
