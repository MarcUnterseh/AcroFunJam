using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcroFunJam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPoseProposalTags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_proposals_adjustment_note_with_adjustments",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_proposals_published_directly",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_proposals_retained_pose",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.AddColumn<Guid[]>(
                name: "proposed_tag_ids",
                schema: "contribution",
                table: "pose_proposals",
                type: "uuid[]",
                nullable: false,
                defaultValueSql: "'{}'");

            migrationBuilder.AddColumn<Guid[]>(
                name: "retained_tag_ids",
                schema: "contribution",
                table: "pose_proposals",
                type: "uuid[]",
                nullable: true);

            // The proposals accepted before the tags of the poses retained none (story 9a): the check below requires it.
            migrationBuilder.Sql("UPDATE contribution.pose_proposals SET retained_tag_ids = '{}' WHERE status = 'accepted';");

            migrationBuilder.CreateIndex(
                name: "ix_pose_proposals_pending_tag_ids",
                schema: "contribution",
                table: "pose_proposals",
                column: "proposed_tag_ids",
                filter: "status = 'pending'")
                .Annotation("Npgsql:IndexMethod", "gin");

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_proposals_adjustment_note_with_adjustments",
                schema: "contribution",
                table: "pose_proposals",
                sql: "adjustment_note IS NULL OR (retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_can_start_flow, retained_can_end_flow) IS DISTINCT FROM (name, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow) OR NOT (retained_tag_ids @> proposed_tag_ids AND retained_tag_ids <@ proposed_tag_ids)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_proposals_published_directly",
                schema: "contribution",
                table: "pose_proposals",
                sql: "NOT published_directly OR (status = 'accepted' AND decided_by = contributor_id AND decided_at = submitted_at AND adjustment_note IS NULL AND (retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_can_start_flow, retained_can_end_flow) IS NOT DISTINCT FROM (name, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow) AND retained_tag_ids @> proposed_tag_ids AND retained_tag_ids <@ proposed_tag_ids)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_proposals_retained_pose",
                schema: "contribution",
                table: "pose_proposals",
                sql: "(status = 'accepted') = (retained_name IS NOT NULL) AND (status = 'accepted') = (retained_base_difficulty IS NOT NULL) AND (status = 'accepted') = (retained_flyer_difficulty IS NOT NULL) AND (status = 'accepted') = (retained_can_start_flow IS NOT NULL) AND (status = 'accepted') = (retained_can_end_flow IS NOT NULL) AND (status = 'accepted') = (retained_tag_ids IS NOT NULL)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_pose_proposals_pending_tag_ids",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_proposals_adjustment_note_with_adjustments",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_proposals_published_directly",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_proposals_retained_pose",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropColumn(
                name: "proposed_tag_ids",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropColumn(
                name: "retained_tag_ids",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_proposals_adjustment_note_with_adjustments",
                schema: "contribution",
                table: "pose_proposals",
                sql: "adjustment_note IS NULL OR (retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_can_start_flow, retained_can_end_flow) IS DISTINCT FROM (name, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_proposals_published_directly",
                schema: "contribution",
                table: "pose_proposals",
                sql: "NOT published_directly OR (status = 'accepted' AND decided_by = contributor_id AND decided_at = submitted_at AND adjustment_note IS NULL AND (retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_can_start_flow, retained_can_end_flow) IS NOT DISTINCT FROM (name, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow))");

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_proposals_retained_pose",
                schema: "contribution",
                table: "pose_proposals",
                sql: "(status = 'accepted') = (retained_name IS NOT NULL) AND (status = 'accepted') = (retained_base_difficulty IS NOT NULL) AND (status = 'accepted') = (retained_flyer_difficulty IS NOT NULL) AND (status = 'accepted') = (retained_can_start_flow IS NOT NULL) AND (status = 'accepted') = (retained_can_end_flow IS NOT NULL)");
        }
    }
}
