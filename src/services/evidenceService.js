import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import axiosInstance from "../config/axios";
import { enqueueSnackbar } from "notistack";
import {
  getKakshaLevelFromQuestion,
  parseQuestionOptions,
} from "../utils/assessmentMeta";

export const MAX_EVIDENCE_SIZE_BYTES = 5 * 1024 * 1024;
export const EVIDENCE_ACCEPT =
  "image/jpeg,image/jpg,image/png,application/pdf,.jpg,.jpeg,.png,.pdf";

export function isMandatoryEvidenceSlot(slot) {
  const value = slot?.isMandatory;
  return value === 1 || value === true || value === "1";
}

/** Option levels (કક્ષા index) where evidence upload is not required / not allowed. */
export const EVIDENCE_OPTIONAL_OPTION_LEVELS = new Set([0, 4]);

export function getQuestionOptionLevelIndex(question, selectedOptionId, parseOptions) {
  if (selectedOptionId == null || selectedOptionId === "") return -1;
  const level = getKakshaLevelFromQuestion(
    {
      ...question,
      options:
        typeof parseOptions === "function"
          ? parseOptions(question?.options)
          : parseQuestionOptions(question?.options),
    },
    selectedOptionId,
  );
  return level == null ? -1 : Number(level);
}

export function isEvidenceOptionalForSelectedOption(
  question,
  selectedOptionId,
  parseOptions,
) {
  const level = getQuestionOptionLevelIndex(
    question,
    selectedOptionId,
    parseOptions,
  );
  return EVIDENCE_OPTIONAL_OPTION_LEVELS.has(level);
}

export function questionRequiresEvidence(question) {
  return (
    question?.requireEvidence === 1 ||
    question?.requireEvidence === true ||
    question?.requireEvidence === "1"
  );
}

export function getMandatoryEvidenceSlots(subdomain) {
  return (subdomain?.evidenceSlots || []).filter(isMandatoryEvidenceSlot);
}

export function zeroMandatoryEvidenceProgress() {
  return {
    total: 0,
    uploaded: 0,
    remaining: 0,
    percentage: 100,
    isComplete: true,
  };
}

export function subdomainHasMandatoryEvidence(subdomain) {
  return getSubdomainEvidenceProgress(subdomain).total > 0;
}

export function subdomainEvidenceIsEnabled(subdomain) {
  const value = subdomain?.requireEvidence;
  if (value === 1 || value === "1" || value === true) return true;
  // Question-level evidence enrichment may set totals without the legacy flag.
  return (Number(subdomain?.mandatoryEvidenceTotal) || 0) > 0;
}

export function subdomainRequiresEvidence(subdomain) {
  return subdomainEvidenceIsEnabled(subdomain);
}

export function getEvidenceSlotName(slot, language = "en") {
  if (!slot) return "";
  switch (language) {
    case "gu":
      return slot.slotNameGu || slot.slotName || slot.slotNameEn || "";
    case "hi":
      return slot.slotNameHi || slot.slotName || slot.slotNameEn || "";
    default:
      return slot.slotNameEn || slot.slotName || slot.slotNameGu || "";
  }
}

export function computeMandatoryEvidenceProgress(slots = []) {
  const mandatorySlots = (slots || []).filter(isMandatoryEvidenceSlot);

  if (mandatorySlots.length === 0) {
    return zeroMandatoryEvidenceProgress();
  }

  const mandatoryUploaded = mandatorySlots.filter((slot) => slot.evidence?.evidenceId)
    .length;

  return {
    total: mandatorySlots.length,
    uploaded: mandatoryUploaded,
    remaining: Math.max(0, mandatorySlots.length - mandatoryUploaded),
    percentage: Math.round((mandatoryUploaded / mandatorySlots.length) * 100),
    isComplete: mandatoryUploaded >= mandatorySlots.length,
  };
}

export function applyEvidenceAnswerAdjustments(progress, adjustments) {
  if (!progress) return zeroMandatoryEvidenceProgress();
  if (!adjustments || typeof adjustments !== "object") return progress;

  let deductTotal = 0;
  let deductUploaded = 0;

  Object.values(adjustments).forEach((adjustment) => {
    if (!adjustment?.exempt) return;
    deductTotal += Number(adjustment.slotTotal) || 0;
    deductUploaded += Number(adjustment.slotUploaded) || 0;
  });

  if (deductTotal === 0 && deductUploaded === 0) return progress;

  const total = Math.max(0, (Number(progress.total) || 0) - deductTotal);
  const uploaded = Math.min(
    total,
    Math.max(0, (Number(progress.uploaded) || 0) - deductUploaded),
  );

  return {
    total,
    uploaded,
    remaining: Math.max(0, total - uploaded),
    percentage: total > 0 ? Math.round((uploaded / total) * 100) : 100,
    isComplete: total === 0 || uploaded >= total,
  };
}

export function getSubdomainEvidenceProgress(subdomain) {
  if (!subdomainEvidenceIsEnabled(subdomain)) {
    return zeroMandatoryEvidenceProgress();
  }

  const slots = subdomain?.evidenceSlots;
  let baseProgress;

  // Prefer concrete slot rows only when they are actually present.
  // Domains API often returns evidenceSlots: [] with totals on the subdomain.
  if (Array.isArray(slots) && slots.length > 0) {
    const mandatorySlots = getMandatoryEvidenceSlots(subdomain);
    if (mandatorySlots.length === 0) {
      baseProgress = zeroMandatoryEvidenceProgress();
    } else {
      const mandatoryTotal = mandatorySlots.length;
      const hasSlotEvidence = mandatorySlots.some(
        (slot) => slot.evidence !== undefined,
      );
      const mandatoryUploaded = hasSlotEvidence
        ? mandatorySlots.filter((slot) => slot.evidence?.evidenceId).length
        : Math.min(
            Number(subdomain?.mandatoryEvidenceUploaded) || 0,
            mandatoryTotal,
          );

      baseProgress = {
        total: mandatoryTotal,
        uploaded: mandatoryUploaded,
        remaining: Math.max(0, mandatoryTotal - mandatoryUploaded),
        percentage:
          mandatoryTotal > 0
            ? Math.round((mandatoryUploaded / mandatoryTotal) * 100)
            : 100,
        isComplete: mandatoryUploaded >= mandatoryTotal,
      };
    }
  } else {
    const mandatoryTotal = Number(subdomain?.mandatoryEvidenceTotal) || 0;

    if (mandatoryTotal === 0) {
      baseProgress = zeroMandatoryEvidenceProgress();
    } else {
      const mandatoryUploaded = Math.min(
        Number(subdomain?.mandatoryEvidenceUploaded) || 0,
        mandatoryTotal,
      );

      baseProgress = {
        total: mandatoryTotal,
        uploaded: mandatoryUploaded,
        remaining: Math.max(0, mandatoryTotal - mandatoryUploaded),
        percentage: Math.round((mandatoryUploaded / mandatoryTotal) * 100),
        isComplete: mandatoryUploaded >= mandatoryTotal,
      };
    }
  }

  return applyEvidenceAnswerAdjustments(
    baseProgress,
    subdomain?.evidenceAnswerAdjustments,
  );
}

export function getDomainMandatoryEvidenceProgress(domain) {
  let total = 0;
  let uploaded = 0;

  (domain?.subDomain || []).forEach((subdomain) => {
    const progress = getSubdomainEvidenceProgress(subdomain);
    total += progress.total;
    uploaded += progress.uploaded;
  });

  return {
    total,
    uploaded,
    remaining: Math.max(0, total - uploaded),
    percentage: total > 0 ? Math.round((uploaded / total) * 100) : 100,
    isComplete: total === 0 || uploaded >= total,
  };
}

export function mergeEvidenceAdjustmentsIntoDomains(
  domains = [],
  adjustmentsBySubdomain = {},
) {
  if (!Array.isArray(domains)) return [];
  if (!adjustmentsBySubdomain || !Object.keys(adjustmentsBySubdomain).length) {
    return domains;
  }

  return domains.map((domain) => ({
    ...domain,
    subDomain: (domain.subDomain || []).map((subdomain) => {
      const subDomainId = subdomain.subDomainId || subdomain.id;
      const adjustments =
        adjustmentsBySubdomain[subDomainId] ||
        adjustmentsBySubdomain[String(subDomainId)];
      if (!adjustments || !Object.keys(adjustments).length) return subdomain;
      return {
        ...subdomain,
        evidenceAnswerAdjustments: adjustments,
      };
    }),
  }));
}

export function mergeEvidenceAdjustmentsIntoAssessments(
  assessments = [],
  adjustmentsBySubdomain = {},
) {
  return (assessments || []).map((assessment) => ({
    ...assessment,
    domains: mergeEvidenceAdjustmentsIntoDomains(
      assessment.domains || [],
      adjustmentsBySubdomain,
    ),
  }));
}

export function buildEvidenceAdjustmentForQuestion(question, slots = []) {
  if (!questionRequiresEvidence(question)) return null;

  const selectedOptionId =
    question.selectedOptionId ?? question.optionId ?? null;
  if (!isEvidenceOptionalForSelectedOption(question, selectedOptionId)) {
    return null;
  }

  const rawProgress = computeMandatoryEvidenceProgress(slots);
  if (rawProgress.total <= 0) return null;

  return {
    exempt: true,
    slotTotal: rawProgress.total,
    slotUploaded: rawProgress.uploaded,
  };
}

export function getAssessmentMandatoryEvidenceProgress(domains = []) {
  let total = 0;
  let uploaded = 0;

  domains.forEach((domain) => {
    (domain.subDomain || []).forEach((subdomain) => {
      const progress = getSubdomainEvidenceProgress(subdomain);
      total += progress.total;
      uploaded += progress.uploaded;
    });
  });

  return {
    total,
    uploaded,
    remaining: Math.max(0, total - uploaded),
    percentage: total > 0 ? Math.round((uploaded / total) * 100) : 100,
    isComplete: total === 0 || uploaded >= total,
  };
}

export function sanitizeDomainsEvidence(domains = []) {
  if (!Array.isArray(domains)) return [];

  return domains.map((domain) => ({
    ...domain,
    subDomain: (domain.subDomain || []).map((subdomain) => {
      const progress = getSubdomainEvidenceProgress(subdomain);
      if (progress.total > 0) {
        return subdomain;
      }

      return {
        ...subdomain,
        mandatoryEvidenceTotal: 0,
        mandatoryEvidenceUploaded: 0,
        mandatoryEvidenceRemaining: 0,
        mandatoryEvidencePercentage: 100,
      };
    }),
  }));
}

export const getSubdomainEvidence = async (params) => {
  const response = await axiosInstance.get("/common/subdomain-evidence", {
    params,
    timeout: 60000,
  });
  return response.data;
};

export const prepareSubdomainEvidenceUpload = async (payload) => {
  const response = await axiosInstance.post(
    "/common/subdomain-evidence/prepare-upload",
    payload,
    { timeout: 90000 },
  );
  return response.data;
};

/**
 * School evidence upload: prepare API + S3 PUT as one operation.
 * Avoids success toast / cache invalidation before the file actually lands in S3.
 */
export const uploadSubdomainEvidenceFile = async ({ file, ...payload }) => {
  if (!file) throw new Error("File is required.");
  const prepared = await prepareSubdomainEvidenceUpload({
    ...payload,
    extension:
      payload.extension ||
      file.name.split(".").pop()?.toLowerCase() ||
      "jpg",
    contentType: payload.contentType || file.type || "application/octet-stream",
    fileSizeBytes: payload.fileSizeBytes ?? file.size,
  });
  const uploadPayload = prepared?.data || prepared;
  if (!uploadPayload?.uploadURL) {
    throw new Error("Unable to prepare evidence upload.");
  }
  await uploadFileToPresignedUrl(uploadPayload.uploadURL, file, 180000);
  return prepared;
};

export const getQuestionEvidence = async (params) => {
  const response = await axiosInstance.get("/common/question-evidence", {
    params,
    timeout: 60000,
  });
  return response.data;
};

export const prepareQuestionEvidenceUpload = async (payload) => {
  const response = await axiosInstance.post(
    "/common/question-evidence/prepare-upload",
    payload,
    { timeout: 90000 },
  );
  return response.data;
};

export const uploadQuestionEvidenceFile = async ({ file, ...payload }) => {
  if (!file) throw new Error("File is required.");
  const prepared = await prepareQuestionEvidenceUpload({
    ...payload,
    extension:
      payload.extension ||
      file.name.split(".").pop()?.toLowerCase() ||
      "jpg",
    contentType: payload.contentType || file.type || "application/octet-stream",
    fileSizeBytes: payload.fileSizeBytes ?? file.size,
  });
  const uploadPayload = prepared?.data || prepared;
  if (!uploadPayload?.uploadURL) {
    throw new Error("Unable to prepare evidence upload.");
  }
  await uploadFileToPresignedUrl(uploadPayload.uploadURL, file, 180000);
  return prepared;
};

export const getEvidenceSlots = async (params) => {
  const response = await axiosInstance.get("/questionnaire/evidence-slots", {
    params,
  });
  return response.data;
};

export const upsertEvidenceSlot = async (payload) => {
  const response = await axiosInstance.post(
    "/questionnaire/evidence-slots",
    payload,
  );
  return response.data;
};

export const deleteEvidenceSlot = async (evidenceSlotId, extras = {}) => {
  const response = await axiosInstance.delete("/questionnaire/evidence-slots", {
    params: { evidenceSlotId, ...extras },
  });
  return response.data;
};

export function useSubdomainEvidenceQuery(
  { subDomainId, schoolId, languageCode },
  enabled = true,
) {
  return useQuery({
    queryKey: ["subdomain-evidence", subDomainId, schoolId, languageCode],
    queryFn: () =>
      getSubdomainEvidence({ subDomainId, schoolId, languageCode }),
    enabled: enabled && !!subDomainId && !!schoolId,
    staleTime: 10 * 60 * 1000, // evidence slots/uploads; invalidate on upload
  });
}

export function useQuestionEvidenceQuery(
  { questionId, schoolId, languageCode },
  enabled = true,
) {
  return useQuery({
    queryKey: ["question-evidence", questionId, schoolId, languageCode],
    queryFn: () => getQuestionEvidence({ questionId, schoolId, languageCode }),
    enabled: enabled && !!questionId && !!schoolId,
    staleTime: 10 * 60 * 1000, // evidence slots/uploads; invalidate on upload
  });
}

export function useEvidenceSlotsQuery(
  { subDomainId = null, questionId = null } = {},
  enabled = true,
) {
  const entityKey = questionId ? `q-${questionId}` : `sd-${subDomainId}`;
  return useQuery({
    queryKey: ["evidence-slots", entityKey],
    queryFn: () =>
      getEvidenceSlots(
        questionId ? { questionId } : { subDomainId },
      ),
    enabled: enabled && !!(questionId || subDomainId),
    staleTime: 10 * 60 * 1000, // evidence slots/uploads; invalidate on upload
  });
}

function patchSubdomainEvidenceInDomains(domains, subDomainId, progress) {
  if (!Array.isArray(domains)) return domains;

  const targetId = Number(subDomainId);
  const questionId =
    progress?.questionId != null ? String(progress.questionId) : null;
  let changed = false;

  const nextDomains = domains.map((domain) => ({
    ...domain,
    subDomain: (domain.subDomain || []).map((subdomain) => {
      const currentId = Number(subdomain.subDomainId || subdomain.id);
      if (currentId !== targetId) return subdomain;

      // Question-scoped updates only adjust કક્ષા 0/4 exemptions; keep API totals intact.
      if (questionId) {
        const prevAdjustments = subdomain.evidenceAnswerAdjustments || {};
        const nextAdjustments = { ...prevAdjustments };
        const slotTotal = Number(
          progress.slotTotal ?? progress.rawTotal ?? progress.total,
        ) || 0;
        const slotUploaded = Number(
          progress.slotUploaded ?? progress.rawUploaded ?? progress.uploaded,
        ) || 0;

        if (progress.exempt) {
          const prev = prevAdjustments[questionId];
          if (
            prev?.exempt &&
            Number(prev.slotTotal) === slotTotal &&
            Number(prev.slotUploaded) === slotUploaded
          ) {
            return subdomain;
          }
          nextAdjustments[questionId] = {
            exempt: true,
            slotTotal,
            slotUploaded,
          };
        } else if (prevAdjustments[questionId]) {
          delete nextAdjustments[questionId];
        } else {
          return subdomain;
        }

        changed = true;
        return {
          ...subdomain,
          evidenceAnswerAdjustments: nextAdjustments,
        };
      }

      const total = Number(progress?.total) || 0;
      const uploaded = Number(progress?.uploaded) || 0;
      const remaining = Math.max(0, total - uploaded);

      if (
        Number(subdomain.mandatoryEvidenceTotal) === total &&
        Number(subdomain.mandatoryEvidenceUploaded) === uploaded
      ) {
        return subdomain;
      }

      changed = true;
      return {
        ...subdomain,
        mandatoryEvidenceTotal: total,
        mandatoryEvidenceUploaded: uploaded,
        mandatoryEvidenceRemaining: remaining,
        mandatoryEvidencePercentage:
          total > 0 ? Math.round((uploaded / total) * 100) : 100,
      };
    }),
  }));

  return changed ? nextDomains : domains;
}

function patchDomainsResponseSubdomainEvidence(oldData, subDomainId, progress) {
  if (!oldData) return oldData;

  if (Array.isArray(oldData.data)) {
    if (oldData.data.length > 0 && oldData.data[0]?.domains) {
      let changed = false;
      const nextData = oldData.data.map((assessment) => {
        const nextDomains = patchSubdomainEvidenceInDomains(
          assessment.domains,
          subDomainId,
          progress,
        );
        if (nextDomains === assessment.domains) return assessment;
        changed = true;
        return { ...assessment, domains: nextDomains };
      });
      return changed ? { ...oldData, data: nextData } : oldData;
    }

    const nextDomains = patchSubdomainEvidenceInDomains(
      oldData.data,
      subDomainId,
      progress,
    );
    return nextDomains === oldData.data
      ? oldData
      : { ...oldData, data: nextDomains };
  }

  return oldData;
}

export function updateDomainsCacheSubdomainEvidence(
  queryClient,
  subDomainId,
  progress,
) {
  if (!queryClient || !subDomainId || progress == null) return;

  const patcher = (oldData) =>
    patchDomainsResponseSubdomainEvidence(oldData, subDomainId, progress);

  ["school", "verifier", "crc"].forEach((scope) => {
    queryClient.setQueriesData({ queryKey: [scope, "domains"] }, patcher);
  });
}

export function usePrepareSubdomainEvidenceMutation(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadSubdomainEvidenceFile,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "subdomain-evidence",
          variables.subDomainId,
          variables.schoolId,
        ],
      });
      // Soft-refresh domain progress without blocking upload UX
      queryClient.invalidateQueries({
        queryKey: ["school", "domains"],
        refetchType: "active",
      });
      enqueueSnackbar(data?.message || "Evidence uploaded successfully.", {
        variant: "success",
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error) => {
      enqueueSnackbar(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to upload evidence.",
        { variant: "error" },
      );
      options.onError?.(error);
    },
  });
}

export function useUpsertEvidenceSlotMutation(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: upsertEvidenceSlot,
    onSuccess: (data, variables) => {
      const entityKey = variables.questionId
        ? `q-${variables.questionId}`
        : `sd-${variables.subDomainId}`;
      queryClient.invalidateQueries({
        queryKey: ["evidence-slots", entityKey],
      });
      queryClient.invalidateQueries({ queryKey: ["admin", "domains"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "subdomain-questions"] });
      enqueueSnackbar(data?.message || "Evidence slot saved.", {
        variant: "success",
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error) => {
      enqueueSnackbar(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to save evidence slot.",
        { variant: "error" },
      );
      options.onError?.(error);
    },
  });
}

export function useDeleteEvidenceSlotMutation(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ evidenceSlotId, questionId }) =>
      deleteEvidenceSlot(
        evidenceSlotId,
        questionId != null ? { questionId } : {},
      ),
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["evidence-slots"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "domains"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "subdomain-questions"] });
      enqueueSnackbar(data?.message || "Evidence slot removed.", {
        variant: "success",
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error) => {
      enqueueSnackbar(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to delete evidence slot.",
        { variant: "error" },
      );
      options.onError?.(error);
    },
  });
}

export function usePrepareQuestionEvidenceMutation(options = {}) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: uploadQuestionEvidenceFile,
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({
        queryKey: [
          "question-evidence",
          variables.questionId,
          variables.schoolId,
        ],
      });
      queryClient.invalidateQueries({
        queryKey: ["school", "domains"],
        refetchType: "active",
      });
      enqueueSnackbar(data?.message || "Evidence uploaded successfully.", {
        variant: "success",
      });
      options.onSuccess?.(data, variables);
    },
    onError: (error) => {
      enqueueSnackbar(
        error?.response?.data?.message ||
          error?.message ||
          "Failed to upload evidence.",
        { variant: "error" },
      );
      options.onError?.(error);
    },
  });
}

export async function uploadFileToPresignedUrl(uploadURL, file, timeoutMs = 120000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(uploadURL, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: file,
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }
  } catch (error) {
    if (error?.name === "AbortError") {
      throw new Error(
        "Document upload timed out. Please check your network and try again with a smaller file.",
      );
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
