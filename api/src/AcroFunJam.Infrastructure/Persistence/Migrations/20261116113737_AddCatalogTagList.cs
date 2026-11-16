using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcroFunJam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddCatalogTagList : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "tag_lists",
                schema: "catalog",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    seeded_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tag_lists", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "tags",
                schema: "catalog",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    name_key = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: false),
                    implied_tag_id = table.Column<Guid>(type: "uuid", nullable: true),
                    removed_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_tags", x => x.id);
                    table.CheckConstraint("ck_tags_description", "description <> ''");
                    table.CheckConstraint("ck_tags_description_length", "char_length(description) <= 200");
                    table.CheckConstraint("ck_tags_name_key", "name_key <> ''");
                    table.CheckConstraint("ck_tags_name_length", "char_length(name) <= 30");
                    table.ForeignKey(
                        name: "fk_tags_implied_tag",
                        column: x => x.implied_tag_id,
                        principalSchema: "catalog",
                        principalTable: "tags",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "IX_tags_implied_tag_id",
                schema: "catalog",
                table: "tags",
                column: "implied_tag_id");

            migrationBuilder.CreateIndex(
                name: "ix_tags_name_key",
                schema: "catalog",
                table: "tags",
                column: "name_key",
                unique: true,
                filter: "removed_at IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "tag_lists",
                schema: "catalog");

            migrationBuilder.DropTable(
                name: "tags",
                schema: "catalog");
        }
    }
}
