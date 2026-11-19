using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcroFunJam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddPoseRevisionTags : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_revision_proposals_published_directly",
                schema: "contribution",
                table: "pose_revision_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_revision_proposals_retained_changes_the_pose",
                schema: "contribution",
                table: "pose_revision_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_revision_proposals_retained_pose",
                schema: "contribution",
                table: "pose_revision_proposals");

            migrationBuilder.AddColumn<Guid[]>(
                name: "prior_tag_ids",
                schema: "contribution",
                table: "pose_revision_proposals",
                type: "uuid[]",
                nullable: false,
                defaultValueSql: "'{}'");

            migrationBuilder.AddColumn<Guid[]>(
                name: "retained_tag_ids",
                schema: "contribution",
                table: "pose_revision_proposals",
                type: "uuid[]",
                nullable: true);

            migrationBuilder.AddColumn<Guid[]>(
                name: "tag_ids",
                schema: "contribution",
                table: "pose_revision_proposals",
                type: "uuid[]",
                nullable: false,
                defaultValueSql: "'{}'");

            // The revisions accepted before story 9a retained no tag: the pose had none.
            migrationBuilder.Sql("UPDATE contribution.pose_revision_proposals SET retained_tag_ids = '{}' WHERE status = 'accepted';");

            migrationBuilder.CreateIndex(
                name: "ix_pose_revision_proposals_pending_tag_ids",
                schema: "contribution",
                table: "pose_revision_proposals",
                column: "tag_ids",
                filter: "status = 'pending'")
                .Annotation("Npgsql:IndexMethod", "gin");

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_revision_proposals_published_directly",
                schema: "contribution",
                table: "pose_revision_proposals",
                sql: "NOT published_directly OR (status = 'accepted' AND decided_by = contributor_id AND decided_at = submitted_at AND adjustment_note IS NULL AND (retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_can_start_flow, retained_can_end_flow) IS NOT DISTINCT FROM (name, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow) AND retained_tag_ids @> tag_ids AND retained_tag_ids <@ tag_ids)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_revision_proposals_retained_changes_the_pose",
                schema: "contribution",
                table: "pose_revision_proposals",
                sql: "status <> 'accepted' OR (retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_can_start_flow, retained_can_end_flow) IS DISTINCT FROM (prior_name, prior_base_difficulty, prior_flyer_difficulty, prior_can_start_flow, prior_can_end_flow) OR NOT (retained_tag_ids @> prior_tag_ids AND retained_tag_ids <@ prior_tag_ids)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_revision_proposals_retained_pose",
                schema: "contribution",
                table: "pose_revision_proposals",
                sql: "(status = 'accepted') = (retained_name IS NOT NULL) AND (status = 'accepted') = (retained_base_difficulty IS NOT NULL) AND (status = 'accepted') = (retained_flyer_difficulty IS NOT NULL) AND (status = 'accepted') = (retained_can_start_flow IS NOT NULL) AND (status = 'accepted') = (retained_can_end_flow IS NOT NULL) AND (status = 'accepted') = (retained_tag_ids IS NOT NULL)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_pose_revision_proposals_pending_tag_ids",
                schema: "contribution",
                table: "pose_revision_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_revision_proposals_published_directly",
                schema: "contribution",
                table: "pose_revision_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_revision_proposals_retained_changes_the_pose",
                schema: "contribution",
                table: "pose_revision_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_revision_proposals_retained_pose",
                schema: "contribution",
                table: "pose_revision_proposals");

            migrationBuilder.DropColumn(
                name: "prior_tag_ids",
                schema: "contribution",
                table: "pose_revision_proposals");

            migrationBuilder.DropColumn(
                name: "retained_tag_ids",
                schema: "contribution",
                table: "pose_revision_proposals");

            migrationBuilder.DropColumn(
                name: "tag_ids",
                schema: "contribution",
                table: "pose_revision_proposals");

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_revision_proposals_published_directly",
                schema: "contribution",
                table: "pose_revision_proposals",
                sql: "NOT published_directly OR (status = 'accepted' AND decided_by = contributor_id AND decided_at = submitted_at AND adjustment_note IS NULL AND (retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_can_start_flow, retained_can_end_flow) IS NOT DISTINCT FROM (name, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow))");

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_revision_proposals_retained_changes_the_pose",
                schema: "contribution",
                table: "pose_revision_proposals",
                sql: "status <> 'accepted' OR (retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_can_start_flow, retained_can_end_flow) IS DISTINCT FROM (prior_name, prior_base_difficulty, prior_flyer_difficulty, prior_can_start_flow, prior_can_end_flow)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_revision_proposals_retained_pose",
                schema: "contribution",
                table: "pose_revision_proposals",
                sql: "(status = 'accepted') = (retained_name IS NOT NULL) AND (status = 'accepted') = (retained_base_difficulty IS NOT NULL) AND (status = 'accepted') = (retained_flyer_difficulty IS NOT NULL) AND (status = 'accepted') = (retained_can_start_flow IS NOT NULL) AND (status = 'accepted') = (retained_can_end_flow IS NOT NULL)");
        }
    }
}
