import { useMemo, useState } from "react";
import { enqueueSnackbar } from "notistack";
import { useGetAllDistrictsQuery } from "../../../../services/adminService";
import {
  getVerifierRegistrations,
  useGetVerifierRegistrationsQuery,
} from "../../../../services/verifierRegistrationService";
import { exportToExcel } from "../../../../utils/exportToExcel";
import useAuthStore from "../../../../store/useAuthStore";
import { isNodalRole } from "../../../../constants/roles";
import {
  EXCEL_COLUMNS,
  enrichRegistrationRow,
} from "../utils/verifierRegistrationAdminUtils";

export function useVerifierRegistrationList() {
  const role = useAuthStore((s) => s.role);
  const authDistrictId = useAuthStore((s) => s.districtId);
  const districtId =
    isNodalRole(role) && Number(authDistrictId) > 0
      ? Number(authDistrictId)
      : undefined;

  const [searchQuery, setSearchQuery] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedRow, setSelectedRow] = useState(null);
  const [exporting, setExporting] = useState(false);

  const { data: districtsData } = useGetAllDistrictsQuery();
  const districts = districtsData?.data || [];

  const { data, isLoading, isError, refetch, isFetching } =
    useGetVerifierRegistrationsQuery({
      page: currentPage,
      limit: itemsPerPage,
      search: appliedSearch || undefined,
      districtId,
    });

  const payload = data?.data || data || {};
  const rows = useMemo(
    () => (payload.rows || []).map((row) => enrichRegistrationRow(row, districts)),
    [payload.rows, districts],
  );
  const totalCount = payload.total || 0;

  const handleSearch = () => {
    setCurrentPage(0);
    setAppliedSearch(searchQuery.trim());
  };

  const handleViewDetails = (row) => {
    setSelectedRow(row);
  };

  const handleCloseModal = () => {
    setSelectedRow(null);
  };

  const handleExportToExcel = async () => {
    setExporting(true);
    try {
      const response = await getVerifierRegistrations({
        page: 0,
        limit: 10000,
        search: appliedSearch || undefined,
        districtId,
      });
      const list = response?.data?.rows || response?.rows || [];
      const enriched = list.map((row) => enrichRegistrationRow(row, districts));

      if (!enriched.length) {
        enqueueSnackbar("No registrations to export", { variant: "warning" });
        return;
      }

      exportToExcel(
        enriched,
        EXCEL_COLUMNS,
        "verifier_registrations",
        "Registrations",
      );
      enqueueSnackbar("Excel downloaded successfully", { variant: "success" });
    } catch (error) {
      enqueueSnackbar(
        error?.response?.data?.message || "Failed to export Excel",
        { variant: "error" },
      );
    } finally {
      setExporting(false);
    }
  };

  const columns = districtId
    ? [
        {
          id: "registrationId",
          label: "ID",
          render: (row) => row.registrationId,
        },
        {
          id: "fullName",
          label: "Name",
          render: (row) => row.fullName || "-",
        },
        {
          id: "mobileNumber",
          label: "Mobile",
          render: (row) => row.mobileNumber || "-",
        },
        {
          id: "email",
          label: "Email",
          render: (row) => row.email || "-",
        },
        {
          id: "jobDistrict",
          label: "Job District",
          render: (row) => row.jobDistrictName || "-",
        },
        {
          id: "createdAt",
          label: "Registered At",
          render: (row) => row.createdAtLabel || "-",
        },
      ]
    : [
    {
      id: "registrationId",
      label: "ID",
      render: (row) => row.registrationId,
    },
    {
      id: "fullName",
      label: "Name",
      render: (row) => row.fullName || "-",
    },
    {
      id: "mobileNumber",
      label: "Mobile",
      render: (row) => row.mobileNumber || "-",
    },
    {
      id: "email",
      label: "Email",
      render: (row) => row.email || "-",
    },
    {
      id: "district",
      label: "Preferred District 1",
      render: (row) => row.preferredDistrict1Name || "-",
    },
    {
      id: "block",
      label: "Preferred Block 1",
      render: (row) => row.preferredTaluka1 || "-",
    },
    {
      id: "createdAt",
      label: "Registered At",
      render: (row) => row.createdAtLabel || "-",
    },
  ];

  return {
    searchQuery,
    setSearchQuery,
    currentPage,
    setCurrentPage,
    itemsPerPage,
    setItemsPerPage,
    selectedRow,
    rows,
    totalCount,
    columns,
    isLoading: isLoading || isFetching,
    isError,
    exporting,
    handleSearch,
    handleViewDetails,
    handleCloseModal,
    handleExportToExcel,
    refetch,
    districtScoped: !!districtId,
  };
}
