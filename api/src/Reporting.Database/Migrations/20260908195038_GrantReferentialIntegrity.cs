using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Reporting.Database.Migrations
{
    /// <summary>
    /// Replaces the polymorphic (Type, Id) references on AccessGrant and AppPermissionGrant with
    /// typed nullable foreign keys (Folder/Report on the securable side, User/UserGroup on the
    /// subject side), guarded by CHECK constraints and cascaded on delete. The old id columns are
    /// backfilled into the typed columns first; any rows whose old id no longer resolves are purged
    /// so the new foreign keys can be created cleanly.
    /// </summary>
    public partial class GrantReferentialIntegrity : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Old composite/lookup indexes reference the columns we're about to drop.
            migrationBuilder.DropIndex(
                name: "IX_AppPermissionGrants_Permission_SubjectType_SubjectId",
                table: "AppPermissionGrants");
            migrationBuilder.DropIndex(
                name: "IX_AppPermissionGrants_SubjectType_SubjectId",
                table: "AppPermissionGrants");
            migrationBuilder.DropIndex(
                name: "IX_AccessGrants_SecurableType_SecurableId_SubjectType_SubjectId",
                table: "AccessGrants");
            migrationBuilder.DropIndex(
                name: "IX_AccessGrants_SubjectType_SubjectId",
                table: "AccessGrants");

            // 1. Add the new typed columns (all nullable).
            migrationBuilder.AddColumn<int>(name: "FolderId", table: "AccessGrants", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "ReportId", table: "AccessGrants", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "UserId", table: "AccessGrants", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "UserGroupId", table: "AccessGrants", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "UserId", table: "AppPermissionGrants", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "UserGroupId", table: "AppPermissionGrants", type: "int", nullable: true);

            // 2. Backfill the typed columns from the old discriminated ids.
            migrationBuilder.Sql(@"
                UPDATE [AccessGrants] SET
                    [FolderId]    = CASE WHEN [SecurableType] = 'Folder' THEN [SecurableId] END,
                    [ReportId]    = CASE WHEN [SecurableType] = 'Report' THEN [SecurableId] END,
                    [UserId]      = CASE WHEN [SubjectType]   = 'User'   THEN [SubjectId]   END,
                    [UserGroupId] = CASE WHEN [SubjectType]   = 'Group'  THEN [SubjectId]   END;");
            migrationBuilder.Sql(@"
                UPDATE [AppPermissionGrants] SET
                    [UserId]      = CASE WHEN [SubjectType] = 'User'  THEN [SubjectId] END,
                    [UserGroupId] = CASE WHEN [SubjectType] = 'Group' THEN [SubjectId] END;");

            // 3. Purge rows that would violate the new foreign keys or CHECK constraints — grants
            //    left pointing at a subject/securable that no longer exists, or missing the id their
            //    type requires. Consistent data is untouched.
            migrationBuilder.Sql(@"
                DELETE FROM [AccessGrants] WHERE
                    ([UserId]      IS NOT NULL AND [UserId]      NOT IN (SELECT [Id] FROM [Users]))
                 OR ([UserGroupId] IS NOT NULL AND [UserGroupId] NOT IN (SELECT [Id] FROM [UserGroups]))
                 OR ([FolderId]    IS NOT NULL AND [FolderId]    NOT IN (SELECT [Id] FROM [Folders]))
                 OR ([ReportId]    IS NOT NULL AND [ReportId]    NOT IN (SELECT [Id] FROM [Reports]))
                 OR ([SecurableType] = 'Folder' AND [FolderId] IS NULL)
                 OR ([SecurableType] = 'Report' AND [ReportId] IS NULL)
                 OR ([SubjectType]   = 'User'   AND [UserId] IS NULL)
                 OR ([SubjectType]   = 'Group'  AND [UserGroupId] IS NULL);");
            migrationBuilder.Sql(@"
                DELETE FROM [AppPermissionGrants] WHERE
                    ([UserId]      IS NOT NULL AND [UserId]      NOT IN (SELECT [Id] FROM [Users]))
                 OR ([UserGroupId] IS NOT NULL AND [UserGroupId] NOT IN (SELECT [Id] FROM [UserGroups]))
                 OR ([SubjectType] = 'User'  AND [UserId] IS NULL)
                 OR ([SubjectType] = 'Group' AND [UserGroupId] IS NULL);");

            // 4. Drop the old discriminated id columns.
            migrationBuilder.DropColumn(name: "SecurableId", table: "AccessGrants");
            migrationBuilder.DropColumn(name: "SubjectId", table: "AccessGrants");
            migrationBuilder.DropColumn(name: "SubjectId", table: "AppPermissionGrants");

            // 5. New indexes, CHECK constraints and cascading foreign keys.
            migrationBuilder.CreateIndex(
                name: "IX_AppPermissionGrants_Permission_SubjectType_UserId_UserGroupId",
                table: "AppPermissionGrants",
                columns: new[] { "Permission", "SubjectType", "UserId", "UserGroupId" },
                unique: true);
            migrationBuilder.CreateIndex(name: "IX_AppPermissionGrants_UserGroupId", table: "AppPermissionGrants", column: "UserGroupId");
            migrationBuilder.CreateIndex(name: "IX_AppPermissionGrants_UserId", table: "AppPermissionGrants", column: "UserId");
            migrationBuilder.AddCheckConstraint(
                name: "CK_AppPermissionGrant_Subject",
                table: "AppPermissionGrants",
                sql: "([SubjectType] = 'User' AND [UserId] IS NOT NULL AND [UserGroupId] IS NULL) OR ([SubjectType] = 'Group' AND [UserGroupId] IS NOT NULL AND [UserId] IS NULL)");

            migrationBuilder.CreateIndex(name: "IX_AccessGrants_FolderId", table: "AccessGrants", column: "FolderId");
            migrationBuilder.CreateIndex(name: "IX_AccessGrants_ReportId", table: "AccessGrants", column: "ReportId");
            migrationBuilder.CreateIndex(name: "IX_AccessGrants_UserGroupId", table: "AccessGrants", column: "UserGroupId");
            migrationBuilder.CreateIndex(name: "IX_AccessGrants_UserId", table: "AccessGrants", column: "UserId");
            migrationBuilder.CreateIndex(
                name: "IX_AccessGrants_SecurableType_FolderId_ReportId_SubjectType_UserId_UserGroupId",
                table: "AccessGrants",
                columns: new[] { "SecurableType", "FolderId", "ReportId", "SubjectType", "UserId", "UserGroupId" },
                unique: true);
            migrationBuilder.AddCheckConstraint(
                name: "CK_AccessGrant_Securable",
                table: "AccessGrants",
                sql: "([SecurableType] = 'Folder' AND [FolderId] IS NOT NULL AND [ReportId] IS NULL) OR ([SecurableType] = 'Report' AND [ReportId] IS NOT NULL AND [FolderId] IS NULL) OR ([SecurableType] = 'Root' AND [FolderId] IS NULL AND [ReportId] IS NULL)");
            migrationBuilder.AddCheckConstraint(
                name: "CK_AccessGrant_Subject",
                table: "AccessGrants",
                sql: "([SubjectType] = 'User' AND [UserId] IS NOT NULL AND [UserGroupId] IS NULL) OR ([SubjectType] = 'Group' AND [UserGroupId] IS NOT NULL AND [UserId] IS NULL) OR ([SubjectType] = 'Everyone' AND [UserId] IS NULL AND [UserGroupId] IS NULL)");

            migrationBuilder.AddForeignKey(
                name: "FK_AccessGrants_Folders_FolderId", table: "AccessGrants", column: "FolderId",
                principalTable: "Folders", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            migrationBuilder.AddForeignKey(
                name: "FK_AccessGrants_Reports_ReportId", table: "AccessGrants", column: "ReportId",
                principalTable: "Reports", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            migrationBuilder.AddForeignKey(
                name: "FK_AccessGrants_UserGroups_UserGroupId", table: "AccessGrants", column: "UserGroupId",
                principalTable: "UserGroups", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            migrationBuilder.AddForeignKey(
                name: "FK_AccessGrants_Users_UserId", table: "AccessGrants", column: "UserId",
                principalTable: "Users", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            migrationBuilder.AddForeignKey(
                name: "FK_AppPermissionGrants_UserGroups_UserGroupId", table: "AppPermissionGrants", column: "UserGroupId",
                principalTable: "UserGroups", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
            migrationBuilder.AddForeignKey(
                name: "FK_AppPermissionGrants_Users_UserId", table: "AppPermissionGrants", column: "UserId",
                principalTable: "Users", principalColumn: "Id", onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(name: "FK_AccessGrants_Folders_FolderId", table: "AccessGrants");
            migrationBuilder.DropForeignKey(name: "FK_AccessGrants_Reports_ReportId", table: "AccessGrants");
            migrationBuilder.DropForeignKey(name: "FK_AccessGrants_UserGroups_UserGroupId", table: "AccessGrants");
            migrationBuilder.DropForeignKey(name: "FK_AccessGrants_Users_UserId", table: "AccessGrants");
            migrationBuilder.DropForeignKey(name: "FK_AppPermissionGrants_UserGroups_UserGroupId", table: "AppPermissionGrants");
            migrationBuilder.DropForeignKey(name: "FK_AppPermissionGrants_Users_UserId", table: "AppPermissionGrants");

            migrationBuilder.DropCheckConstraint(name: "CK_AccessGrant_Securable", table: "AccessGrants");
            migrationBuilder.DropCheckConstraint(name: "CK_AccessGrant_Subject", table: "AccessGrants");
            migrationBuilder.DropCheckConstraint(name: "CK_AppPermissionGrant_Subject", table: "AppPermissionGrants");

            migrationBuilder.DropIndex(name: "IX_AppPermissionGrants_Permission_SubjectType_UserId_UserGroupId", table: "AppPermissionGrants");
            migrationBuilder.DropIndex(name: "IX_AppPermissionGrants_UserGroupId", table: "AppPermissionGrants");
            migrationBuilder.DropIndex(name: "IX_AppPermissionGrants_UserId", table: "AppPermissionGrants");
            migrationBuilder.DropIndex(name: "IX_AccessGrants_FolderId", table: "AccessGrants");
            migrationBuilder.DropIndex(name: "IX_AccessGrants_ReportId", table: "AccessGrants");
            migrationBuilder.DropIndex(name: "IX_AccessGrants_SecurableType_FolderId_ReportId_SubjectType_UserId_UserGroupId", table: "AccessGrants");
            migrationBuilder.DropIndex(name: "IX_AccessGrants_UserGroupId", table: "AccessGrants");
            migrationBuilder.DropIndex(name: "IX_AccessGrants_UserId", table: "AccessGrants");

            // Re-add the old discriminated id columns and backfill them from the typed columns.
            migrationBuilder.AddColumn<int>(name: "SecurableId", table: "AccessGrants", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "SubjectId", table: "AccessGrants", type: "int", nullable: true);
            migrationBuilder.AddColumn<int>(name: "SubjectId", table: "AppPermissionGrants", type: "int", nullable: false, defaultValue: 0);

            migrationBuilder.Sql(@"
                UPDATE [AccessGrants] SET
                    [SecurableId] = COALESCE([FolderId], [ReportId]),
                    [SubjectId]   = COALESCE([UserId], [UserGroupId]);");
            migrationBuilder.Sql(@"
                UPDATE [AppPermissionGrants] SET [SubjectId] = COALESCE([UserId], [UserGroupId]);");

            migrationBuilder.DropColumn(name: "FolderId", table: "AccessGrants");
            migrationBuilder.DropColumn(name: "ReportId", table: "AccessGrants");
            migrationBuilder.DropColumn(name: "UserId", table: "AccessGrants");
            migrationBuilder.DropColumn(name: "UserGroupId", table: "AccessGrants");
            migrationBuilder.DropColumn(name: "UserId", table: "AppPermissionGrants");
            migrationBuilder.DropColumn(name: "UserGroupId", table: "AppPermissionGrants");

            migrationBuilder.CreateIndex(
                name: "IX_AppPermissionGrants_Permission_SubjectType_SubjectId",
                table: "AppPermissionGrants",
                columns: new[] { "Permission", "SubjectType", "SubjectId" },
                unique: true);
            migrationBuilder.CreateIndex(
                name: "IX_AppPermissionGrants_SubjectType_SubjectId",
                table: "AppPermissionGrants",
                columns: new[] { "SubjectType", "SubjectId" });
            migrationBuilder.CreateIndex(
                name: "IX_AccessGrants_SecurableType_SecurableId_SubjectType_SubjectId",
                table: "AccessGrants",
                columns: new[] { "SecurableType", "SecurableId", "SubjectType", "SubjectId" },
                unique: true);
            migrationBuilder.CreateIndex(
                name: "IX_AccessGrants_SubjectType_SubjectId",
                table: "AccessGrants",
                columns: new[] { "SubjectType", "SubjectId" });
        }
    }
}
