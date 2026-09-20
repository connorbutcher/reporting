using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Reporting.Database.Migrations
{
    /// <inheritdoc />
    public partial class FilterOperatorCatalogue : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "FilterOperatorDefinitions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ColumnType = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Operator = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Label = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    OperandCount = table.Column<int>(type: "int", nullable: false),
                    OperandKind = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SortOrder = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_FilterOperatorDefinitions", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "FilterOperatorDefinitions",
                columns: new[] { "Id", "ColumnType", "Label", "OperandCount", "OperandKind", "Operator", "SortOrder" },
                values: new object[,]
                {
                    { 1, "String", "is", 1, "Text", "Equals", 0 },
                    { 2, "String", "is not", 1, "Text", "NotEquals", 1 },
                    { 3, "String", "contains", 1, "Text", "Contains", 2 },
                    { 4, "String", "does not contain", 1, "Text", "NotContains", 3 },
                    { 5, "String", "starts with", 1, "Text", "StartsWith", 4 },
                    { 6, "String", "ends with", 1, "Text", "EndsWith", 5 },
                    { 7, "String", "is any of", 1, "List", "In", 6 },
                    { 8, "String", "is empty", 0, "None", "IsEmpty", 7 },
                    { 9, "String", "is not empty", 0, "None", "IsNotEmpty", 8 },
                    { 10, "Int", "=", 1, "Number", "Equals", 0 },
                    { 11, "Int", "≠", 1, "Number", "NotEquals", 1 },
                    { 12, "Int", ">", 1, "Number", "GreaterThan", 2 },
                    { 13, "Int", "≥", 1, "Number", "GreaterThanOrEqual", 3 },
                    { 14, "Int", "<", 1, "Number", "LessThan", 4 },
                    { 15, "Int", "≤", 1, "Number", "LessThanOrEqual", 5 },
                    { 16, "Int", "is between", 2, "Number", "Between", 6 },
                    { 17, "Int", "is empty", 0, "None", "IsEmpty", 7 },
                    { 18, "Int", "is not empty", 0, "None", "IsNotEmpty", 8 },
                    { 19, "Int", "is in tolerance", 0, "None", "InTolerance", 9 },
                    { 20, "Int", "needs concession", 0, "None", "NeedsConcession", 10 },
                    { 21, "Int", "is out of tolerance", 0, "None", "OutOfTolerance", 11 },
                    { 22, "Double", "=", 1, "Number", "Equals", 0 },
                    { 23, "Double", "≠", 1, "Number", "NotEquals", 1 },
                    { 24, "Double", ">", 1, "Number", "GreaterThan", 2 },
                    { 25, "Double", "≥", 1, "Number", "GreaterThanOrEqual", 3 },
                    { 26, "Double", "<", 1, "Number", "LessThan", 4 },
                    { 27, "Double", "≤", 1, "Number", "LessThanOrEqual", 5 },
                    { 28, "Double", "is between", 2, "Number", "Between", 6 },
                    { 29, "Double", "is empty", 0, "None", "IsEmpty", 7 },
                    { 30, "Double", "is not empty", 0, "None", "IsNotEmpty", 8 },
                    { 31, "Double", "is in tolerance", 0, "None", "InTolerance", 9 },
                    { 32, "Double", "needs concession", 0, "None", "NeedsConcession", 10 },
                    { 33, "Double", "is out of tolerance", 0, "None", "OutOfTolerance", 11 },
                    { 34, "Bool", "is true", 0, "None", "IsTrue", 0 },
                    { 35, "Bool", "is false", 0, "None", "IsFalse", 1 },
                    { 36, "Bool", "is empty", 0, "None", "IsEmpty", 2 },
                    { 37, "Bool", "is not empty", 0, "None", "IsNotEmpty", 3 },
                    { 38, "DateTime", "is on", 1, "Date", "Equals", 0 },
                    { 39, "DateTime", "is not on", 1, "Date", "NotEquals", 1 },
                    { 40, "DateTime", "is after", 1, "Date", "GreaterThan", 2 },
                    { 41, "DateTime", "is on or after", 1, "Date", "GreaterThanOrEqual", 3 },
                    { 42, "DateTime", "is before", 1, "Date", "LessThan", 4 },
                    { 43, "DateTime", "is on or before", 1, "Date", "LessThanOrEqual", 5 },
                    { 44, "DateTime", "is between", 2, "Date", "Between", 6 },
                    { 45, "DateTime", "is in the last (days)", 1, "Number", "InLastDays", 7 },
                    { 46, "DateTime", "is in the next (days)", 1, "Number", "InNextDays", 8 },
                    { 47, "DateTime", "is empty", 0, "None", "IsEmpty", 9 },
                    { 48, "DateTime", "is not empty", 0, "None", "IsNotEmpty", 10 }
                });

            migrationBuilder.CreateIndex(
                name: "IX_FilterOperatorDefinitions_ColumnType_Operator",
                table: "FilterOperatorDefinitions",
                columns: new[] { "ColumnType", "Operator" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "FilterOperatorDefinitions");
        }
    }
}
