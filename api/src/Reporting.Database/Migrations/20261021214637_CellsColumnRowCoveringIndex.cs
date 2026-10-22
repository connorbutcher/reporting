using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Reporting.Database.Migrations
{
    /// <inheritdoc />
    public partial class CellsColumnRowCoveringIndex : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateIndex(
                name: "IX_DatasetCells_ColumnId_RowId",
                table: "DatasetCells",
                columns: new[] { "ColumnId", "RowId" })
                .Annotation("SqlServer:Include", new[] { "StringValue", "NumberValue", "DateValue", "BoolValue" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_DatasetCells_ColumnId_RowId",
                table: "DatasetCells");
        }
    }
}
