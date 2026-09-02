import { cloneElement, isValidElement, useId, type ReactElement, type ReactNode } from "react";

/**
 * Infobulle au survol ou au focus clavier, snippet `17-tooltip`. Pur CSS :
 * c'est l'enveloppe et non le déclencheur qui porte le survol, pour que le
 * pointeur puisse glisser sur la bulle sans la faire clignoter.
 *
 * Remplace les attributs `title=` natifs, dont l'apparition est lente,
 * non stylable et absente au focus clavier.
 */
export default function Tooltip({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <span className={`t-tt-wrap ${className ?? ""}`}>
      {/* `aria-describedby` était posé ici, sur un `display:contents` sans
          boîte ni focus : la description n'était jamais annoncée. On le
          transmet à l'enfant réel — l'élément que l'utilisateur atteint. */}
      <span className="t-tt-trigger contents">
        {isValidElement(children)
          ? cloneElement(children as ReactElement<{ "aria-describedby"?: string }>, {
              "aria-describedby": id,
            })
          : children}
      </span>
      <span className="t-tt" id={id} role="tooltip">
        {label}
      </span>
    </span>
  );
}
