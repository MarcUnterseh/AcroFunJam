using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcroFunJam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RecordDirectPublications : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "published_directly",
                schema: "contribution",
                table: "pose_proposals",
                type: "boolean",
                nullable: false,
                defaultValue: false);

            // Data recovery (ADR 0023), applied once: until now, only Submit recorded a decision in the same request as the
            // submission, by the contributor themselves, retaining the proposed pose without note; an acceptance by a validator
            // comes in a later request. Same condition as the check constraint below, so that an atypical row (adjusted at the
            // very instant of the submission) stays an ordinary acceptance instead of blocking the deployment.
            migrationBuilder.Sql(
                """
                UPDATE contribution.pose_proposals
                SET published_directly = true
                WHERE status = 'accepted' AND decided_by = contributor_id AND decided_at = submitted_at AND adjustment_note IS NULL
                  AND (retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_can_start_flow, retained_can_end_flow)
                      IS NOT DISTINCT FROM (name, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow)
                """);

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_proposals_published_directly",
                schema: "contribution",
                table: "pose_proposals",
                sql: "NOT published_directly OR (status = 'accepted' AND decided_by = contributor_id AND decided_at = submitted_at AND adjustment_note IS NULL AND (retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_can_start_flow, retained_can_end_flow) IS NOT DISTINCT FROM (name, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow))");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_proposals_published_directly",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropColumn(
                name: "published_directly",
                schema: "contribution",
                table: "pose_proposals");
        }
    }
}
