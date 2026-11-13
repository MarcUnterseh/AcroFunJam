using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcroFunJam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RecordPoseVersions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "version",
                schema: "catalog",
                table: "poses",
                type: "integer",
                nullable: false,
                defaultValue: 1);

            // The poses already published start at the first version (ADR 0024); the application then always writes it.
            migrationBuilder.Sql("ALTER TABLE catalog.poses ALTER COLUMN version DROP DEFAULT;");

            migrationBuilder.AddCheckConstraint(
                name: "ck_poses_version",
                schema: "catalog",
                table: "poses",
                sql: "version >= 1");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_poses_version",
                schema: "catalog",
                table: "poses");

            migrationBuilder.DropColumn(
                name: "version",
                schema: "catalog",
                table: "poses");
        }
    }
}
