import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "../config/axios";
import { queryKeys } from "../config/queryClient";
import { enqueueSnackbar } from "notistack";
import useAuthStore from "../store/useAuthStore";
import { getRoleId } from "../constants/roles";
import { uploadFileToPresignedUrl } from "./evidenceService";

/** @param {Object} payload */
function resolveSubdomainSubmitRoleId(payload) {
  if (payload?.roleId != null && payload.roleId !== "") {
    return Number(payload.roleId);
  }
  const authRole = useAuthStore.getState().role;
  if (!authRole) return null;
  const id = getRoleId(authRole);
  return id != null ? Number(id) : null;
}

/**
 * Get domains and subdomains for verifier/inspector
 * @param {Object} params - { roleId?: number, languageCode?: string }
 * @returns {Promise} API response
 */
export const getDomains = async (params = {}) => {
  const { roleId, languageCode, schoolId, ...otherParams } = params;
  const config = {
    params: { languageCode, ...otherParams },
    headers: {},
  };

  // Add schoolId to params if provided
  if (schoolId) {
    config.params.schoolId = schoolId;
  }

  if (roleId) {
    config.headers.roleId = roleId;
  }

  const response = await axiosInstance.get("/questionnaire/domain", config);
  return response.data;
};

/**
 * Get subdomain questions for verifier/inspector
 * @param {Object} params - Query parameters
 * @returns {Promise} API response
 */
export const getSubdomainQuestions = async (params) => {
  const {
    roleId,
    subDomainId,
    languageCode,
    userId,
    cls,
    section,
    subjectId,
    schoolId,
    ...otherParams
  } = params;
  const config = {
    params: { subDomainId, languageCode, ...otherParams },
    headers: {},
  };

  // Add cls to params if provided
  if (cls) {
    config.params.cls = cls;
  }

  // Add section to params if provided
  if (section) {
    config.params.section = section;
  }

  // Add subjectId to params if provided
  if (subjectId) {
    config.params.subjectId = subjectId;
  }

  // Add schoolId to params if provided
  if (schoolId) {
    config.params.schoolId = schoolId;
  }

  // Set roleId in header if provided
  if (roleId) {
    config.headers.roleId = roleId;
  }

  // Get userId from auth store if not provided in params, and set in header if present
  const authState = useAuthStore.getState();
  const userIdToSend = userId || authState.userId;
  if (userIdToSend) {
    config.headers.userId = userIdToSend;
  }

  const response = await axiosInstance.get("/questionnaire/question", config);
  return response.data;
};

/**
 * Submit answer for a single question
 * @param {Object} payload - Answer payload
 * @returns {Promise} API response
 */
export const submitAnswer = async (payload) => {
  const response = await axiosInstance.post("/questionnaire/answer", payload);
  return response.data;
};

/**
 * Submit all answers for a subdomain
 * @param {Object} payload - Answers payload (should include schoolId, questionType, roleId optional)
 * @param {number} payload.questionType - Question type (1: General, 2: Classroom Observation, 3: Subject Observation, 4: FLN)
 * @returns {Promise} API response
 */
export const submitSubdomainWiseAnswers = async (payload) => {
  const roleId = resolveSubdomainSubmitRoleId(payload);
  const body = {
    ...payload,
    ...(roleId != null ? { roleId } : {}),
  };
  const config = roleId != null ? { headers: { roleId } } : undefined;
  const response = await axiosInstance.post(
    "/school/sub-domain-wise-submit-answers",
    body,
    config,
  );
  return response.data;
};

/**
 * React Query hook for getting domains (verifier/inspector)
 * @param {Object} options - Query options
 * @param {number} options.roleId - Role ID (will be sent in header)
 * @param {string} options.languageCode - Language code (EN, HI, GU)
 * @param {string} options.schoolId - School ID (optional)
 * @param {boolean} options.enabled - Whether the query should run
 * @returns {Object} Query object from React Query
 */
export const useGetDomainsQuery = ({
  roleId,
  languageCode,
  schoolId,
  enabled = true,
}) => {
  return useQuery({
    queryKey: queryKeys.verifier.domains(roleId, languageCode, schoolId),
    queryFn: () => getDomains({ roleId, languageCode, schoolId }),
    enabled: enabled && !!roleId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * React Query hook for getting subdomain questions
 * @param {Object} options - Query options
 * @returns {Object} Query object from React Query
 */
export const useGetSubdomainQuestionsQuery = ({
  subDomainId,
  roleId,
  languageCode,
  classNumber,
  section,
  subjectId,
  userId,
  schoolId,
  enabled = true,
}) => {
  return useQuery({
    queryKey: queryKeys.verifier.subdomainQuestions(
      subDomainId,
      roleId,
      languageCode,
      classNumber,
      section,
      subjectId,
      schoolId,
    ),
    queryFn: () =>
      getSubdomainQuestions({
        subDomainId,
        roleId,
        languageCode,
        cls: classNumber,
        section,
        subjectId,
        userId,
        schoolId,
      }),
    enabled: enabled && !!subDomainId && !!roleId,
    staleTime: 5 * 60 * 1000,
  });
};

/**
 * React Query hook for submitting answer
 * @param {Object} options - Mutation options
 * @returns {Object} Mutation object from React Query
 */
export const useSubmitAnswerMutation = (options = {}) => {
  return useMutation({
    mutationFn: (data) => submitAnswer(data),
    mutationKey: queryKeys.verifier.submitAnswer(),
    onSuccess: (data) => {
      enqueueSnackbar(data?.message || "Answer submitted successfully", {
        variant: "success",
      });
      if (options.onSuccess) {
        options.onSuccess(data);
      }
    },
    onError: (error) => {
      enqueueSnackbar(
        error?.response?.data?.message || "Failed to submit answer",
        {
          variant: "error",
        },
      );
      if (options.onError) {
        options.onError(error);
      }
    },
    ...options,
  });
};

/**
 * React Query hook for submitting subdomain-wise answers
 * @param {Object} options - Mutation options
 * @returns {Object} Mutation object from React Query
 */
export const useSubmitSubdomainWiseAnswersMutation = (options = {}) => {
  return useMutation({
    mutationFn: (data) => submitSubdomainWiseAnswers(data),
    mutationKey: queryKeys.verifier.submitSubdomainWiseAnswers(),
    onSuccess: (data) => {
      enqueueSnackbar(data?.message || "Answers submitted successfully", {
        variant: "success",
      });
      if (options.onSuccess) {
        options.onSuccess(data);
      }
    },
    onError: (error) => {
      enqueueSnackbar(
        error?.response?.data?.message || "Failed to submit answers",
        {
          variant: "error",
        },
      );
      if (options.onError) {
        options.onError(error);
      }
    },
    ...options,
  });
};

/**
 * Get school data
 * @param {Object} params - { schoolId?: number, userName?: string, academicYear?: string }
 * @returns {Promise} API response
 */
export const getSchoolData = async (params) => {
  const response = await axiosInstance.get("/school/school-data", { params });
  return response.data;
};

/**
 * Get all sections by schoolId
 * @param {Object} params - { schoolId: string }
 * @returns {Promise} API response
 */
export const getSchoolSections = async (params) => {
  const response = await axiosInstance.get("/school/section", {
    params,
  });
  return response.data;
};

/**
 * Get school grades with student counts
 * @param {Object} params - { schoolId: string }
 * @returns {Promise} API response
 */
export const getSchoolGrades = async (params) => {
  const response = await axiosInstance.get("/school/grades", { params });
  return response.data;
};

/**
 * Submit final assessment
 * @param {Object} payload - { userId: number, roleId: number, isSubmitted: number }
 * @returns {Promise} API response
 */
export const submitAssessment = async (payload) => {
  const response = await axiosInstance.post(
    "/school/submit-assessment",
    payload,
  );
  return response.data;
};

/**
 * React Query hook for getting school data
 * @param {Object} options - Query options
 * @param {number} options.schoolId - School ID (optional)
 * @param {string} options.userName - User Name (optional, preferred over schoolId)
 * @param {string} options.academicYear - Academic Year (optional)
 * @param {boolean} options.enabled - Whether the query should run
 * @returns {Object} Query object from React Query
 */
export const useGetSchoolDataQuery = ({
  schoolId,
  userName,
  academicYear,
  enabled = true,
}) => {
  return useQuery({
    queryKey: queryKeys.verifier.schoolData(schoolId || userName, academicYear),
    queryFn: () => {
      const params = {};
      if (userName) {
        params.userName = userName;
      } else if (schoolId) {
        params.schoolId = schoolId;
      }
      if (academicYear) {
        params.academicYear = academicYear;
      }
      return getSchoolData(params);
    },
    enabled: enabled && (!!userName || !!schoolId),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * React Query hook for getting all school sections
 * @param {Object} options - Query options
 * @param {string} options.schoolId - School ID
 * @param {boolean} options.enabled - Whether the query should run
 * @returns {Object} Query object from React Query
 */
export const useGetSchoolSectionsQuery = ({ schoolId, enabled = true }) => {
  return useQuery({
    queryKey: queryKeys.verifier.schoolSections(schoolId),
    queryFn: () => getSchoolSections({ schoolId }),
    enabled: enabled && !!schoolId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

/**
 * React Query hook for getting school grades with student counts
 * @param {Object} options - Query options
 * @param {string} options.schoolId - School ID
 * @param {boolean} options.enabled - Whether to enable the query
 * @returns {Object} Query result
 */
export const useGetSchoolGradesQuery = ({ schoolId, enabled = true }) => {
  return useQuery({
    queryKey: ["verifier", "grades", schoolId],
    queryFn: () => getSchoolGrades({ schoolId }),
    enabled: enabled && !!schoolId,
    staleTime: 10 * 60 * 1000, // 10 minutes (grades don't change often)
  });
};

/**
 * React Query hook for submitting assessment
 * @param {Object} options - Mutation options
 * @returns {Object} Mutation object from React Query
 */
export const useSubmitAssessmentMutation = (options = {}) => {
  return useMutation({
    mutationFn: (data) => submitAssessment(data),
    mutationKey: ["verifier", "submit-assessment"],
    onSuccess: (data) => {
      enqueueSnackbar(data?.message || "Assessment submitted successfully", {
        variant: "success",
      });
      if (options.onSuccess) {
        options.onSuccess(data);
      }
    },
    onError: (error) => {
      enqueueSnackbar(
        error?.response?.data?.message || "Failed to submit assessment",
        {
          variant: "error",
        },
      );
      if (options.onError) {
        options.onError(error);
      }
    },
    ...options,
  });
};

/**
 * Get verifier allocated schools list
 * @param {Object} params - { districtId: number, userId?: number, page?: number, limit?: number }
 * @returns {Promise} API response
 */
export const getVerifierAllocatedSchools = async (params) => {
  const { districtId, userId, page, limit, ...otherParams } = params;

  // Build params object - always include districtId
  const queryParams = {};

  // Always include districtId in params (can be null for "All" option)
  // Explicitly set districtId - if it's null or undefined, set it to null
  if (districtId !== undefined && districtId !== null) {
    queryParams.districtId = Number(districtId);
  } else {
    // Explicitly set to null when "All" is selected or districtId is undefined
    queryParams.districtId = null;
  }

  if (page !== undefined && page !== null) {
    queryParams.page = Number(page);
  }

  if (limit !== undefined && limit !== null) {
    queryParams.limit = Number(limit);
  }

  // Add any other params
  if (Object.keys(otherParams).length > 0) {
    Object.assign(queryParams, otherParams);
  }

  // Get userId from auth store if not provided in params, and set in header if present
  const authState = useAuthStore.getState();
  const userIdToSend = userId || authState.userId;

  const config = {
    params: queryParams,
    headers: {},
    // Custom params serializer to handle null values properly
    paramsSerializer: (params) => {
      const searchParams = new URLSearchParams();
      Object.keys(params).forEach((key) => {
        const value = params[key];
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      const queryString = searchParams.toString();

      return queryString;
    },
  };

  if (userIdToSend) {
    config.headers.userId = userIdToSend;
  }

  const response = await axiosInstance.get(
    "/verifier/get-school-allocated-verifier",
    config,
  );
  return response.data;
};

/**
 * React Query hook for getting verifier allocated schools
 * @param {Object} options - Query options
 * @param {number} options.districtId - District ID
 * @param {number} options.userId - User ID (optional, will be fetched from auth store if not provided)
 * @param {boolean} options.enabled - Whether the query should run
 * @returns {Object} Query object from React Query
 */
export const useGetVerifierAllocatedSchoolsQuery = ({
  districtId,
  userId,
  page = 0,
  limit = 10,
  enabled = true,
}) => {
  return useQuery({
    queryKey: queryKeys.verifier.allocatedSchools(districtId, page, limit),
    queryFn: () =>
      getVerifierAllocatedSchools({ districtId, userId, page, limit }),
    enabled: enabled,
    staleTime: 0,
    gcTime: 0,
    refetchOnMount: "always",
    refetchOnWindowFocus: false,
  });
};

/**
 * Get districts by verifier
 * @returns {Promise} API response
 */
export const getDistrictsByVerifier = async () => {
  const response = await axiosInstance.get(
    "/verifier/get-districtId-by-verifier",
  );
  return response.data;
};

/**
 * React Query hook for getting districts by verifier
 * @param {Object} options - Query options
 * @param {boolean} options.enabled - Whether the query should run
 * @returns {Object} Query object from React Query
 */
export const useGetDistrictsByVerifierQuery = ({ enabled = true } = {}) => {
  return useQuery({
    queryKey: queryKeys.verifier.districts(),
    queryFn: () => getDistrictsByVerifier(),
    enabled: enabled,
    staleTime: 10 * 60 * 1000, // 10 minutes (districts don't change often)
  });
};

/**
 * Get verifier dashboard counts
 * @param {Object} params - { districtId: number }
 * @returns {Promise} API response with structure:
 * {
 *   message: "Success",
 *   data: {
 *     userId: string,
 *     totalAllocatedSchool: number,
 *     totalPendingSchool: number,
 *     totalCompletedSchool: number
 *   }
 * }
 */
export const getVerifierDashboard = async (params) => {
  const { districtId, ...otherParams } = params;
  const config = {
    params: { ...otherParams },
    headers: {},
  };

  // Send districtId only when a specific district is selected.
  if (districtId !== null && districtId !== undefined && districtId !== "") {
    config.params.districtId = districtId;
  }

  const response = await axiosInstance.get(
    "/verifier/get-verifier-dashboard",
    config,
  );
  // Response structure: { message: "Success", data: { userId, totalAllocatedSchool, totalPendingSchool, totalCompletedSchool } }
  return response.data;
};

/**
 * React Query hook for getting verifier dashboard counts
 * @param {Object} options - Query options
 * @param {number} options.districtId - District ID
 * @param {boolean} options.enabled - Whether the query should run
 * @returns {Object} Query object from React Query
 */
export const useGetVerifierDashboardQuery = ({
  districtId,
  enabled = true,
}) => {
  return useQuery({
    queryKey: queryKeys.verifier.dashboard(districtId),
    queryFn: () => getVerifierDashboard({ districtId }),
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
};

export async function getVerifierSubdomainConsistency({ schoolId, subDomainId }) {
  const response = await axiosInstance.get("/verifier/subdomain-consistency", {
    params: { schoolId, subDomainId },
  });
  return response.data?.data || response.data;
}

export async function upsertVerifierSubdomainConsistency(payload) {
  const response = await axiosInstance.put("/verifier/subdomain-consistency", payload);
  return response.data?.data || response.data;
}

export async function uploadVerifierSchoolVerificationAadhaar(file) {
  if (!file) return null;

  const extension = file.name.split(".").pop()?.toLowerCase() || "pdf";
  const allowed = ["jpg", "jpeg", "png", "pdf"];
  if (!allowed.includes(extension)) {
    throw new Error("Invalid file type. Allowed formats: JPG, PNG, PDF.");
  }
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File exceeds the maximum allowed size of 5 MB.");
  }

  const response = await axiosInstance.post(
    "/common/get-upload-url",
    {
      extension,
      contentType: file.type || "application/octet-stream",
      uploadType: "verifierSchoolVerificationAadhaar",
    },
    { timeout: 90000 },
  );

  const uploadPayload = response?.data?.data || response?.data;
  if (!uploadPayload?.uploadURL || !uploadPayload?.fileName) {
    throw new Error("Unable to prepare Aadhaar upload.");
  }

  await uploadFileToPresignedUrl(uploadPayload.uploadURL, file);
  return uploadPayload.fileName;
}

export function useVerifierSubdomainConsistencyQuery({
  schoolId,
  subDomainId,
  enabled = true,
}) {
  return useQuery({
    queryKey: ["verifier", "subdomain-consistency", schoolId, subDomainId],
    queryFn: () => getVerifierSubdomainConsistency({ schoolId, subDomainId }),
    enabled: Boolean(enabled && schoolId && subDomainId),
    staleTime: 30 * 1000,
  });
}

export function useUpsertVerifierSubdomainConsistencyMutation(options = {}) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: upsertVerifierSubdomainConsistency,
    onSuccess: (data, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: [
          "verifier",
          "subdomain-consistency",
          variables.schoolId,
          variables.subDomainId,
        ],
      });
      options.onSuccess?.(data, variables, context);
    },
    onError: (error, variables, context) => {
      enqueueSnackbar(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save verification response",
        { variant: "error" },
      );
      options.onError?.(error, variables, context);
    },
  });
}
