using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcroFunJam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTransitionTags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid[]>(
                name: "tag_ids",
                schema: "catalog",
                table: "transitions",
                type: "uuid[]",
                nullable: false,
                defaultValueSql: "'{}'");

            migrationBuilder.CreateIndex(
                name: "ix_transitions_tag_ids",
                schema: "catalog",
                table: "transitions",
                column: "tag_ids")
                .Annotation("Npgsql:IndexMethod", "gin");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_transitions_tag_ids",
                schema: "catalog",
                table: "transitions");

            migrationBuilder.DropColumn(
                name: "tag_ids",
                schema: "catalog",
                table: "transitions");
        }
    }
}
