using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Reporting.Database.Migrations
{
    /// <inheritdoc />
    public partial class MoveGlobalAdminToAppPermission : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Carry every existing global admin over to the equivalent AppPermissionGrant before the
            // column that used to record it is dropped, so no one loses admin access in the move.
            migrationBuilder.Sql(
                """
                INSERT INTO [AppPermissionGrants] ([Permission], [UserId], [CreatedAt], [CreatedByUserId])
                SELECT 'GlobalAdmin', [Id], GETUTCDATE(), 0
                FROM [Users]
                WHERE [IsGlobalAdmin] = 1;
                """);

            migrationBuilder.DropColumn(
                name: "IsGlobalAdmin",
                table: "Users");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "IsGlobalAdmin",
                table: "Users",
                type: "bit",
                nullable: false,
                defaultValue: false);

            migrationBuilder.Sql(
                """
                UPDATE [Users] SET [IsGlobalAdmin] = 1
                WHERE [Id] IN (SELECT [UserId] FROM [AppPermissionGrants] WHERE [Permission] = 'GlobalAdmin');

                DELETE FROM [AppPermissionGrants] WHERE [Permission] = 'GlobalAdmin';
                """);
        }
    }
}
