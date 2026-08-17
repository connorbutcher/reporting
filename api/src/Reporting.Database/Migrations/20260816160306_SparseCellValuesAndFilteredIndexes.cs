using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Reporting.Database.Migrations
{
    /// <inheritdoc />
    public partial class SparseCellValuesAndFilteredIndexes : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DatasetCells_ColumnId_DateValue",
                table: "DatasetCells");

            migrationBuilder.DropIndex(
                name: "IX_DatasetCells_ColumnId_NumberValue",
                table: "DatasetCells");

            migrationBuilder.DropIndex(
                name: "IX_DatasetCells_ColumnId_StringValue",
                table: "DatasetCells");

            // A cell populates only the typed column matching its column's type, so
            // each of these is NULL in the large majority of rows. Marking them SPARSE
            // makes those NULLs cost zero bytes (a fixed-length NULL otherwise reserves
            // its full width), at the price of ~4 extra bytes per non-NULL value.
            // StringValue is left non-sparse: it holds every cell's canonical text and
            // is variable-length, so its NULLs already cost nothing. The columns must be
            // free of indexes to be altered, which is why this sits between the drops and
            // the filtered-index recreation below. EF does not model SPARSE, so it is
            // applied and reverted here as raw SQL.
            migrationBuilder.Sql("ALTER TABLE [DatasetCells] ALTER COLUMN [NumberValue] float SPARSE NULL;");
            migrationBuilder.Sql("ALTER TABLE [DatasetCells] ALTER COLUMN [DateValue] datetime2(7) SPARSE NULL;");
            migrationBuilder.Sql("ALTER TABLE [DatasetCells] ALTER COLUMN [BoolValue] bit SPARSE NULL;");

            migrationBuilder.CreateIndex(
                name: "IX_DatasetCells_ColumnId_DateValue",
                table: "DatasetCells",
                columns: new[] { "ColumnId", "DateValue" },
                filter: "[DateValue] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_DatasetCells_ColumnId_NumberValue",
                table: "DatasetCells",
                columns: new[] { "ColumnId", "NumberValue" },
                filter: "[NumberValue] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_DatasetCells_ColumnId_StringValue",
                table: "DatasetCells",
                columns: new[] { "ColumnId", "StringValue" },
                filter: "[StringValue] IS NOT NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DatasetCells_ColumnId_DateValue",
                table: "DatasetCells");

            migrationBuilder.DropIndex(
                name: "IX_DatasetCells_ColumnId_NumberValue",
                table: "DatasetCells");

            migrationBuilder.DropIndex(
                name: "IX_DatasetCells_ColumnId_StringValue",
                table: "DatasetCells");

            // Drop SPARSE to restore the original fixed-width NULL storage.
            migrationBuilder.Sql("ALTER TABLE [DatasetCells] ALTER COLUMN [NumberValue] float NULL;");
            migrationBuilder.Sql("ALTER TABLE [DatasetCells] ALTER COLUMN [DateValue] datetime2(7) NULL;");
            migrationBuilder.Sql("ALTER TABLE [DatasetCells] ALTER COLUMN [BoolValue] bit NULL;");

            migrationBuilder.CreateIndex(
                name: "IX_DatasetCells_ColumnId_DateValue",
                table: "DatasetCells",
                columns: new[] { "ColumnId", "DateValue" });

            migrationBuilder.CreateIndex(
                name: "IX_DatasetCells_ColumnId_NumberValue",
                table: "DatasetCells",
                columns: new[] { "ColumnId", "NumberValue" });

            migrationBuilder.CreateIndex(
                name: "IX_DatasetCells_ColumnId_StringValue",
                table: "DatasetCells",
                columns: new[] { "ColumnId", "StringValue" });
        }
    }
}
