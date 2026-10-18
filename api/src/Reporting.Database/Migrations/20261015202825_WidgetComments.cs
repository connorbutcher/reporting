using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Reporting.Database.Migrations
{
    /// <inheritdoc />
    public partial class WidgetComments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "WidgetComments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    WidgetRefId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    ReportId = table.Column<int>(type: "int", nullable: false),
                    AuthorUserId = table.Column<int>(type: "int", nullable: false),
                    Body = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    AnchorX = table.Column<double>(type: "float", nullable: true),
                    AnchorY = table.Column<double>(type: "float", nullable: true),
                    AnchorYAxisIndex = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WidgetComments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WidgetComments_Reports_ReportId",
                        column: x => x.ReportId,
                        principalTable: "Reports",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_WidgetComments_Users_AuthorUserId",
                        column: x => x.AuthorUserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "WidgetCommentMentions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    CommentId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_WidgetCommentMentions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_WidgetCommentMentions_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "FK_WidgetCommentMentions_WidgetComments_CommentId",
                        column: x => x.CommentId,
                        principalTable: "WidgetComments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_WidgetCommentMentions_CommentId_UserId",
                table: "WidgetCommentMentions",
                columns: new[] { "CommentId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_WidgetCommentMentions_UserId",
                table: "WidgetCommentMentions",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_WidgetComments_AuthorUserId",
                table: "WidgetComments",
                column: "AuthorUserId");

            migrationBuilder.CreateIndex(
                name: "IX_WidgetComments_ReportId_WidgetRefId_CreatedAt",
                table: "WidgetComments",
                columns: new[] { "ReportId", "WidgetRefId", "CreatedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "WidgetCommentMentions");

            migrationBuilder.DropTable(
                name: "WidgetComments");
        }
    }
}
