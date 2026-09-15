using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Reporting.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddFormulaColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FormulaError",
                table: "DatasetColumns",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "FormulaExpression",
                table: "DatasetColumns",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "FormulaHasError",
                table: "DatasetColumns",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "IsComputed",
                table: "DatasetColumns",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FormulaError",
                table: "DatasetColumns");

            migrationBuilder.DropColumn(
                name: "FormulaExpression",
                table: "DatasetColumns");

            migrationBuilder.DropColumn(
                name: "FormulaHasError",
                table: "DatasetColumns");

            migrationBuilder.DropColumn(
                name: "IsComputed",
                table: "DatasetColumns");
        }
    }
}
