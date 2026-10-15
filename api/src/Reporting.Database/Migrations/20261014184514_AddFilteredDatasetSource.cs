using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Reporting.Database.Migrations
{
    /// <inheritdoc />
    public partial class AddFilteredDatasetSource : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "DatasetSources",
                columns: new[] { "Id", "Key", "Name" },
                values: new object[] { 4, "Filtered", "Filtered" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DeleteData(
                table: "DatasetSources",
                keyColumn: "Id",
                keyValue: 4);
        }
    }
}
