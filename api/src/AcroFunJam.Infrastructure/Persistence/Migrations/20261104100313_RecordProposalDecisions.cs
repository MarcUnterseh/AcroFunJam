using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcroFunJam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RecordProposalDecisions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_proposals_status",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.RenameColumn(
                name: "accepted_by",
                schema: "contribution",
                table: "pose_proposals",
                newName: "decided_by");

            migrationBuilder.RenameColumn(
                name: "accepted_at",
                schema: "contribution",
                table: "pose_proposals",
                newName: "decided_at");

            migrationBuilder.AddColumn<string>(
                name: "rejection_reason",
                schema: "contribution",
                table: "pose_proposals",
                type: "text",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "ix_pose_proposals_pending_submitted_at",
                schema: "contribution",
                table: "pose_proposals",
                column: "submitted_at",
                filter: "status = 'pending'");

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_proposals_decision",
                schema: "contribution",
                table: "pose_proposals",
                sql: "(status = 'pending') = (decided_by IS NULL) AND (status = 'pending') = (decided_at IS NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_proposals_rejection_reason",
                schema: "contribution",
                table: "pose_proposals",
                sql: "(status = 'rejected') = (rejection_reason IS NOT NULL)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_proposals_rejection_reason_length",
                schema: "contribution",
                table: "pose_proposals",
                sql: "char_length(rejection_reason) <= 500");

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_proposals_status",
                schema: "contribution",
                table: "pose_proposals",
                sql: "status IN ('pending', 'accepted', 'rejected')");
        }

        /// <inheritdoc />
        // Down assumes no proposal is rejected: the former status constraint only allows 'pending' and 'accepted'.
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "ix_pose_proposals_pending_submitted_at",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_proposals_decision",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_proposals_rejection_reason",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_proposals_rejection_reason_length",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_proposals_status",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropColumn(
                name: "rejection_reason",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.RenameColumn(
                name: "decided_by",
                schema: "contribution",
                table: "pose_proposals",
                newName: "accepted_by");

            migrationBuilder.RenameColumn(
                name: "decided_at",
                schema: "contribution",
                table: "pose_proposals",
                newName: "accepted_at");

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_proposals_status",
                schema: "contribution",
                table: "pose_proposals",
                sql: "status IN ('pending', 'accepted')");
        }
    }
}
