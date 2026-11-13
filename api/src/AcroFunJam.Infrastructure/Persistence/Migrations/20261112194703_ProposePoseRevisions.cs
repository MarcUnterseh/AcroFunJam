using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcroFunJam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class ProposePoseRevisions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "pose_revision_proposals",
                schema: "contribution",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    contributor_id = table.Column<Guid>(type: "uuid", nullable: false),
                    pose_id = table.Column<Guid>(type: "uuid", nullable: false),
                    base_version = table.Column<int>(type: "integer", nullable: false),
                    prior_name = table.Column<string>(type: "text", nullable: false),
                    prior_base_difficulty = table.Column<string>(type: "text", nullable: false),
                    prior_flyer_difficulty = table.Column<string>(type: "text", nullable: false),
                    prior_can_start_flow = table.Column<bool>(type: "boolean", nullable: false),
                    prior_can_end_flow = table.Column<bool>(type: "boolean", nullable: false),
                    name = table.Column<string>(type: "text", nullable: false),
                    base_difficulty = table.Column<string>(type: "text", nullable: false),
                    flyer_difficulty = table.Column<string>(type: "text", nullable: false),
                    can_start_flow = table.Column<bool>(type: "boolean", nullable: false),
                    can_end_flow = table.Column<bool>(type: "boolean", nullable: false),
                    reserved_name_key = table.Column<string>(type: "text", nullable: true),
                    message = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    submitted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    decided_by = table.Column<Guid>(type: "uuid", nullable: true),
                    decided_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    rejection_reason = table.Column<string>(type: "text", nullable: true),
                    retained_name = table.Column<string>(type: "text", nullable: true),
                    retained_base_difficulty = table.Column<string>(type: "text", nullable: true),
                    retained_flyer_difficulty = table.Column<string>(type: "text", nullable: true),
                    retained_can_start_flow = table.Column<bool>(type: "boolean", nullable: true),
                    retained_can_end_flow = table.Column<bool>(type: "boolean", nullable: true),
                    adjustment_note = table.Column<string>(type: "text", nullable: true),
                    published_directly = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_pose_revision_proposals", x => x.id);
                    table.CheckConstraint("ck_pose_revision_proposals_adjustment_note", "adjustment_note IS NULL OR status = 'accepted'");
                    table.CheckConstraint("ck_pose_revision_proposals_adjustment_note_length", "char_length(adjustment_note) <= 500");
                    table.CheckConstraint("ck_pose_revision_proposals_base_difficulty", "base_difficulty IN ('discovery', 'beginner', 'intermediate', 'advanced')");
                    table.CheckConstraint("ck_pose_revision_proposals_base_version", "base_version >= 1");
                    table.CheckConstraint("ck_pose_revision_proposals_decision", "(status = 'pending') = (decided_by IS NULL) AND (status = 'pending') = (decided_at IS NULL)");
                    table.CheckConstraint("ck_pose_revision_proposals_flyer_difficulty", "flyer_difficulty IN ('discovery', 'beginner', 'intermediate', 'advanced')");
                    table.CheckConstraint("ck_pose_revision_proposals_message_length", "char_length(message) <= 500");
                    table.CheckConstraint("ck_pose_revision_proposals_name_length", "char_length(name) <= 60");
                    table.CheckConstraint("ck_pose_revision_proposals_prior_base_difficulty", "prior_base_difficulty IN ('discovery', 'beginner', 'intermediate', 'advanced')");
                    table.CheckConstraint("ck_pose_revision_proposals_prior_flyer_difficulty", "prior_flyer_difficulty IN ('discovery', 'beginner', 'intermediate', 'advanced')");
                    table.CheckConstraint("ck_pose_revision_proposals_prior_name_length", "char_length(prior_name) <= 60");
                    table.CheckConstraint("ck_pose_revision_proposals_published_directly", "NOT published_directly OR (status = 'accepted' AND decided_by = contributor_id AND decided_at = submitted_at AND adjustment_note IS NULL AND (retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_can_start_flow, retained_can_end_flow) IS NOT DISTINCT FROM (name, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow))");
                    table.CheckConstraint("ck_pose_revision_proposals_rejection_reason", "(status = 'rejected') = (rejection_reason IS NOT NULL)");
                    table.CheckConstraint("ck_pose_revision_proposals_rejection_reason_length", "char_length(rejection_reason) <= 500");
                    table.CheckConstraint("ck_pose_revision_proposals_reserved_name_key", "reserved_name_key IS NULL OR reserved_name_key <> ''");
                    table.CheckConstraint("ck_pose_revision_proposals_retained_base_difficulty", "retained_base_difficulty IN ('discovery', 'beginner', 'intermediate', 'advanced')");
                    table.CheckConstraint("ck_pose_revision_proposals_retained_changes_the_pose", "status <> 'accepted' OR (retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_can_start_flow, retained_can_end_flow) IS DISTINCT FROM (prior_name, prior_base_difficulty, prior_flyer_difficulty, prior_can_start_flow, prior_can_end_flow)");
                    table.CheckConstraint("ck_pose_revision_proposals_retained_flyer_difficulty", "retained_flyer_difficulty IN ('discovery', 'beginner', 'intermediate', 'advanced')");
                    table.CheckConstraint("ck_pose_revision_proposals_retained_name_length", "char_length(retained_name) <= 60");
                    table.CheckConstraint("ck_pose_revision_proposals_retained_pose", "(status = 'accepted') = (retained_name IS NOT NULL) AND (status = 'accepted') = (retained_base_difficulty IS NOT NULL) AND (status = 'accepted') = (retained_flyer_difficulty IS NOT NULL) AND (status = 'accepted') = (retained_can_start_flow IS NOT NULL) AND (status = 'accepted') = (retained_can_end_flow IS NOT NULL)");
                    table.CheckConstraint("ck_pose_revision_proposals_status", "status IN ('pending', 'accepted', 'rejected')");
                });

            migrationBuilder.CreateIndex(
                name: "ix_pose_revision_proposals_contributor_id",
                schema: "contribution",
                table: "pose_revision_proposals",
                column: "contributor_id");

            migrationBuilder.CreateIndex(
                name: "ix_pose_revision_proposals_pending_pose_id",
                schema: "contribution",
                table: "pose_revision_proposals",
                column: "pose_id",
                unique: true,
                filter: "status = 'pending'");

            migrationBuilder.CreateIndex(
                name: "ix_pose_revision_proposals_pending_reserved_name_key",
                schema: "contribution",
                table: "pose_revision_proposals",
                column: "reserved_name_key",
                unique: true,
                filter: "status = 'pending'");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "pose_revision_proposals",
                schema: "contribution");
        }
    }
}
