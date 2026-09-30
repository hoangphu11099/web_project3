export function PanelHeader({ title, sub }: { title: string; sub: string }) {
  return <div className="panel-header"><div><h2>{title}</h2><p>{sub}</p></div></div>;
}
