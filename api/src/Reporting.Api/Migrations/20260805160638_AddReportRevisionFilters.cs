using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Reporting.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddReportRevisionFilters : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "FiltersJson",
                table: "ReportRevisions",
                type: "TEXT",
                nullable: false,
                defaultValue: "[]");

            // Existing revisions have no report-level filters; store that as an
            // empty JSON array rather than a blank string that won't parse.
            migrationBuilder.Sql("UPDATE ReportRevisions SET FiltersJson = '[]' WHERE FiltersJson IS NULL OR FiltersJson = '';");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "FiltersJson",
                table: "ReportRevisions");
        }
    }
}
