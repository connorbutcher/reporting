using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Reporting.Api.Migrations
{
    /// <inheritdoc />
    public partial class ReplaceRowValuesJsonWithTypedCells : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ValuesJson",
                table: "DatasetRows");

            migrationBuilder.CreateTable(
                name: "DatasetCells",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "TEXT", nullable: false),
                    RowId = table.Column<Guid>(type: "TEXT", nullable: false),
                    ColumnId = table.Column<Guid>(type: "TEXT", nullable: false),
                    StringValue = table.Column<string>(type: "TEXT", nullable: true),
                    NumberValue = table.Column<double>(type: "REAL", nullable: true),
                    BoolValue = table.Column<bool>(type: "INTEGER", nullable: true),
                    DateValue = table.Column<DateTime>(type: "TEXT", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DatasetCells", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DatasetCells_DatasetRows_RowId",
                        column: x => x.RowId,
                        principalTable: "DatasetRows",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

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

            migrationBuilder.CreateIndex(
                name: "IX_DatasetCells_RowId_ColumnId",
                table: "DatasetCells",
                columns: new[] { "RowId", "ColumnId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DatasetCells");

            migrationBuilder.AddColumn<string>(
                name: "ValuesJson",
                table: "DatasetRows",
                type: "TEXT",
                nullable: false,
                defaultValue: "");
        }
    }
}
