using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcroFunJam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTagScope : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "scope",
                schema: "catalog",
                table: "tags",
                type: "text",
                nullable: false,
                // The tags of story 8 applied to the transitions only (ADR 0035); the default is dropped once they are.
                defaultValue: "transitions");

            migrationBuilder.AlterColumn<string>(
                name: "scope",
                schema: "catalog",
                table: "tags",
                type: "text",
                nullable: false,
                oldClrType: typeof(string),
                oldType: "text",
                oldDefaultValue: "transitions");

            migrationBuilder.AddColumn<int>(
                name: "seed_revision",
                schema: "catalog",
                table: "tag_lists",
                type: "integer",
                nullable: true);

            // A list seeded before the tags of the poses is at the first revision of the initial list: the start-up brings it
            // up to date (ADR 0035). A list started empty (never in production) has no revision.
            migrationBuilder.Sql("UPDATE catalog.tag_lists SET seed_revision = 1 WHERE seeded_at IS NOT NULL;");

            migrationBuilder.AddCheckConstraint(
                name: "ck_tags_scope",
                schema: "catalog",
                table: "tags",
                sql: "scope IN ('poses', 'transitions', 'poses-and-transitions')");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_tags_scope",
                schema: "catalog",
                table: "tags");

            migrationBuilder.DropColumn(
                name: "scope",
                schema: "catalog",
                table: "tags");

            migrationBuilder.DropColumn(
                name: "seed_revision",
                schema: "catalog",
                table: "tag_lists");
        }
    }
}
