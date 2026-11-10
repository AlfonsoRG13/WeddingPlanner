type GuestSummaryProps = {
  totalInvitees: number;
  symbolicCount: number;
  childrenCount: number;
  confirmedCount: number;
  plusOneCount: number;
  onAddGuest: () => void;
};

function GuestSummary({
  totalInvitees,
  symbolicCount,
  childrenCount,
  confirmedCount,
  plusOneCount,
  onAddGuest,
}: GuestSummaryProps) {
  const summaryStats = [
    { value: totalInvitees, label: "INVITADOS" },
    { value: symbolicCount, label: "SIMBÓLICOS" },
    { value: childrenCount, label: "NIÑOS" },
    { value: confirmedCount, label: "CONFIRMADOS" },
    { value: plusOneCount, label: "CON ACOMPAÑANTE" },
  ];

  return (
    <section className="overview" aria-label="Resumen de invitados">
      <div className="overview-label">LISTA DE INVITADOS</div>
      <div className="overview-stats">
        {summaryStats.map((stat, index) => (
          <div className="overview-stat-group" key={stat.label}>
            {index > 0 && <div className="stat-divider" />}
            <div className="stat"><strong>{stat.value}</strong><span>{stat.label}</span></div>
          </div>
        ))}
      </div>
      <button className="button button-dark" onClick={onAddGuest}><span>＋</span> Agregar invitado</button>
    </section>
  );
}

export default GuestSummary;
