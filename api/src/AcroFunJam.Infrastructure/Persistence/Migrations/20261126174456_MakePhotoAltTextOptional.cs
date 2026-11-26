using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcroFunJam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class MakePhotoAltTextOptional : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_photos_alt_text",
                schema: "catalog",
                table: "photos");

            migrationBuilder.AlterColumn<string>(
                name: "alt_text",
                schema: "catalog",
                table: "photos",
                type: "text",
                nullable: true,
                oldClrType: typeof(string),
                oldType: "text");

            migrationBuilder.AddCheckConstraint(
                name: "ck_photos_alt_text",
                schema: "catalog",
                table: "photos",
                sql: "alt_text IS NULL OR (alt_text <> '' AND char_length(alt_text) <= 200)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_photos_alt_text",
                schema: "catalog",
                table: "photos");

            migrationBuilder.AlterColumn<string>(
                name: "alt_text",
                schema: "catalog",
                table: "photos",
                type: "text",
                nullable: false,
                defaultValue: "",
                oldClrType: typeof(string),
                oldType: "text",
                oldNullable: true);

            migrationBuilder.AddCheckConstraint(
                name: "ck_photos_alt_text",
                schema: "catalog",
                table: "photos",
                sql: "alt_text <> '' AND char_length(alt_text) <= 200");
        }
    }
}
