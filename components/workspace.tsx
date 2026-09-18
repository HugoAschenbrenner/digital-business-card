import { Icon } from "./icon";
export function Workspace({
  title,
  label,
  description,
  children,
  links = true,
}: {
  title: string;
  label: string;
  description?: string;
  children: React.ReactNode;
  links?: boolean;
}) {
  return (
    <main className="workspace">
      <header className="workspace-header">
        <a href="/card" className="back-link">
          <Icon name="back" size={16} />
          Digital card
        </a>
        {links && (
          <nav className="tool-nav" aria-label="Card tools">
            <a href="/design-lab">Design lab</a>
            <a href="/qr">QR codes</a>
            <a href="/wallet-assets">Wallet assets</a>
            <a href="/admin">Admin</a>
          </nav>
        )}
      </header>
      <div className="section-intro">
        <p className="eyebrow">{label}</p>
        <h1>{title}</h1>
        {description && <p className="intro">{description}</p>}
      </div>
      {children}
    </main>
  );
}
