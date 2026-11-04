using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcroFunJam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class RecordRetainedPoses : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "adjustment_note",
                schema: "contribution",
                table: "pose_proposals",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "retained_base_difficulty",
                schema: "contribution",
                table: "pose_proposals",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "retained_can_end_flow",
                schema: "contribution",
                table: "pose_proposals",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "retained_can_start_flow",
                schema: "contribution",
                table: "pose_proposals",
                type: "boolean",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "retained_flyer_difficulty",
                schema: "contribution",
                table: "pose_proposals",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "retained_name",
                schema: "contribution",
                table: "pose_proposals",
                type: "text",
                nullable: true);

            // The proposals accepted so far were accepted as proposed (story 4, step A): their retained pose is their
            // proposed pose, without adjustment note. Done before the consistency constraints below (ADR 0022).
            migrationBuilder.Sql(
                """
                UPDATE contribution.pose_proposals
                SET retained_name = name,
                    retained_base_difficulty = base_difficulty,
                    retained_flyer_difficulty = flyer_difficulty,
                    retained_can_start_flow = can_start_flow,
                    retained_can_end_flow = can_end_flow
                WHERE status = 'accepted';
                """);

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_proposals_adjustment_note",
                schema: "contribution",
                table: "pose_proposals",
                sql: "adjustment_note IS NULL OR status = 'accepted'");

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_proposals_adjustment_note_length",
                schema: "contribution",
                table: "pose_proposals",
                sql: "char_length(adjustment_note) <= 500");

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_proposals_adjustment_note_with_adjustments",
                schema: "contribution",
                table: "pose_proposals",
                sql: "adjustment_note IS NULL OR (retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_can_start_flow, retained_can_end_flow) IS DISTINCT FROM (name, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow)");

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_proposals_retained_base_difficulty",
                schema: "contribution",
                table: "pose_proposals",
                sql: "retained_base_difficulty IN ('discovery', 'beginner', 'intermediate', 'advanced')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_proposals_retained_flyer_difficulty",
                schema: "contribution",
                table: "pose_proposals",
                sql: "retained_flyer_difficulty IN ('discovery', 'beginner', 'intermediate', 'advanced')");

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_proposals_retained_name_length",
                schema: "contribution",
                table: "pose_proposals",
                sql: "char_length(retained_name) <= 60");

            migrationBuilder.AddCheckConstraint(
                name: "ck_pose_proposals_retained_pose",
                schema: "contribution",
                table: "pose_proposals",
                sql: "(status = 'accepted') = (retained_name IS NOT NULL) AND (status = 'accepted') = (retained_base_difficulty IS NOT NULL) AND (status = 'accepted') = (retained_flyer_difficulty IS NOT NULL) AND (status = 'accepted') = (retained_can_start_flow IS NOT NULL) AND (status = 'accepted') = (retained_can_end_flow IS NOT NULL)");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Explicit guard: reverting would silently lose the retained pose (what the catalog published) and the note of
            // the acceptances with adjustments (ADR 0022). Only the acceptances as proposed can be reverted.
            migrationBuilder.Sql(
                """
                DO $$ BEGIN
                    IF EXISTS (
                        SELECT 1 FROM contribution.pose_proposals
                        WHERE status = 'accepted'
                          AND (adjustment_note IS NOT NULL
                               OR (retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_can_start_flow, retained_can_end_flow)
                                  IS DISTINCT FROM (name, base_difficulty, flyer_difficulty, can_start_flow, can_end_flow)))
                    THEN RAISE EXCEPTION 'contribution.pose_proposals contient des acceptations avec ajustements (story 4) : leur pose retenue serait perdue';
                    END IF;
                END $$;
                """);

            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_proposals_adjustment_note",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_proposals_adjustment_note_length",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_proposals_adjustment_note_with_adjustments",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_proposals_retained_base_difficulty",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_proposals_retained_flyer_difficulty",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_proposals_retained_name_length",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropCheckConstraint(
                name: "ck_pose_proposals_retained_pose",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropColumn(
                name: "adjustment_note",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropColumn(
                name: "retained_base_difficulty",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropColumn(
                name: "retained_can_end_flow",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropColumn(
                name: "retained_can_start_flow",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropColumn(
                name: "retained_flyer_difficulty",
                schema: "contribution",
                table: "pose_proposals");

            migrationBuilder.DropColumn(
                name: "retained_name",
                schema: "contribution",
                table: "pose_proposals");
        }
    }
}
