using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcroFunJam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTransitionProposalTags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid[]>(
                name: "proposed_tag_ids",
                schema: "contribution",
                table: "transition_proposals",
                type: "uuid[]",
                nullable: false,
                defaultValueSql: "'{}'");

            migrationBuilder.AddColumn<Guid[]>(
                name: "retained_tag_ids",
                schema: "contribution",
                table: "transition_proposals",
                type: "uuid[]",
                nullable: true);

            // The proposals accepted before the tags retained none (P1): an empty set, as their acceptance is read back with one.
            migrationBuilder.Sql("UPDATE contribution.transition_proposals SET retained_tag_ids = '{}' WHERE status = 'accepted';");

            migrationBuilder.AddCheckConstraint(
                name: "ck_transition_proposals_retained_tags",
                schema: "contribution",
                table: "transition_proposals",
                sql: "(status = 'accepted') = (retained_tag_ids IS NOT NULL)");

            migrationBuilder.CreateIndex(
                name: "ix_transition_proposals_pending_tag_ids",
                schema: "contribution",
                table: "transition_proposals",
                column: "proposed_tag_ids",
                filter: "status = 'pending'")
                .Annotation("Npgsql:IndexMethod", "gin");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_transition_proposals_retained_tags",
                schema: "contribution",
                table: "transition_proposals");

            migrationBuilder.DropIndex(
                name: "ix_transition_proposals_pending_tag_ids",
                schema: "contribution",
                table: "transition_proposals");

            migrationBuilder.DropColumn(
                name: "proposed_tag_ids",
                schema: "contribution",
                table: "transition_proposals");

            migrationBuilder.DropColumn(
                name: "retained_tag_ids",
                schema: "contribution",
                table: "transition_proposals");
        }
    }
}
