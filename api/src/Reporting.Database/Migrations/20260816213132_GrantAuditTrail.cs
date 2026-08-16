using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Reporting.Database.Migrations
{
    /// <inheritdoc />
    public partial class GrantAuditTrail : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "GrantAuditEntries",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    SecurableType = table.Column<string>(type: "nvarchar(450)", nullable: false),
                    SecurableId = table.Column<int>(type: "int", nullable: true),
                    Action = table.Column<string>(type: "nvarchar(max)", nullable: false),
                    SubjectType = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    SubjectId = table.Column<int>(type: "int", nullable: true),
                    OldLevel = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    NewLevel = table.Column<string>(type: "nvarchar(max)", nullable: true),
                    ActorUserId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_GrantAuditEntries", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_GrantAuditEntries_SecurableType_SecurableId_CreatedAt",
                table: "GrantAuditEntries",
                columns: new[] { "SecurableType", "SecurableId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "GrantAuditEntries");
        }
    }
}
