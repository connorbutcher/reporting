using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

#pragma warning disable CA1814 // Prefer jagged arrays over multidimensional

namespace Reporting.Database.Migrations
{
    /// <inheritdoc />
    public partial class DatasetSources : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Seed the source reference set before anything references it, so the FK below is
            // satisfiable and existing datasets can be backfilled to a real source.
            migrationBuilder.CreateTable(
                name: "DatasetSources",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false),
                    Key = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(max)", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DatasetSources", x => x.Id);
                });

            migrationBuilder.InsertData(
                table: "DatasetSources",
                columns: new[] { "Id", "Key", "Name" },
                values: new object[,]
                {
                    { 1, "Assembly", "Assembly" },
                    { 2, "Disassembly", "Disassembly" },
                    { 3, "Specification", "Specification" }
                });

            // Existing datasets predate sources; backfill them to Specification (the config-free
            // source) via the added column's default. New rows always set the source explicitly.
            migrationBuilder.AddColumn<int>(
                name: "DatasetSourceId",
                table: "Datasets",
                type: "int",
                nullable: false,
                defaultValue: 3);

            migrationBuilder.AddColumn<string>(
                name: "SourceConfigJson",
                table: "Datasets",
                type: "nvarchar(max)",
                nullable: false,
                defaultValue: "{}");

            migrationBuilder.CreateIndex(
                name: "IX_Datasets_DatasetSourceId",
                table: "Datasets",
                column: "DatasetSourceId");

            migrationBuilder.CreateIndex(
                name: "IX_DatasetSources_Key",
                table: "DatasetSources",
                column: "Key",
                unique: true);

            migrationBuilder.AddForeignKey(
                name: "FK_Datasets_DatasetSources_DatasetSourceId",
                table: "Datasets",
                column: "DatasetSourceId",
                principalTable: "DatasetSources",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Datasets_DatasetSources_DatasetSourceId",
                table: "Datasets");

            migrationBuilder.DropTable(
                name: "DatasetSources");

            migrationBuilder.DropIndex(
                name: "IX_Datasets_DatasetSourceId",
                table: "Datasets");

            migrationBuilder.DropColumn(
                name: "DatasetSourceId",
                table: "Datasets");

            migrationBuilder.DropColumn(
                name: "SourceConfigJson",
                table: "Datasets");
        }
    }
}
