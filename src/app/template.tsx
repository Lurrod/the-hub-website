// Un template (contrairement à un layout) est re-monté à chaque navigation :
// l'animation d'entrée se rejoue donc à chaque changement de page.
// `t-skel-in` porte la moitié « entrée » du snippet 14 (fondu + sortie de
// flou) : c'est ce qui donne au passage squelette -> contenu l'allure d'un
// fondu croisé, alors que Suspense démonte le squelette d'un coup.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="t-skel-in">{children}</div>;
}
