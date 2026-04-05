// Manager Info
export const managerInfo = {
  name: "John Doe",
  email: "manager@tenantsync.com",
  role: "Building Manager",
};

// Stats Cards Data
export const statsData = [
  {
    id: "all",
    label: "Total Apartments",
    value: 24,
    note: "All available units",
    icon: "🏢",
  },
  {
    id: "occupied",
    label: "Occupied",
    value: 18,
    note: "Currently rented",
    icon: "✅",
  },
  {
    id: "vacant",
    label: "Vacant",
    value: 6,
    note: "Ready for new tenants",
    icon: "🟠",
  },
  {
    id: "pending",
    label: "Pending Complaints",
    value: 5,
    note: "Need attention",
    icon: "⚠️",
  },
];

// Apartments List
export const apartments = [
  {
    id: 1,
    unit: "A-101",
    tenant: "Rahim Uddin",
    status: "Occupied",
    rent: 12000,
    leaseStatus: "Active",
    lastPayment: "2026-03-28",
  },
  {
    id: 2,
    unit: "A-102",
    tenant: "Karim Hasan",
    status: "Occupied",
    rent: 13500,
    leaseStatus: "Pending",
    lastPayment: "2026-03-20",
  },
  {
    id: 3,
    unit: "B-201",
    tenant: "Empty",
    status: "Vacant",
    rent: 10000,
    leaseStatus: "Expired",
    lastPayment: "N/A",
  },
  {
    id: 4,
    unit: "B-202",
    tenant: "Nusrat Jahan",
    status: "Occupied",
    rent: 15000,
    leaseStatus: "Active",
    lastPayment: "2026-04-01",
  },
];

// Complaints List
export const complaints = [
  {
    id: 1,
    title: "Water Leakage",
    unit: "A-101",
    tenant: "Rahim Uddin",
    priority: "High",
    time: "10 mins ago",
    status: "Pending",
  },
  {
    id: 2,
    title: "AC Not Working",
    unit: "A-102",
    tenant: "Karim Hasan",
    priority: "Medium",
    time: "1 hour ago",
    status: "In Progress",
  },
  {
    id: 3,
    title: "Broken Window Lock",
    unit: "B-201",
    tenant: "Nusrat Jahan",
    priority: "Low",
    time: "Today, 9:30 AM",
    status: "Resolved",
  },
];

// Maintenance List
export const maintenanceItems = [
  {
    id: 1,
    title: "AC Servicing",
    unit: "A-102",
    assignedPerson: "Technician Hasan",
    status: "Assigned",
    eta: "Today, 5:00 PM",
  },
  {
    id: 2,
    title: "Water Pipe Repair",
    unit: "B-201",
    assignedPerson: "Plumber Karim",
    status: "In Progress",
    eta: "Tomorrow, 11:00 AM",
  },
  {
    id: 3,
    title: "Wall Painting",
    unit: "C-301",
    assignedPerson: "Painter Rahat",
    status: "Pending",
    eta: "Not Scheduled",
  },
  {
    id: 4,
    title: "Lift Inspection",
    unit: "Main Block",
    assignedPerson: "Engineer Sohan",
    status: "Completed",
    eta: "Done",
  },
];

// Quick Actions
export const quickActions = [
  {
    id: 1,
    label: "Add Property",
    description: "Add new apartment or building",
    icon: "🏢",
  },
  {
    id: 2,
    label: "New Tenant",
    description: "Register a new tenant",
    icon: "👤",
  },
  {
    id: 3,
    label: "Create Lease",
    description: "Create new lease agreement",
    icon: "📄",
  },
  {
    id: 4,
    label: "Inspection",
    description: "Schedule property inspection",
    icon: "🔍",
  },
  {
    id: 5,
    label: "Send Notice",
    description: "Send notice to tenants",
    icon: "📢",
  },
  {
    id: 6,
    label: "Maintenance",
    description: "Create maintenance request",
    icon: "🛠️",
  },
];