using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Reporting.Database.Migrations
{
    /// <inheritdoc />
    public partial class RevisionScopedDatasets : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Datasets move from global to revision-owned and gain a required FK to their revision.
            // Existing datasets have no revision to attach to (dev data is disposable per the design),
            // so clear the dataset tables first — otherwise the new NOT NULL FK can't be satisfied.
            // Reports/widgets referencing these datasets are left as-is; reset the database for a
            // clean demo seed (the seeder only runs when there are no reports).
            migrationBuilder.Sql("DELETE FROM [DatasetCells];");
            migrationBuilder.Sql("DELETE FROM [DatasetRows];");
            migrationBuilder.Sql("DELETE FROM [DatasetColumns];");
            migrationBuilder.Sql("DELETE FROM [Datasets];");

            migrationBuilder.DropIndex(
                name: "IX_Datasets_RefId",
                table: "Datasets");

            migrationBuilder.DropIndex(
                name: "IX_DatasetRows_DatasetId",
                table: "DatasetRows");

            migrationBuilder.DropIndex(
                name: "IX_DatasetRows_RefId",
                table: "DatasetRows");

            migrationBuilder.DropIndex(
                name: "IX_DatasetColumns_DatasetId",
                table: "DatasetColumns");

            migrationBuilder.DropIndex(
                name: "IX_DatasetColumns_RefId",
                table: "DatasetColumns");

            migrationBuilder.DropColumn(
                name: "RefId",
                table: "Datasets");

            migrationBuilder.AddColumn<int>(
                name: "ReportRevisionId",
                table: "Datasets",
                type: "int",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.CreateIndex(
                name: "IX_Datasets_ReportRevisionId",
                table: "Datasets",
                column: "ReportRevisionId");

            migrationBuilder.CreateIndex(
                name: "IX_DatasetRows_DatasetId_RefId",
                table: "DatasetRows",
                columns: new[] { "DatasetId", "RefId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DatasetColumns_DatasetId_RefId",
                table: "DatasetColumns",
                columns: new[] { "DatasetId", "RefId" },
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Datasets_ReportRevisions_ReportRevisionId",
                table: "Datasets",
                column: "ReportRevisionId",
                principalTable: "ReportRevisions",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Datasets_ReportRevisions_ReportRevisionId",
                table: "Datasets");

            migrationBuilder.DropIndex(
                name: "IX_Datasets_ReportRevisionId",
                table: "Datasets");

            migrationBuilder.DropIndex(
                name: "IX_DatasetRows_DatasetId_RefId",
                table: "DatasetRows");

            migrationBuilder.DropIndex(
                name: "IX_DatasetColumns_DatasetId_RefId",
                table: "DatasetColumns");

            migrationBuilder.DropColumn(
                name: "ReportRevisionId",
                table: "Datasets");

            migrationBuilder.AddColumn<Guid>(
                name: "RefId",
                table: "Datasets",
                type: "uniqueidentifier",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.CreateIndex(
                name: "IX_Datasets_RefId",
                table: "Datasets",
                column: "RefId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DatasetRows_DatasetId",
                table: "DatasetRows",
                column: "DatasetId");

            migrationBuilder.CreateIndex(
                name: "IX_DatasetRows_RefId",
                table: "DatasetRows",
                column: "RefId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_DatasetColumns_DatasetId",
                table: "DatasetColumns",
                column: "DatasetId");

            migrationBuilder.CreateIndex(
                name: "IX_DatasetColumns_RefId",
                table: "DatasetColumns",
                column: "RefId",
                unique: true);
        }
    }
}
