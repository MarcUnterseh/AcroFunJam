using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcroFunJam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPoseTags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid[]>(
                name: "tag_ids",
                schema: "catalog",
                table: "poses",
                type: "uuid[]",
                nullable: false,
                // The poses published before their tags carry none (story 9a, V1); the default is dropped once they have it:
                // the application always writes the column.
                defaultValue: new Guid[0]);

            migrationBuilder.AlterColumn<Guid[]>(
                name: "tag_ids",
                schema: "catalog",
                table: "poses",
                type: "uuid[]",
                nullable: false,
                oldClrType: typeof(Guid[]),
                oldType: "uuid[]",
                oldDefaultValue: new Guid[0]);

            migrationBuilder.CreateIndex(
                name: "ix_poses_tag_ids",
                schema: "catalog",
                table: "poses",
                column: "tag_ids")
                .Annotation("Npgsql:IndexMethod", "gin");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_poses_tag_ids",
                schema: "catalog",
                table: "poses");

            migrationBuilder.DropColumn(
                name: "tag_ids",
                schema: "catalog",
                table: "poses");
        }
    }
}
