using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Reporting.Database.Migrations
{
    /// <inheritdoc />
    public partial class RemoveGroupAppPermissionGrants : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // App permissions are now user-only, so drop any grant that was made to a group before
            // removing the group columns (their UserId is null, which the non-null alter would reject).
            migrationBuilder.Sql("DELETE FROM [AppPermissionGrants] WHERE [SubjectType] = 'Group';");

            migrationBuilder.DropForeignKey(
                name: "FK_AppPermissionGrants_UserGroups_UserGroupId",
                table: "AppPermissionGrants");

            migrationBuilder.DropIndex(
                name: "IX_AppPermissionGrants_Permission_SubjectType_UserId_UserGroupId",
                table: "AppPermissionGrants");

            migrationBuilder.DropIndex(
                name: "IX_AppPermissionGrants_UserGroupId",
                table: "AppPermissionGrants");

            migrationBuilder.DropCheckConstraint(
                name: "CK_AppPermissionGrant_Subject",
                table: "AppPermissionGrants");

            migrationBuilder.DropColumn(
                name: "SubjectType",
                table: "AppPermissionGrants");

            migrationBuilder.DropColumn(
                name: "UserGroupId",
                table: "AppPermissionGrants");

            migrationBuilder.AlterColumn<int>(
                name: "UserId",
                table: "AppPermissionGrants",
                type: "int",
                nullable: false,
                defaultValue: 0,
                oldClrType: typeof(int),
                oldType: "int",
                oldNullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppPermissionGrants_Permission_UserId",
                table: "AppPermissionGrants",
                columns: new[] { "Permission", "UserId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_AppPermissionGrants_Permission_UserId",
                table: "AppPermissionGrants");

            migrationBuilder.AlterColumn<int>(
                name: "UserId",
                table: "AppPermissionGrants",
                type: "int",
                nullable: true,
                oldClrType: typeof(int),
                oldType: "int");

            migrationBuilder.AddColumn<string>(
                name: "SubjectType",
                table: "AppPermissionGrants",
                type: "nvarchar(450)",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<int>(
                name: "UserGroupId",
                table: "AppPermissionGrants",
                type: "int",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppPermissionGrants_Permission_SubjectType_UserId_UserGroupId",
                table: "AppPermissionGrants",
                columns: new[] { "Permission", "SubjectType", "UserId", "UserGroupId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_AppPermissionGrants_UserGroupId",
                table: "AppPermissionGrants",
                column: "UserGroupId");

            migrationBuilder.AddCheckConstraint(
                name: "CK_AppPermissionGrant_Subject",
                table: "AppPermissionGrants",
                sql: "([SubjectType] = 'User' AND [UserId] IS NOT NULL AND [UserGroupId] IS NULL) OR ([SubjectType] = 'Group' AND [UserGroupId] IS NOT NULL AND [UserId] IS NULL)");

            migrationBuilder.AddForeignKey(
                name: "FK_AppPermissionGrants_UserGroups_UserGroupId",
                table: "AppPermissionGrants",
                column: "UserGroupId",
                principalTable: "UserGroups",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }
    }
}
