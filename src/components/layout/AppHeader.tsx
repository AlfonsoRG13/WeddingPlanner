type AppSection = "guests" | "expenses";

type AppHeaderProps = {
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
  onSignOut?: () => void;
};

function AppHeader({ activeSection, onSectionChange, onSignOut }: AppHeaderProps) {
  return (
    <header className="topbar">
      <a className="brand" href="#" aria-label="Nuestro día, inicio">
        <span className="brand-mark">N</span>
        <span>NUESTRO DÍA</span>
      </a>
      <nav className="main-nav" aria-label="Secciones">
        <button className={activeSection === "guests" ? "active" : ""} onClick={() => onSectionChange("guests")}>Invitados</button>
        <button className={activeSection === "expenses" ? "active" : ""} onClick={() => onSectionChange("expenses")}>Gastos</button>
      </nav>
      {onSignOut ? (
        <button className="button button-outline sign-out-button" onClick={onSignOut} type="button">Cerrar sesión</button>
      ) : (
        <span className="topbar-note">EL COMIENZO DE ALGO BONITO</span>
      )}
    </header>
  );
}

export default AppHeader;
