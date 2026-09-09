using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Reporting.Database.Migrations
{
    /// <inheritdoc />
    public partial class ReportPersonalization : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "ReportFavorites",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    ReportId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReportFavorites", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReportFavorites_Reports_ReportId",
                        column: x => x.ReportId,
                        principalTable: "Reports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ReportFavorites_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ReportViews",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    ReportId = table.Column<int>(type: "int", nullable: false),
                    ViewedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReportViews", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReportViews_Reports_ReportId",
                        column: x => x.ReportId,
                        principalTable: "Reports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_ReportViews_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_ReportFavorites_ReportId",
                table: "ReportFavorites",
                column: "ReportId");

            migrationBuilder.CreateIndex(
                name: "IX_ReportFavorites_UserId_ReportId",
                table: "ReportFavorites",
                columns: new[] { "UserId", "ReportId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReportViews_ReportId",
                table: "ReportViews",
                column: "ReportId");

            migrationBuilder.CreateIndex(
                name: "IX_ReportViews_UserId_ReportId",
                table: "ReportViews",
                columns: new[] { "UserId", "ReportId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_ReportViews_UserId_ViewedAt",
                table: "ReportViews",
                columns: new[] { "UserId", "ViewedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "ReportFavorites");

            migrationBuilder.DropTable(
                name: "ReportViews");
        }
    }
}
