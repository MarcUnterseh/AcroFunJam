import { PoseList } from './PoseList';
import { usePublishedPoses } from './usePublishedPoses';

export function CatalogPage() {
  const { data: poses, error, isPending } = usePublishedPoses();
  if (error) return <p role="alert">{error.message}</p>;
  if (isPending) return <p>Chargement du catalogue…</p>;
  if (poses.length === 0) return <p>Le catalogue ne contient encore aucune pose.</p>;
  return <PoseList poses={poses} />;
}
