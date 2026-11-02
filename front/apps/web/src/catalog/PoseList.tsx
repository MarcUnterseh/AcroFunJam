import { difficultyLevelLabel, type PoseSummary } from '@acrofunjam/core';

type PoseListProps = { readonly poses: readonly PoseSummary[] };

export function PoseList({ poses }: PoseListProps) {
  return (
    <table aria-label="Poses du catalogue">
      <thead>
        <tr>
          <th scope="col">Nom</th>
          <th scope="col">Difficulté base</th>
          <th scope="col">Difficulté flyer</th>
        </tr>
      </thead>
      <tbody>
        {poses.map((pose) => (
          <tr key={pose.id}>
            <td>{pose.name}</td>
            <td>{difficultyLevelLabel(pose.baseDifficulty)}</td>
            <td>{difficultyLevelLabel(pose.flyerDifficulty)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
