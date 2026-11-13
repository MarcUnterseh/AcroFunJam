using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace AcroFunJam.Infrastructure.Persistence.Migrations
{
    /// <inheritdoc />
    public partial class AddTransitions : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "transition_proposals",
                schema: "contribution",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    contributor_id = table.Column<Guid>(type: "uuid", nullable: false),
                    from_pose_id = table.Column<Guid>(type: "uuid", nullable: false),
                    to_pose_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: true),
                    name_key = table.Column<string>(type: "text", nullable: true),
                    base_difficulty = table.Column<string>(type: "text", nullable: false),
                    flyer_difficulty = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    status = table.Column<string>(type: "text", nullable: false),
                    submitted_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false),
                    decided_by = table.Column<Guid>(type: "uuid", nullable: true),
                    decided_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: true),
                    rejection_reason = table.Column<string>(type: "text", nullable: true),
                    retained_name = table.Column<string>(type: "text", nullable: true),
                    retained_base_difficulty = table.Column<string>(type: "text", nullable: true),
                    retained_flyer_difficulty = table.Column<string>(type: "text", nullable: true),
                    retained_description = table.Column<string>(type: "text", nullable: true),
                    adjustment_note = table.Column<string>(type: "text", nullable: true),
                    published_directly = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transition_proposals", x => x.id);
                    table.CheckConstraint("ck_transition_proposals_adjustment_note", "adjustment_note IS NULL OR status = 'accepted'");
                    table.CheckConstraint("ck_transition_proposals_adjustment_note_length", "char_length(adjustment_note) <= 500");
                    table.CheckConstraint("ck_transition_proposals_base_difficulty", "base_difficulty IN ('discovery', 'beginner', 'intermediate', 'advanced')");
                    table.CheckConstraint("ck_transition_proposals_decision", "(status = 'pending') = (decided_by IS NULL) AND (status = 'pending') = (decided_at IS NULL)");
                    table.CheckConstraint("ck_transition_proposals_description", "description <> ''");
                    table.CheckConstraint("ck_transition_proposals_description_length", "char_length(description) <= 500");
                    table.CheckConstraint("ck_transition_proposals_flyer_difficulty", "flyer_difficulty IN ('discovery', 'beginner', 'intermediate', 'advanced')");
                    table.CheckConstraint("ck_transition_proposals_name_key", "(name IS NULL) = (name_key IS NULL) AND name_key <> ''");
                    table.CheckConstraint("ck_transition_proposals_name_length", "char_length(name) <= 60");
                    table.CheckConstraint("ck_transition_proposals_published_directly", "NOT published_directly OR (status = 'accepted' AND decided_by = contributor_id AND decided_at = submitted_at AND adjustment_note IS NULL AND (retained_name, retained_base_difficulty, retained_flyer_difficulty, retained_description) IS NOT DISTINCT FROM (name, base_difficulty, flyer_difficulty, description))");
                    table.CheckConstraint("ck_transition_proposals_rejection_reason", "(status = 'rejected') = (rejection_reason IS NOT NULL)");
                    table.CheckConstraint("ck_transition_proposals_rejection_reason_length", "char_length(rejection_reason) <= 500");
                    table.CheckConstraint("ck_transition_proposals_retained_base_difficulty", "retained_base_difficulty IN ('discovery', 'beginner', 'intermediate', 'advanced')");
                    table.CheckConstraint("ck_transition_proposals_retained_description_length", "char_length(retained_description) <= 500");
                    table.CheckConstraint("ck_transition_proposals_retained_flyer_difficulty", "retained_flyer_difficulty IN ('discovery', 'beginner', 'intermediate', 'advanced')");
                    table.CheckConstraint("ck_transition_proposals_retained_name_length", "char_length(retained_name) <= 60");
                    table.CheckConstraint("ck_transition_proposals_retained_transition", "(status = 'accepted') = (retained_base_difficulty IS NOT NULL) AND (status = 'accepted') = (retained_flyer_difficulty IS NOT NULL) AND (status = 'accepted' OR (retained_name IS NULL AND retained_description IS NULL))");
                    table.CheckConstraint("ck_transition_proposals_status", "status IN ('pending', 'accepted', 'rejected')");
                });

            migrationBuilder.CreateTable(
                name: "transitions",
                schema: "catalog",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    from_pose_id = table.Column<Guid>(type: "uuid", nullable: false),
                    to_pose_id = table.Column<Guid>(type: "uuid", nullable: false),
                    name = table.Column<string>(type: "text", nullable: true),
                    name_key = table.Column<string>(type: "text", nullable: true),
                    base_difficulty = table.Column<string>(type: "text", nullable: false),
                    flyer_difficulty = table.Column<string>(type: "text", nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    source_proposal_id = table.Column<Guid>(type: "uuid", nullable: true),
                    published_at = table.Column<DateTimeOffset>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_transitions", x => x.id);
                    table.CheckConstraint("ck_transitions_base_difficulty", "base_difficulty IN ('discovery', 'beginner', 'intermediate', 'advanced')");
                    table.CheckConstraint("ck_transitions_description", "description <> ''");
                    table.CheckConstraint("ck_transitions_description_length", "char_length(description) <= 500");
                    table.CheckConstraint("ck_transitions_flyer_difficulty", "flyer_difficulty IN ('discovery', 'beginner', 'intermediate', 'advanced')");
                    table.CheckConstraint("ck_transitions_name_key", "(name IS NULL) = (name_key IS NULL) AND name_key <> ''");
                    table.CheckConstraint("ck_transitions_name_length", "char_length(name) <= 60");
                    table.ForeignKey(
                        name: "fk_transitions_from_pose",
                        column: x => x.from_pose_id,
                        principalSchema: "catalog",
                        principalTable: "poses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                    table.ForeignKey(
                        name: "fk_transitions_to_pose",
                        column: x => x.to_pose_id,
                        principalSchema: "catalog",
                        principalTable: "poses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateIndex(
                name: "ix_transition_proposals_contributor_id",
                schema: "contribution",
                table: "transition_proposals",
                column: "contributor_id");

            migrationBuilder.CreateIndex(
                name: "ix_transition_proposals_pending_named_slot",
                schema: "contribution",
                table: "transition_proposals",
                columns: new[] { "from_pose_id", "to_pose_id", "name_key" },
                unique: true,
                filter: "status = 'pending' AND name_key IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_transition_proposals_pending_unnamed_slot",
                schema: "contribution",
                table: "transition_proposals",
                columns: new[] { "from_pose_id", "to_pose_id" },
                unique: true,
                filter: "status = 'pending' AND name_key IS NULL");

            migrationBuilder.CreateIndex(
                name: "ix_transitions_named_slot",
                schema: "catalog",
                table: "transitions",
                columns: new[] { "from_pose_id", "to_pose_id", "name_key" },
                unique: true,
                filter: "name_key IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "ix_transitions_to_pose_id",
                schema: "catalog",
                table: "transitions",
                column: "to_pose_id");

            migrationBuilder.CreateIndex(
                name: "ix_transitions_unnamed_slot",
                schema: "catalog",
                table: "transitions",
                columns: new[] { "from_pose_id", "to_pose_id" },
                unique: true,
                filter: "name_key IS NULL");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "transition_proposals",
                schema: "contribution");

            migrationBuilder.DropTable(
                name: "transitions",
                schema: "catalog");
        }
    }
}
