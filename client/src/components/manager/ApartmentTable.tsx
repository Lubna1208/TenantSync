type ApartmentItem = {
  id: number;
  unit: string;
  tenant: string;
  status: string;
  rent: number;
  leaseStatus: string;
  lastPayment: string;
};

type ApartmentTableProps = {
  apartments: ApartmentItem[];
  searchTerm: string;
  activeFilter: string;
  setSearchTerm: (value: string) => void;
};

export default function ApartmentTable({
  apartments,
  searchTerm,
  activeFilter,
  setSearchTerm,
}: ApartmentTableProps) {
  const normalizedSearch = searchTerm.toLowerCase().trim();

  const filteredApartments = apartments.filter((apartment) => {
    const matchesSearch =
      apartment.unit.toLowerCase().includes(normalizedSearch) ||
      apartment.tenant.toLowerCase().includes(normalizedSearch) ||
      apartment.status.toLowerCase().includes(normalizedSearch) ||
      apartment.leaseStatus.toLowerCase().includes(normalizedSearch);

    let matchesFilter = true;

    if (activeFilter === "occupied") {
      matchesFilter = apartment.status.toLowerCase() === "occupied";
    } else if (activeFilter === "vacant") {
      matchesFilter = apartment.status.toLowerCase() === "vacant";
    } else if (activeFilter === "leased") {
      matchesFilter = apartment.leaseStatus.toLowerCase() === "active";
    } else if (activeFilter === "pending") {
      matchesFilter = apartment.leaseStatus.toLowerCase() === "pending";
    }

    return matchesSearch && matchesFilter;
  });

  const getStatusBadgeClass = (status: string) => {
    const value = status.toLowerCase();

    if (value === "occupied") return "status-badge occupied";
    if (value === "vacant") return "status-badge vacant";
    if (value === "pending") return "status-badge pending";
    if (value === "resolved") return "status-badge resolved";

    return "status-badge";
  };

  const getLeaseBadgeClass = (leaseStatus: string) => {
    const value = leaseStatus.toLowerCase();

    if (value === "active") return "status-badge occupied";
    if (value === "pending") return "status-badge pending";
    if (value === "expired") return "status-badge vacant";

    return "status-badge";
  };

  return (
    <div className="dashboard-panel">
      <div className="table-header-row">
        <h3>Apartment Overview</h3>

        <input
          type="text"
          className="table-search-input"
          placeholder="Search unit, tenant, status..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div style={{ overflowX: "auto" }}>
        <table className="table">
          <thead>
            <tr>
              <th>Unit</th>
              <th>Tenant</th>
              <th>Status</th>
              <th>Rent</th>
              <th>Lease Status</th>
              <th>Last Payment</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {filteredApartments.length > 0 ? (
              filteredApartments.map((apartment) => (
                <tr key={apartment.id}>
                  <td>{apartment.unit}</td>
                  <td>{apartment.tenant}</td>
                  <td>
                    <span className={getStatusBadgeClass(apartment.status)}>
                      {apartment.status}
                    </span>
                  </td>
                  <td>${apartment.rent}</td>
                  <td>
                    <span className={getLeaseBadgeClass(apartment.leaseStatus)}>
                      {apartment.leaseStatus}
                    </span>
                  </td>
                  <td>{apartment.lastPayment}</td>
                  <td>
                    <div
                      style={{
                        display: "flex",
                        gap: "8px",
                        flexWrap: "wrap",
                      }}
                    >
                      <button className="action-btn">View</button>
                      <button className="action-btn">Edit</button>
                      <button className="action-btn">Notice</button>
                      <button className="action-btn">Maintenance</button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    textAlign: "center",
                    padding: "20px",
                    color: "#777",
                  }}
                >
                  No apartments found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}