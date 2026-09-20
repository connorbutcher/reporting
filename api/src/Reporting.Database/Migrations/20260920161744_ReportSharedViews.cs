using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Reporting.Database.Migrations
{
    /// <inheritdoc />
    public partial class ReportSharedViews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ReportSharedViews",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ShortId = table.Column<string>(type: "nvarchar(10)", maxLength: 10, nullable: false),
                    ReportId = table.Column<int>(type: "int", nullable: false),
                    Filters = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    FiltersHash = table.Column<string>(type: "nvarchar(64)", maxLength: 64, nullable: false),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReportSharedViews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReportSharedViews_Reports_ReportId",
                        column: x => x.ReportId,
                        principalTable: "Reports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ReportSharedViews_Users_CreatedByUserId",
                        column: x => x.CreatedByUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReportSharedViews_CreatedByUserId",
                table: "ReportSharedViews",
                column: "CreatedByUserId");

            migrationBuilder.CreateIndex(
                name: "IX_ReportSharedViews_ReportId_FiltersHash",
                table: "ReportSharedViews",
                columns: new[] { "ReportId", "FiltersHash" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReportSharedViews_ShortId",
                table: "ReportSharedViews",
                column: "ShortId",
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReportSharedViews");
        }
    }
}
