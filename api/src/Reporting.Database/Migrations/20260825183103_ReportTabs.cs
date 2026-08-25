using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Reporting.Database.Migrations
{
    /// <inheritdoc />
    public partial class ReportTabs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Introduce a tab layer between a revision and its widgets. Grid sizing (Columns/Rows)
            // moves off the revision onto each tab. Existing data is preserved: every revision gets a
            // single "Tab 1" carrying its old grid, and its widgets are repointed at that tab.

            // 1. Tabs table (widgets FK added later, once the table is populated).
            migrationBuilder.CreateTable(
                name: "Tabs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RefId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReportRevisionId = table.Column<int>(type: "int", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    Order = table.Column<int>(type: "int", nullable: false),
                    Columns = table.Column<int>(type: "int", nullable: false, defaultValue: 48),
                    Rows = table.Column<int>(type: "int", nullable: false, defaultValue: 30)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Tabs", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Tabs_ReportRevisions_ReportRevisionId",
                        column: x => x.ReportRevisionId,
                        principalTable: "ReportRevisions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Tabs_ReportRevisionId_RefId",
                table: "Tabs",
                columns: new[] { "ReportRevisionId", "RefId" },
                unique: true);

            // 2. One default tab per revision, inheriting the revision's current grid.
            migrationBuilder.Sql(
                "INSERT INTO [Tabs] ([RefId], [ReportRevisionId], [Name], [Order], [Columns], [Rows]) " +
                "SELECT NEWID(), [Id], N'Tab 1', 0, [Columns], [Rows] FROM [ReportRevisions];");

            // 3. Repoint widgets from their revision onto that revision's new tab.
            migrationBuilder.AddColumn<int>(
                name: "TabId",
                table: "Widgets",
                type: "int",
                nullable: true);

            migrationBuilder.Sql(
                "UPDATE w SET w.[TabId] = t.[Id] " +
                "FROM [Widgets] w INNER JOIN [Tabs] t ON t.[ReportRevisionId] = w.[ReportRevisionId];");

            migrationBuilder.AlterColumn<int>(
                name: "TabId",
                table: "Widgets",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            // 4. Retire the old widget→revision link in favour of widget→tab.
            migrationBuilder.DropForeignKey(
                name: "FK_Widgets_ReportRevisions_ReportRevisionId",
                table: "Widgets");

            migrationBuilder.DropIndex(
                name: "IX_Widgets_ReportRevisionId_RefId",
                table: "Widgets");

            migrationBuilder.DropColumn(
                name: "ReportRevisionId",
                table: "Widgets");

            migrationBuilder.CreateIndex(
                name: "IX_Widgets_TabId_RefId",
                table: "Widgets",
                columns: new[] { "TabId", "RefId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Widgets_Tabs_TabId",
                table: "Widgets",
                column: "TabId",
                principalTable: "Tabs",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            // 5. Grid sizing now lives on the tab, so drop it from the revision.
            migrationBuilder.DropColumn(name: "Columns", table: "ReportRevisions");
            migrationBuilder.DropColumn(name: "Rows", table: "ReportRevisions");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Restore grid sizing on the revision from its first tab, and repoint widgets back at the
            // revision. Extra tabs (beyond the first) collapse away, as the old shape had no room for them.
            migrationBuilder.AddColumn<int>(
                name: "Columns",
                table: "ReportRevisions",
                type: "int",
                nullable: false,
                defaultValue: 12);

            migrationBuilder.AddColumn<int>(
                name: "Rows",
                table: "ReportRevisions",
                type: "int",
                nullable: false,
                defaultValue: 10);

            migrationBuilder.Sql(
                "UPDATE rv SET rv.[Columns] = t.[Columns], rv.[Rows] = t.[Rows] " +
                "FROM [ReportRevisions] rv INNER JOIN [Tabs] t ON t.[ReportRevisionId] = rv.[Id] AND t.[Order] = 0;");

            migrationBuilder.AddColumn<int>(
                name: "ReportRevisionId",
                table: "Widgets",
                type: "int",
                nullable: true);

            migrationBuilder.Sql(
                "UPDATE w SET w.[ReportRevisionId] = t.[ReportRevisionId] " +
                "FROM [Widgets] w INNER JOIN [Tabs] t ON t.[Id] = w.[TabId];");

            migrationBuilder.DropForeignKey(
                name: "FK_Widgets_Tabs_TabId",
                table: "Widgets");

            migrationBuilder.DropIndex(
                name: "IX_Widgets_TabId_RefId",
                table: "Widgets");

            migrationBuilder.DropColumn(
                name: "TabId",
                table: "Widgets");

            migrationBuilder.AlterColumn<int>(
                name: "ReportRevisionId",
                table: "Widgets",
                type: "int",
                nullable: false,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Widgets_ReportRevisionId_RefId",
                table: "Widgets",
                columns: new[] { "ReportRevisionId", "RefId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Widgets_ReportRevisions_ReportRevisionId",
                table: "Widgets",
                column: "ReportRevisionId",
                principalTable: "ReportRevisions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.DropTable(
                name: "Tabs");
        }
    }
}
