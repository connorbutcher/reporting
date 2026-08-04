using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Reporting.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddChangeNotesToReportRevision : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Notes",
                table: "ReportRevisions",
                type: "TEXT",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Notes",
                table: "ReportRevisions");
        }
    }
}
