// Un template (contrairement à un layout) est re-monté à chaque navigation :
// l'animation d'entrée se rejoue donc à chaque changement de page.
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="animate-in">{children}</div>;
}
