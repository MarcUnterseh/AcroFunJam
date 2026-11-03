using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcroFunJam.Infrastructure.Persistence.Migrations
{
    /// <summary>
    /// Story 3: name key (unique), flow indicators, source proposal and publication date of the published poses.
    /// catalog.poses is empty by construction (no write use case existed before): the default values are never
    /// used, and a guard refuses a non-empty table. A development database filled by hand must be emptied first
    /// (<c>DELETE FROM catalog.poses</c>).
    /// </summary>
    public partial class ExtendCatalogPoses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Explicit guard: the default values below are only meant for an empty table.
            migrationBuilder.Sql(
                "DO $$ BEGIN IF EXISTS (SELECT 1 FROM catalog.poses) THEN RAISE EXCEPTION 'catalog.poses doit être vide (story 3)'; END IF; END $$;");

            migrationBuilder.AddColumn<bool>(
                name: "can_end_flow",
                schema: "catalog",
                table: "poses",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<bool>(
                name: "can_start_flow",
                schema: "catalog",
                table: "poses",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            migrationBuilder.AddColumn<string>(
                name: "name_key",
                schema: "catalog",
                table: "poses",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<DateTimeOffset>(
                name: "published_at",
                schema: "catalog",
                table: "poses",
                type: "timestamp with time zone",
                nullable: false,
                defaultValue: new DateTimeOffset(new DateTime(1, 1, 1, 0, 0, 0, 0, DateTimeKind.Unspecified), new TimeSpan(0, 0, 0, 0, 0)));

            migrationBuilder.AddColumn<Guid>(
                name: "source_proposal_id",
                schema: "catalog",
                table: "poses",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_poses_name_key",
                schema: "catalog",
                table: "poses",
                column: "name_key",
                unique: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_poses_base_difficulty",
                schema: "catalog",
                table: "poses",
                sql: "base_difficulty IN ('discovery', 'beginner', 'intermediate', 'advanced')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_poses_flyer_difficulty",
                schema: "catalog",
                table: "poses",
                sql: "flyer_difficulty IN ('discovery', 'beginner', 'intermediate', 'advanced')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_poses_name_key",
                schema: "catalog",
                table: "poses",
                sql: "name_key <> ''");

            migrationBuilder.AddCheckConstraint(
                name: "ck_poses_name_length",
                schema: "catalog",
                table: "poses",
                sql: "char_length(name) <= 60");

            // The defaults only served to add NOT NULL columns: the application always writes these values.
            migrationBuilder.Sql(
                "ALTER TABLE catalog.poses ALTER COLUMN can_end_flow DROP DEFAULT, ALTER COLUMN can_start_flow DROP DEFAULT, "
                + "ALTER COLUMN name_key DROP DEFAULT, ALTER COLUMN published_at DROP DEFAULT;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_poses_name_key",
                schema: "catalog",
                table: "poses");

            migrationBuilder.DropCheckConstraint(
                name: "ck_poses_base_difficulty",
                schema: "catalog",
                table: "poses");

            migrationBuilder.DropCheckConstraint(
                name: "ck_poses_flyer_difficulty",
                schema: "catalog",
                table: "poses");

            migrationBuilder.DropCheckConstraint(
                name: "ck_poses_name_key",
                schema: "catalog",
                table: "poses");

            migrationBuilder.DropCheckConstraint(
                name: "ck_poses_name_length",
                schema: "catalog",
                table: "poses");

            migrationBuilder.DropColumn(
                name: "can_end_flow",
                schema: "catalog",
                table: "poses");

            migrationBuilder.DropColumn(
                name: "can_start_flow",
                schema: "catalog",
                table: "poses");

            migrationBuilder.DropColumn(
                name: "name_key",
                schema: "catalog",
                table: "poses");

            migrationBuilder.DropColumn(
                name: "published_at",
                schema: "catalog",
                table: "poses");

            migrationBuilder.DropColumn(
                name: "source_proposal_id",
                schema: "catalog",
                table: "poses");
        }
    }
}
