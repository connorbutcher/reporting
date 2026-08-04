using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Reporting.Api.Migrations
{
    /// <inheritdoc />
    public partial class AddFoldersAndReportVersioning : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Widgets_Reports_ReportId",
                table: "Widgets");

            migrationBuilder.DropColumn(
                name: "Columns",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "Rows",
                table: "Reports");

            migrationBuilder.RenameColumn(
                name: "ReportId",
                table: "Widgets",
                newName: "ReportRevisionId");

            migrationBuilder.RenameIndex(
                name: "IX_Widgets_ReportId",
                table: "Widgets",
                newName: "IX_Widgets_ReportRevisionId");

            migrationBuilder.AddColumn<DateTime>(
                name: "CreatedAt",
                table: "Reports",
                type: "TEXT",
                nullable: false,
                defaultValue: new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified));

            migrationBuilder.AddColumn<Guid>(
                name: "FolderId",
                table: "Reports",
                type: "TEXT",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Number",
                table: "Reports",
                type: "INTEGER",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateTable(
                name: "Folders",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    Name = table.Column<string>(type: "TEXT", nullable: false),
                    ParentFolderId = table.Column<Guid>(type: "TEXT", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Folders", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Folders_Folders_ParentFolderId",
                        column: x => x.ParentFolderId,
                        principalTable: "Folders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "ReportRevisions",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    ReportId = table.Column<Guid>(type: "TEXT", nullable: false),
                    Kind = table.Column<string>(type: "TEXT", nullable: false),
                    VersionNumber = table.Column<int>(type: "INTEGER", nullable: true),
                    Columns = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 12),
                    Rows = table.Column<int>(type: "INTEGER", nullable: false, defaultValue: 10),
                    CreatedAt = table.Column<DateTime>(type: "TEXT", nullable: false),
                    PublishedAt = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ReportRevisions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ReportRevisions_Reports_ReportId",
                        column: x => x.ReportId,
                        principalTable: "Reports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Reports_FolderId",
                table: "Reports",
                column: "FolderId");

            migrationBuilder.CreateIndex(
                name: "IX_Reports_Number",
                table: "Reports",
                column: "Number",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Folders_ParentFolderId",
                table: "Folders",
                column: "ParentFolderId");

            migrationBuilder.CreateIndex(
                name: "IX_ReportRevisions_ReportId",
                table: "ReportRevisions",
                column: "ReportId");

            migrationBuilder.AddForeignKey(
                name: "FK_Reports_Folders_FolderId",
                table: "Reports",
                column: "FolderId",
                principalTable: "Folders",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);

            migrationBuilder.AddForeignKey(
                name: "FK_Widgets_ReportRevisions_ReportRevisionId",
                table: "Widgets",
                column: "ReportRevisionId",
                principalTable: "ReportRevisions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Reports_Folders_FolderId",
                table: "Reports");

            migrationBuilder.DropForeignKey(
                name: "FK_Widgets_ReportRevisions_ReportRevisionId",
                table: "Widgets");

            migrationBuilder.DropTable(
                name: "Folders");

            migrationBuilder.DropTable(
                name: "ReportRevisions");

            migrationBuilder.DropIndex(
                name: "IX_Reports_FolderId",
                table: "Reports");

            migrationBuilder.DropIndex(
                name: "IX_Reports_Number",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "CreatedAt",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "FolderId",
                table: "Reports");

            migrationBuilder.DropColumn(
                name: "Number",
                table: "Reports");

            migrationBuilder.RenameColumn(
                name: "ReportRevisionId",
                table: "Widgets",
                newName: "ReportId");

            migrationBuilder.RenameIndex(
                name: "IX_Widgets_ReportRevisionId",
                table: "Widgets",
                newName: "IX_Widgets_ReportId");

            migrationBuilder.AddColumn<int>(
                name: "Columns",
                table: "Reports",
                type: "INTEGER",
                nullable: false,
                defaultValue: 12);

            migrationBuilder.AddColumn<int>(
                name: "Rows",
                table: "Reports",
                type: "INTEGER",
                nullable: false,
                defaultValue: 10);

            migrationBuilder.AddForeignKey(
                name: "FK_Widgets_Reports_ReportId",
                table: "Widgets",
                column: "ReportId",
                principalTable: "Reports",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
