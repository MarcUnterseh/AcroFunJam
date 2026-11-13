import { Icon } from '../layout/Icon';

/** A line of the list: the term of the field, its value before and after, as displayed. */
export type ValueChangeLine = {
  readonly key: string;
  readonly term: string;
  readonly before: string;
  readonly after: string;
};

/**
 * The values of a pose that change, « avant → après » (docs/design/composants/recapitulatif-modification.md and
 * recapitulatif-ajustements.md): one list for the adjustments (proposé → retenu) and the modifications (actuel →
 * proposé, avant → proposé…), preceded by its reading key. Read « Difficulté flyer : Actuellement : Intermédiaire,
 * proposé : Découverte »: the arrow is hidden, visually hidden texts say which value is which.
 */
export function ValueChangeList({
  lines,
  readingKey,
  beforeLabel,
  afterLabel,
}: {
  readonly lines: readonly ValueChangeLine[];
  /** « Valeur proposée → valeur retenue »: hidden from assistive technologies, the hidden texts say it. */
  readonly readingKey: string;
  /** Visually hidden text read before the value on the left (« Proposé : »). */
  readonly beforeLabel: string;
  /** Visually hidden text read before the value on the right (« , retenu : »). */
  readonly afterLabel: string;
}) {
  const [beforeKey, afterKey] = readingKey.split(' → ');
  return (
    <>
      <p className="adjustment-summary__key" aria-hidden="true">
        {beforeKey}
        <Icon name="arrow" />
        {afterKey}
      </p>
      <dl className="adjustment-summary__list">
        {lines.map((line) => (
          <div key={line.key} className="adjustment">
            <dt>{line.term}</dt>
            <dd>
              <span className="adjustment__proposed">
                <span className="visually-hidden">{beforeLabel}</span>
                {line.before}
              </span>
              <span className="adjustment__change">
                <Icon name="arrow" />
                <span className="adjustment__retained">
                  <span className="visually-hidden">{afterLabel}</span>
                  {line.after}
                </span>
              </span>
            </dd>
          </div>
        ))}
      </dl>
    </>
  );
}
