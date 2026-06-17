export default function Filterpanel({
  filters,
  activeRoom,
  activeRange,
  activeAvailability,
  onRoomChange,
  onRangeChange,
  onAvailabilityChange,
  onWorkspaceReturn,
}) {
  return (
    <aside className="catalogue-filter-panel">
      <div className="catalogue-filter-panel__header">
        <h3>Filtres</h3>
        <button type="button" className="btn btn--secondary" onClick={onWorkspaceReturn}>
          Retour
        </button>
      </div>

      <div className="catalogue-filter-panel__group">
        <label htmlFor="catalogue-room">Pièce</label>
        <select
          id="catalogue-room"
          value={activeRoom}
          onChange={(event) => onRoomChange(event.target.value)}
        >
          {filters.rooms.map((room) => (
            <option key={room} value={room}>{room}</option>
          ))}
        </select>
      </div>

      <div className="catalogue-filter-panel__group">
        <label htmlFor="catalogue-range">Gamme</label>
        <select
          id="catalogue-range"
          value={activeRange}
          onChange={(event) => onRangeChange(event.target.value)}
        >
          {filters.ranges.map((range) => (
            <option key={range} value={range}>{range}</option>
          ))}
        </select>
      </div>

      <div className="catalogue-filter-panel__group">
        <label htmlFor="catalogue-availability">Disponibilité</label>
        <select
          id="catalogue-availability"
          value={activeAvailability}
          onChange={(event) => onAvailabilityChange(event.target.value)}
        >
          {filters.availability.map((value) => (
            <option key={value} value={value}>{value}</option>
          ))}
        </select>
      </div>
    </aside>
  );
}
