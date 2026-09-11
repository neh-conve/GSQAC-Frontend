export const roles = [
  {
    value: "school",
    label: "School",
    description: "School administration login",
    authMethod: "UDISE Code",
    color: "#1e3a8a",
    dashboardRoute: "/school-dashboard",
  },
  // {
  //   value: "parent",
  //   label: "Parent/Guardian",
  //   description: "Feedback & grievance portal",
  //   authMethod: "Mobile Number",
  //   color: "#f97316",
  //   dashboardRoute: "/parent-dashboard",
  // },
  {
    value: "inspector",
    label: "Verifier",
    description: "Verification & inspection",
    authMethod: "Verifier ID",
    color: "#10b981",
    dashboardRoute: "/inspector-dashboard",
  },
  {
    value: "admin",
    label: "GSQAC Admin",
    description: "Administrative dashboard",
    authMethod: "Admin ID",
    color: "#1e3a8a",
    dashboardRoute: "/admin-dashboard",
  },
  {
    value: "nodal",
    label: "Nodal Officer",
    description: "District dashboard",
    authMethod: "User ID",
    color: "#d97706",
    dashboardRoute: "/admin-dashboard",
  },
  // {
  //   value: "crc",
  //   label: "CRC",
  //   description: "Cluster Resource Coordinator",
  //   authMethod: "Cluster ID",
  //   color: "#8b5cf6",
  //   dashboardRoute: "/crc-dashboard",
  // },
];

export const getRoleByValue = (value) => {
  return roles.find((role) => role.value === value);
};

export const roleIdMap = {
  admin: 1,
  school: 2,
  inspector: 3,
  crc: 4,
  verifier: 5,
  nodal: 6,
};

export const NODAL_ROLE_ID = 6;

export const DASHBOARD_ROUTES = {
  school: "/school-dashboard",
  parent: "/parent-dashboard",
  inspector: "/inspector-dashboard",
  admin: "/admin-dashboard",
  crc: "/crc-dashboard",
  nodal: "/admin-dashboard",
};

export const isNodalRole = (role) => role === "nodal";

export const getRoleId = (roleValue) => {
  return roleIdMap[roleValue] || null;
};

export const getRoleByRoleId = (roleId) => {
  return Object.keys(roleIdMap).find((key) => roleIdMap[key] === roleId);
};

export default roles;
