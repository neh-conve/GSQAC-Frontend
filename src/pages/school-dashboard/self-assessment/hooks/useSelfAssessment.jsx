import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { Box, CircularProgress, useTheme, useMediaQuery } from "@mui/material";
import {
  Assessment,
  Assignment,
  Business,
  Class,
  Create,
  Groups,
  MenuBook,
  School as SchoolIcon,
  WorkspacePremium,
} from "@mui/icons-material";
import { enqueueSnackbar } from "notistack";
import { colors } from "../../../../constants/colors";
import {
  getStoredAppLanguage,
  persistAppLanguage,
} from "../../../../utils/i18nLanguage";
import { queryKeys } from "../../../../config/queryClient";
import { getRoleId } from "../../../../constants/roles";
import useAuthStore from "../../../../store/useAuthStore";
import { useLogoutMutation } from "../../../../services/authService";
import {
  useGetDomainsQuery,
  useGetSubdomainQuestionsQuery,
  useGetSchoolDataQuery,
  useGetSchoolSectionsQuery,
  useSubmitSubdomainWiseAnswersMutation,
  useSubmitAssessmentMutation,
  useGetSchoolGradesQuery,
  submitAssessment,
  fetchDomainsBypassingCache,
  getSubdomainQuestions,
} from "../../../../services/schoolService";
import {
  useGetClassWiseSubjectsQuery,
  useSubmitAnswerMutation,
} from "../../../../services/adminService";
import { buildSubmitPreviewData, buildSubmitPreviewDataForAssessments } from "../utils/buildSubmitPreviewData";
import {
  filterAssessmentsByHostelFacility,
  isHostelDomain,
  normalizeHostelFacilityValue,
  sumProgressFromDomains,
} from "../../../../utils/hostelDomain";
import { filterQuestionsByClassRange, resolveEffectiveSchoolClassRange } from "../../../../utils/classRange";
import { dedupeQuestionsById } from "../../../../utils/dedupeQuestions";
import { parseQuestionOptions, resolveAssessmentPeriod } from "../../../../utils/assessmentMeta";
import {
  isAssessmentSubmitted,
  isAssessmentAnswersComplete,
  isAssessmentFullyComplete,
  getIncompleteAssessments,
  clampProgressPercentage,
  sanitizeDomainsProgress,
} from "../../../../utils/assessmentSubmit";
import { getAssessmentTheme } from "../../../../utils/assessmentTheme";
import {
  getAssessmentMandatoryEvidenceProgress,
  sanitizeDomainsEvidence,
  updateDomainsCacheSubdomainEvidence,
  mergeEvidenceAdjustmentsIntoAssessments,
  buildEvidenceAdjustmentForQuestion,
  questionRequiresEvidence,
  getSubdomainEvidenceProgress,
  getQuestionEvidence,
} from "../../../../services/evidenceService";

function extractSubdomainQuestions(response) {
  const payload = response?.data?.data ?? response?.data ?? response ?? [];
  return Array.isArray(payload) ? payload : [];
}

function normalizeAssessmentsFromDomainsPayload(domainsData, hostelValue, t) {
  let list = [];
  if (Array.isArray(domainsData?.data)) {
    const isMultiAssessmentPayload =
      domainsData.data.length > 0 &&
      domainsData.data.every(
        (item) => item && Object.prototype.hasOwnProperty.call(item, "assessmentId"),
      );

    if (isMultiAssessmentPayload) {
      list = domainsData.data.map((assessment) => ({
        ...assessment,
        domains: Array.isArray(assessment.domains) ? assessment.domains : [],
      }));
    } else if (domainsData.data.length > 0) {
      list = [
        {
          assessmentId: null,
          assessmentName: t("selfAssessment.defaultAssessmentName", {
            defaultValue: "Assessment",
          }),
          domains: domainsData.data,
          academicYear: domainsData?.academicYear,
          round: domainsData?.round,
          isPublished: domainsData?.isPublished,
          startDate: domainsData?.startDate,
          endDate: domainsData?.endDate,
          isSubmitted: domainsData?.isSubmitted,
          sessionId: domainsData?.sessionId,
        },
      ];
    }
  }

  return filterAssessmentsByHostelFacility(list, hostelValue).map((assessment) => ({
    ...assessment,
    ...resolveAssessmentPeriod({
      academicYear: assessment.academicYear || domainsData?.academicYear,
      round: assessment.round ?? domainsData?.round,
    }),
    answerPercentage: clampProgressPercentage(assessment.answerPercentage),
    domains: sanitizeDomainsProgress(
      sanitizeDomainsEvidence(assessment.domains || []),
    ),
  }));
}

const getSessionIdFromDomainsResponse = (domainsResponse, assessmentId) => {
  if (!domainsResponse) return null;

  if (Array.isArray(domainsResponse.data)) {
    if (
      domainsResponse.data.length > 0 &&
      domainsResponse.data[0]?.domains
    ) {
      const assessment =
        domainsResponse.data.find(
          (item) => Number(item.assessmentId) === Number(assessmentId),
        );
      return assessment?.sessionId ?? null;
    }
    return domainsResponse.sessionId ?? null;
  }

  return domainsResponse.sessionId ?? null;
};

export function useSelfAssessment() {
  const navigate = useNavigate();
  const theme = useTheme();
  const matchDownMD = useMediaQuery(theme.breakpoints.down("md"));
  const [drawerOpen, setDrawerOpen] = useState(!matchDownMD);
  const { logout, user, userId, userName } = useAuthStore();
  const { t, i18n } = useTranslation();
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    const stored = getStoredAppLanguage();
    return stored === "hi" ? "gu" : stored;
  });

  useEffect(() => {
    const stored = getStoredAppLanguage();
    const lang = stored === "hi" ? "gu" : stored;
    if (i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
    if (stored === "hi") {
      persistAppLanguage("gu");
    }
    setCurrentLanguage(lang);
  }, [i18n]);

  const handleLanguageChange = useCallback(
    (newLanguage) => {
      if (newLanguage == null || newLanguage === "hi") return;
      setCurrentLanguage(newLanguage);
      i18n.changeLanguage(newLanguage);
      persistAppLanguage(newLanguage);
    },
    [i18n],
  );
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [selectedSubdomain, setSelectedSubdomain] = useState(null);
  const [answers, setAnswers] = useState({});
  const [subdomainAnswers, setSubdomainAnswers] = useState({});
  const [subdomainTextAnswers, setSubdomainTextAnswers] = useState({});
  const [classWiseAnswers, setClassWiseAnswers] = useState({});
  const [classWiseTextAnswers, setClassWiseTextAnswers] = useState({}); // Store text answers per class
  const [selectedClassGroup, setSelectedClassGroup] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [textAnswers, setTextAnswers] = useState({});
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [showSubmitPreview, setShowSubmitPreview] = useState(false);
  const [submitPreviewData, setSubmitPreviewData] = useState([]);
  const [isLoadingSubmitPreview, setIsLoadingSubmitPreview] = useState(false);
  const [submitPreviewError, setSubmitPreviewError] = useState(null);
  const [submitFeedback, setSubmitFeedback] = useState("");
  const [isSubmittingAllAssessments, setIsSubmittingAllAssessments] =
    useState(false);
  const [selectedQuestionTab, setSelectedQuestionTab] = useState(0);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(null);
  /** Optimistic કક્ષા 0/4 evidence exemptions: { [subDomainId]: { [questionId]: { exempt, slotTotal, slotUploaded } } } */
  const [evidenceAnswerAdjustmentsBySubdomain, setEvidenceAnswerAdjustmentsBySubdomain] =
    useState({});
  const evidenceHydrationRef = useRef(new Set());
  const [chartDrilldownAssessmentId, setChartDrilldownAssessmentId] =
    useState(null);

  const logoutMutation = useLogoutMutation({
    onSuccess: () => {
      logout();
      navigate("/login");
    },
    onError: (error) => {
      console.error("Logout API error:", error);
      logout();
      navigate("/login");
    },
  });

  const handleDrawerToggle = () => {
    setDrawerOpen(!drawerOpen);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const languageCodeMap = {
    en: "EN",
    hi: "HI",
    gu: "GU",
  };
  const languageCode = languageCodeMap[currentLanguage] || "EN";

  const roleId = getRoleId("school");

  const queryClient = useQueryClient();

  const { data: schoolDataResponse, isLoading: isLoadingSchoolData, refetch: refetchSchoolData } =
    useGetSchoolDataQuery({
      schoolId: userName || undefined,
    });

  const schoolData = schoolDataResponse?.data || {};

  const hostelValue = useMemo(
    () => normalizeHostelFacilityValue(schoolData.hostel),
    [schoolData.hostel],
  );

  const {
    data: domainsData,
    isLoading: isLoadingDomains,
    isFetching: isFetchingDomains,
    isError: isErrorDomains,
    refetch: refetchDomains,
  } = useGetDomainsQuery({
    roleId,
    languageCode,
    userId: userId ? Number(userId) : undefined,
    enabled:
      !isLoadingSchoolData &&
      !!userName &&
      hostelValue !== null,
  });

  // Coalesce rapid question refetches after single-answer saves
  const questionsRefetchTimerRef = useRef(null);

  useEffect(() => {
    return () => {
      if (questionsRefetchTimerRef.current) {
        clearTimeout(questionsRefetchTimerRef.current);
      }
    };
  }, []);

  // Fetch unfiltered questions only when a class is selected (to detect subject-wise type 3).
  // Without class filter, the main questions query already returns the full set — avoid duplicate API.
  const { data: allQuestionsData } = useGetSubdomainQuestionsQuery({
    subDomainId: selectedSubdomain?.subDomainId || selectedSubdomain?.id,
    roleId,
    languageCode,
    userId: userId ? Number(userId) : undefined,
    enabled: !!selectedSubdomain && !!selectedClass,
  });

  const hasSubjectWiseFromAll = useMemo(() => {
    if (!allQuestionsData) return false;
    const questions =
      allQuestionsData?.data?.data ||
      (Array.isArray(allQuestionsData?.data) ? allQuestionsData.data : []);
    return questions.some(
      (q) => q.questionType === 3 || q.questionType === "3",
    );
  }, [allQuestionsData]);

  const {
    data: questionsData,
    isLoading: isLoadingQuestions,
    isError: isErrorQuestions,
    refetch: refetchQuestions,
  } = useGetSubdomainQuestionsQuery({
    subDomainId: selectedSubdomain?.subDomainId || selectedSubdomain?.id,
    roleId,
    languageCode,
    ...(selectedClass && { classNumber: Number(selectedClass) }),
    ...(selectedSection && { section: selectedSection }),
    ...(hasSubjectWiseFromAll &&
      selectedSubject && { subjectId: Number(selectedSubject) }),
    userId: userId ? Number(userId) : undefined,
    enabled: !!selectedSubdomain,
  });

  const scheduleQuestionsRefetch = useCallback(() => {
    if (questionsRefetchTimerRef.current) {
      clearTimeout(questionsRefetchTimerRef.current);
    }
    questionsRefetchTimerRef.current = setTimeout(() => {
      questionsRefetchTimerRef.current = null;
      refetchQuestions();
    }, 800);
  }, [refetchQuestions]);

  const hasSubjectWiseQuestions = useMemo(() => {
    if (selectedClass) return hasSubjectWiseFromAll;
    if (!questionsData) return false;
    const questions =
      questionsData?.data?.data ||
      (Array.isArray(questionsData?.data) ? questionsData.data : []);
    return questions.some(
      (q) => q.questionType === 3 || q.questionType === "3",
    );
  }, [selectedClass, hasSubjectWiseFromAll, questionsData]);

  // Fetch school grades only when a subdomain is open (FLN needs it)
  const { data: gradesData, isLoading: isLoadingGrades } =
    useGetSchoolGradesQuery({
      schoolId: userName || undefined,
      enabled: !!userName && !!selectedSubdomain,
    });

  // Parse grades data to get student counts by class
  const gradesCounts = useMemo(() => {
    if (!gradesData?.data) return {};
    const counts = {};
    gradesData.data.forEach((grade) => {
      counts[grade.stdClass] = grade.count;
    });
    return counts;
  }, [gradesData]);

  const { lowerClass, upperClass } = useMemo(
    () =>
      resolveEffectiveSchoolClassRange(
        schoolData.lowerClass,
        schoolData.upperClass,
        schoolData.schoolCategoryId,
      ),
    [schoolData.lowerClass, schoolData.upperClass, schoolData.schoolCategoryId],
  );

  const classOptions = useMemo(() => {
    if (
      lowerClass !== null &&
      upperClass !== null &&
      lowerClass <= upperClass
    ) {
      return Array.from(
        { length: upperClass - lowerClass + 1 },
        (_, i) => lowerClass + i,
      );
    }
    return [];
  }, [lowerClass, upperClass]);

  // Filter class options based on selected class group
  const filteredClassOptions = useMemo(() => {
    if (!selectedClassGroup) {
      return classOptions;
    }

    let minClass, maxClass;
    if (selectedClassGroup === "1-2") {
      minClass = 1;
      maxClass = 2;
    } else if (selectedClassGroup === "3-5") {
      minClass = 3;
      maxClass = 5;
    } else if (selectedClassGroup === "6-8") {
      minClass = 6;
      maxClass = 8;
    }

    return classOptions.filter((cls) => cls >= minClass && cls <= maxClass);
  }, [classOptions, selectedClassGroup]);

  // Reset class and answers when class group changes
  useEffect(() => {
    if (selectedClassGroup) {
      setSelectedClass(null);
      setSelectedSection(null);
      setSelectedSubject(null);
      // Clear answers when class group changes
      setAnswers({});
      setTextAnswers({});
    }
  }, [selectedClassGroup]);

  // Note: Removed auto-selection of class group and class to prevent
  // sending default cls/section parameters for General Questions

  // Fetch school sections only when class/observation flow needs them
  const { data: sectionsData, isLoading: isLoadingSections } =
    useGetSchoolSectionsQuery({
      schoolId: userName || undefined,
      enabled: !!userName && !!selectedSubdomain,
    });

  // Fetch class-wise subjects when class is selected
  const { data: subjectsData, isLoading: isLoadingSubjects } =
    useGetClassWiseSubjectsQuery({
      classId: selectedClass ? Number(selectedClass) : undefined,
      enabled: !!selectedClass,
    });

  // Extract sections from API response - sections are grouped by classId
  const sections = useMemo(() => {
    if (!sectionsData || !selectedClass) return [];

    const classKey = String(selectedClass);

    if (sectionsData.data && sectionsData.data[classKey]) {
      return sectionsData.data[classKey];
    }

    return [];
  }, [sectionsData, selectedClass]);

  // Note: Removed auto-selection of section to prevent
  // sending default section parameter for General Questions

  // Extract subjects from API response - handle both array and object formats
  const subjects = useMemo(() => {
    if (!subjectsData) return [];
    // If data is an array, return it directly
    if (Array.isArray(subjectsData.data)) {
      return subjectsData.data;
    }
    // If data itself is an array
    if (Array.isArray(subjectsData)) {
      return subjectsData;
    }
    return [];
  }, [subjectsData]);

  // Note: Removed auto-selection of subject to allow manual selection only

  const assessments = useMemo(
    () => normalizeAssessmentsFromDomainsPayload(domainsData, hostelValue, t),
    [domainsData, hostelValue, t],
  );

  const assessmentsWithEvidenceAdjustments = useMemo(
    () =>
      mergeEvidenceAdjustmentsIntoAssessments(
        assessments,
        evidenceAnswerAdjustmentsBySubdomain,
      ),
    [assessments, evidenceAnswerAdjustmentsBySubdomain],
  );

  // Pre-compute કક્ષા 0/4 evidence exemptions so sidebar progress is correct
  // before the user expands each domain/subdomain.
  useEffect(() => {
    if (!assessments.length || !userId || !userName || isLoadingDomains) return;

    let cancelled = false;
    const lang = languageCode || "EN";

    const hydrateSubdomainEvidenceAdjustments = async (subDomainId) => {
      const key = String(subDomainId);
      if (evidenceHydrationRef.current.has(key)) return;
      evidenceHydrationRef.current.add(key);

      try {
        const questionsResponse = await getSubdomainQuestions({
          subDomainId,
          roleId,
          languageCode: lang,
          userId: Number(userId),
        });
        const questions = extractSubdomainQuestions(questionsResponse);
        const adjustments = {};

        await Promise.all(
          questions.map(async (question) => {
            if (!questionRequiresEvidence(question)) return;
            const evidenceResponse = await getQuestionEvidence({
              questionId: question.questionId,
              schoolId: userName,
              languageCode: lang,
            });
            const slots =
              evidenceResponse?.data?.slots ||
              evidenceResponse?.slots ||
              [];
            const adjustment = buildEvidenceAdjustmentForQuestion(
              question,
              slots,
            );
            if (adjustment) {
              adjustments[String(question.questionId)] = adjustment;
            }
          }),
        );

        if (cancelled || !Object.keys(adjustments).length) return;

        setEvidenceAnswerAdjustmentsBySubdomain((prev) => ({
          ...prev,
          [key]: {
            ...(prev[key] || prev[subDomainId] || {}),
            ...adjustments,
          },
        }));
      } catch (error) {
        evidenceHydrationRef.current.delete(key);
        console.warn("Evidence adjustment hydration failed:", subDomainId, error);
      }
    };

    const pendingSubdomainIds = [];
    assessments.forEach((assessment) => {
      (assessment.domains || []).forEach((domain) => {
        (domain.subDomain || []).forEach((subdomain) => {
          const subDomainId = subdomain.subDomainId || subdomain.id;
          if (!subDomainId) return;
          const progress = getSubdomainEvidenceProgress(subdomain);
          if (progress.total > 0 && !progress.isComplete) {
            pendingSubdomainIds.push(subDomainId);
          }
        });
      });
    });

    pendingSubdomainIds.forEach((subDomainId) => {
      hydrateSubdomainEvidenceAdjustments(subDomainId);
    });

    return () => {
      cancelled = true;
    };
  }, [
    assessments,
    userId,
    userName,
    roleId,
    languageCode,
    isLoadingDomains,
  ]);

  useEffect(() => {
    if (!assessments.length) {
      setSelectedAssessmentId(null);
      return;
    }
    const stillExists = assessments.some(
      (a) => Number(a.assessmentId) === Number(selectedAssessmentId),
    );
    if (!selectedAssessmentId || !stillExists) {
      setSelectedAssessmentId(assessments[0].assessmentId);
    }
  }, [assessments, selectedAssessmentId]);

  const selectedAssessment = useMemo(() => {
    if (!assessments.length) return null;
    return (
      assessments.find(
        (a) => Number(a.assessmentId) === Number(selectedAssessmentId),
      ) || assessments[0]
    );
  }, [assessments, selectedAssessmentId]);

  const assessmentTheme = useMemo(
    () => getAssessmentTheme(selectedAssessment),
    [selectedAssessment],
  );

  const domains = useMemo(() => {
    if (!assessmentsWithEvidenceAdjustments.length) return [];
    const selected =
      assessmentsWithEvidenceAdjustments.find(
        (a) => Number(a.assessmentId) === Number(selectedAssessmentId),
      ) || assessmentsWithEvidenceAdjustments[0];
    return selected?.domains || [];
  }, [assessmentsWithEvidenceAdjustments, selectedAssessmentId]);

  // Keep selected subdomain in sync with domains payload (evidence totals, adjustments).
  const resolvedSelectedSubdomain = useMemo(() => {
    if (!selectedSubdomain) return null;
    const selectedId = Number(
      selectedSubdomain.subDomainId || selectedSubdomain.id,
    );
    if (!Number.isFinite(selectedId)) return selectedSubdomain;

    for (const domain of domains) {
      const match = (domain.subDomain || []).find(
        (subdomain) =>
          Number(subdomain.subDomainId || subdomain.id) === selectedId,
      );
      if (match) return match;
    }
    return selectedSubdomain;
  }, [selectedSubdomain, domains]);

  useEffect(() => {
    if (hostelValue !== 0 || !selectedDomain) return;
    if (!isHostelDomain(selectedDomain)) return;
    setSelectedDomain(null);
    setSelectedSubdomain(null);
  }, [hostelValue, selectedDomain]);
  const isPublished =
    selectedAssessment?.isPublished ?? domainsData?.isPublished ?? false;
  const endDate = selectedAssessment?.endDate ?? domainsData?.endDate ?? null;
  const isSubmitted = isAssessmentSubmitted(selectedAssessment);
  const sessionId =
    selectedAssessment?.sessionId ?? domainsData?.sessionId ?? null;

  const allAssessmentsSubmitted = useMemo(
    () =>
      assessments.length > 0 &&
      assessments.every((assessment) => isAssessmentSubmitted(assessment)),
    [assessments],
  );

  const allAssessmentsAnswersComplete = useMemo(
    () =>
      assessments.length > 0 &&
      assessments.every((assessment) => isAssessmentAnswersComplete(assessment)),
    [assessments],
  );

  const allAssessmentsMandatoryEvidenceProgress = useMemo(
    () =>
      getAssessmentMandatoryEvidenceProgress(
        assessmentsWithEvidenceAdjustments.flatMap(
          (assessment) => assessment.domains || [],
        ),
      ),
    [assessmentsWithEvidenceAdjustments],
  );

  const allAssessmentsComplete = useMemo(
    () =>
      assessmentsWithEvidenceAdjustments.length > 0 &&
      assessmentsWithEvidenceAdjustments.every((assessment) =>
        isAssessmentFullyComplete(assessment),
      ),
    [assessmentsWithEvidenceAdjustments],
  );

  const incompleteAssessments = useMemo(
    () => getIncompleteAssessments(assessmentsWithEvidenceAdjustments),
    [assessmentsWithEvidenceAdjustments],
  );

  const assessmentProgress = useMemo(() => {
    const { totalQuestions, totalAnswer, answerPercentage } =
      sumProgressFromDomains(domains);
    const clampedPercentage = Math.min(100, Math.max(0, answerPercentage));

    return {
      totalQuestions,
      totalAnswer,
      answerPercentage: clampedPercentage,
      displayPercentage:
        answerPercentage < 1 && answerPercentage > 0
          ? Number(answerPercentage.toFixed(2))
          : Math.round(clampedPercentage),
    };
  }, [domains]);

  // Check if endDate has passed (end date is inclusive - closed only after end of endDate day)
  const isEndDatePassed = useMemo(() => {
    if (!endDate) return false;
    const currentDate = new Date();
    const endDateObj = new Date(endDate);
    // Compare date-only so that the full endDate day is still open
    const toDateOnly = (d) =>
      new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return toDateOnly(currentDate) > toDateOnly(endDateObj);
  }, [endDate]);

  // Current assessment is read-only only when that assessment is submitted or its end date passed.
  const isReadOnly = isSubmitted || isEndDatePassed;

  // Helper function to map dropdown group range to API group range format
  const mapGroupRangeToApiFormat = (groupRange) => {
    const mapping = {
      "1-2": "1-2",
      "3-5": "3-4-5",
      "6-8": "6-7-8",
    };
    return mapping[groupRange] || groupRange;
  };

  // Helper function to get flag color for a specific subdomain, question type, and group range
  const getGroupFlagColor = (questionType, groupRange) => {
    if (!selectedSubdomain || !domains) return null;

    const subdomainId = selectedSubdomain.subDomainId || selectedSubdomain.id;

    // Find the domain that contains this subdomain
    const domain = domains.find((d) =>
      d.subDomain?.some((sd) => (sd.subDomainId || sd.id) === subdomainId),
    );

    if (!domain) return null;

    // Find the subdomain
    const subdomain = domain.subDomain?.find(
      (sd) => (sd.subDomainId || sd.id) === subdomainId,
    );

    if (!subdomain || !subdomain.groupWise) return null;

    // Map the dropdown group range to API format
    const apiGroupRange = mapGroupRangeToApiFormat(groupRange);

    // Find the matching groupWise entry
    const groupWise = subdomain.groupWise.find(
      (gw) =>
        (gw.questionType === questionType ||
          String(gw.questionType) === String(questionType)) &&
        gw.groupRange === apiGroupRange,
    );

    return groupWise?.flag || null;
  };

  // Helper function to get color value from flag
  const getFlagColorValue = (flag) => {
    switch (flag) {
      case "green":
        return colors.accent.green;
      case "yellow":
        return colors.semantic.warning;
      case "red":
        return colors.semantic.error;
      default:
        return colors.neutral.gray400;
    }
  };

  // Helper function to get total questions count from groupWise array for a specific question type
  const getTotalQuestionsFromGroupWise = (subdomain, questionType) => {
    if (
      !subdomain ||
      !subdomain.groupWise ||
      !Array.isArray(subdomain.groupWise)
    ) {
      return 0;
    }

    return subdomain.groupWise
      .filter(
        (gw) =>
          gw.questionType === questionType ||
          String(gw.questionType) === String(questionType),
      )
      .reduce((total, gw) => total + (gw.totalQuestions || 0), 0);
  };

  // Get total questions count from API groupWise data for current subdomain
  const getTotalQuestionsCount = (questionType) => {
    if (!selectedSubdomain) return 0;

    const subdomainId = selectedSubdomain.subDomainId || selectedSubdomain.id;

    // Find the subdomain in domains data
    const domain = domains.find((d) =>
      d.subDomain?.some((sd) => (sd.subDomainId || sd.id) === subdomainId),
    );

    if (!domain) return 0;

    const subdomain = domain.subDomain?.find(
      (sd) => (sd.subDomainId || sd.id) === subdomainId,
    );

    if (!subdomain) return 0;

    // For question types 2 and 3, use groupWise data
    if (
      questionType === 2 ||
      questionType === "2" ||
      questionType === 3 ||
      questionType === "3"
    ) {
      return getTotalQuestionsFromGroupWise(subdomain, questionType);
    }

    // For question types 1 and 4, check if subdomain has totalQuestions
    // If groupWise exists, subtract those counts to get type 1/4 count
    if (
      subdomain.totalQuestions !== undefined &&
      subdomain.totalQuestions !== null
    ) {
      const groupWiseTotal =
        subdomain.groupWise?.reduce(
          (total, gw) => total + (gw.totalQuestions || 0),
          0,
        ) || 0;
      return Math.max(0, subdomain.totalQuestions - groupWiseTotal);
    }

    return 0;
  };

  // All questions for counting (school class-range filtered; not class-selection filtered)
  const allQuestionsForCount = useMemo(() => {
    let questions = [];
    if (
      allQuestionsData?.data?.data &&
      Array.isArray(allQuestionsData.data.data)
    ) {
      questions = allQuestionsData.data.data;
    } else if (allQuestionsData?.data && Array.isArray(allQuestionsData.data)) {
      questions = allQuestionsData.data;
    }
    return dedupeQuestionsById(
      filterQuestionsByClassRange(questions, lowerClass, upperClass),
    );
  }, [allQuestionsData?.data, lowerClass, upperClass]);

  const allQuestions = useMemo(() => {
    let questions = [];
    if (questionsData?.data?.data && Array.isArray(questionsData.data.data)) {
      questions = questionsData.data.data;
    } else if (questionsData?.data && Array.isArray(questionsData.data)) {
      questions = questionsData.data;
    }
    return dedupeQuestionsById(
      filterQuestionsByClassRange(
        questions,
        lowerClass,
        upperClass,
        selectedClass || null,
      ),
    );
  }, [questionsData?.data, lowerClass, upperClass, selectedClass]);

  // Questions for counting (unfiltered)
  const singleChoiceQuestionsForCount = allQuestionsForCount.filter(
    (q) => q.questionType === 1 || q.questionType === "1",
  );
  const classroomObservationQuestionsForCount = allQuestionsForCount.filter(
    (q) => q.questionType === 2 || q.questionType === "2",
  );
  const subjectObservationQuestionsForCount = allQuestionsForCount.filter(
    (q) => q.questionType === 3 || q.questionType === "3",
  );
  // FLN questions for counting - deduplicate by questionId
  const flnQuestionsForCount = allQuestionsForCount
    .filter((q) => q.questionType === 4 || q.questionType === "4")
    .reduce((unique, question) => {
      if (!unique.find((q) => q.questionId === question.questionId)) {
        unique.push(question);
      }
      return unique;
    }, []);
  const generalQuestionsForCount = allQuestionsForCount.filter((q) => {
    if (q.questionType) {
      return q.questionType === 1 || q.questionType === "1";
    }
    return q.isClassroomObservation !== 1 || q.isClassroomObservation == null;
  });

  // Questions for display (filtered by class/section)
  const singleChoiceQuestions = allQuestions.filter(
    (q) => q.questionType === 1 || q.questionType === "1",
  );
  const classroomObservationQuestions = allQuestions.filter(
    (q) => q.questionType === 2 || q.questionType === "2",
  );
  const subjectObservationQuestions = allQuestions.filter(
    (q) => q.questionType === 3 || q.questionType === "3",
  );
  // FLN questions - deduplicate by questionId since API returns one per class
  const flnQuestions = allQuestions
    .filter((q) => q.questionType === 4 || q.questionType === "4")
    .reduce((unique, question) => {
      if (!unique.find((q) => q.questionId === question.questionId)) {
        unique.push(question);
      }
      return unique;
    }, []);

  // Legacy support - if questionType is not set, use isClassroomObservation
  const classBasedQuestions = allQuestions.filter((q) => {
    if (q.questionType) {
      return (
        q.questionType === 2 ||
        q.questionType === "2" ||
        q.questionType === 3 ||
        q.questionType === "3"
      );
    }
    return q.isClassroomObservation === 1;
  });
  const generalQuestions = allQuestions.filter((q) => {
    if (q.questionType) {
      return q.questionType === 1 || q.questionType === "1";
    }
    return q.isClassroomObservation !== 1 || q.isClassroomObservation == null;
  });

  // Calculate total questions count for each type
  const generalQuestionsTotalCount = useMemo(() => {
    return getTotalQuestionsCount(1);
  }, [selectedSubdomain, domains]);

  const classroomObservationQuestionsTotalCount = useMemo(() => {
    return getTotalQuestionsCount(2);
  }, [selectedSubdomain, domains]);

  const subjectObservationQuestionsTotalCount = useMemo(() => {
    return getTotalQuestionsCount(3);
  }, [selectedSubdomain, domains]);

  const flnQuestionsTotalCount = useMemo(() => {
    return getTotalQuestionsCount(4);
  }, [selectedSubdomain, domains]);

  // Define question type tabs - only show tabs that have actual questions to display
  const questionTabs = useMemo(() => {
    const tabs = [];

    // Only add tab if there are actual questions to display
    if (generalQuestions.length > 0) {
      tabs.push({
        id: "general",
        label: t("selfAssessment.tabs.generalQuestions"),
        icon: <Assignment sx={{ fontSize: 20 }} />,
        color: colors.accent.green,
        questions: generalQuestions,
        questionsForCount: generalQuestionsForCount,
        totalCount: generalQuestionsTotalCount,
      });
    }

    // Only add tab if there are actual questions to display
    if (classroomObservationQuestions.length > 0) {
      tabs.push({
        id: "classroom",
        label: t("selfAssessment.tabs.classroomObservation"),
        icon: <Class sx={{ fontSize: 20 }} />,
        color: assessmentTheme.primary,
        questions: classroomObservationQuestions,
        questionsForCount: classroomObservationQuestionsForCount,
        totalCount: classroomObservationQuestionsTotalCount,
      });
    }

    // Only add tab if there are actual questions to display
    if (subjectObservationQuestions.length > 0) {
      tabs.push({
        id: "subject",
        label: t("selfAssessment.tabs.subjectWiseObservation"),
        icon: <MenuBook sx={{ fontSize: 20 }} />,
        color: colors.accent.purple,
        questions: subjectObservationQuestions,
        questionsForCount: subjectObservationQuestionsForCount,
        totalCount: subjectObservationQuestionsTotalCount,
      });
    }

    // Only add tab if there are actual questions to display
    if (flnQuestions.length > 0) {
      tabs.push({
        id: "fln",
        label: t("selfAssessment.tabs.inputTypeQuestions"),
        icon: <Create sx={{ fontSize: 20 }} />,
        color: colors.semantic.warning,
        questions: flnQuestions,
        questionsForCount: flnQuestionsForCount,
        totalCount: flnQuestionsTotalCount,
      });
    }

    return tabs;
  }, [
    generalQuestions,
    classroomObservationQuestions,
    subjectObservationQuestions,
    flnQuestions,
    generalQuestionsForCount,
    classroomObservationQuestionsForCount,
    subjectObservationQuestionsForCount,
    flnQuestionsForCount,
    generalQuestionsTotalCount,
    classroomObservationQuestionsTotalCount,
    subjectObservationQuestionsTotalCount,
    flnQuestionsTotalCount,
    currentLanguage,
    assessmentTheme.primary,
  ]);

  // Reset tab to first when questions change
  useEffect(() => {
    if (questionTabs.length > 0 && selectedQuestionTab >= questionTabs.length) {
      setSelectedQuestionTab(0);
    }
  }, [questionTabs.length, selectedQuestionTab]);

  const flattenedQuestions = useMemo(() => {
    const items = [];
    questionTabs.forEach((tab, tabIndex) => {
      tab.questions.forEach((question, questionIndexInTab) => {
        items.push({
          question,
          tabId: tab.id,
          tabIndex,
          tabLabel: tab.label,
          tabColor: tab.color,
          questionIndexInTab,
        });
      });
    });
    return items;
  }, [questionTabs]);

  useEffect(() => {
    if (currentQuestionIndex >= flattenedQuestions.length) {
      setCurrentQuestionIndex(0);
    }
  }, [flattenedQuestions.length, currentQuestionIndex]);

  useEffect(() => {
    const entry = flattenedQuestions[currentQuestionIndex];
    if (entry && entry.tabIndex !== selectedQuestionTab) {
      setSelectedQuestionTab(entry.tabIndex);
    }
  }, [currentQuestionIndex, flattenedQuestions, selectedQuestionTab]);

  const currentQuestionEntry =
    flattenedQuestions[currentQuestionIndex] || null;

  const isFirstQuestionInSubdomain = currentQuestionIndex === 0;
  const isLastQuestionInSubdomain =
    flattenedQuestions.length > 0 &&
    currentQuestionIndex === flattenedQuestions.length - 1;

  const nextSubdomainInfo = useMemo(() => {
    if (!selectedDomain || !selectedSubdomain || !domains?.length) return null;

    const domainIdx = domains.findIndex(
      (d) => d.domainId === selectedDomain.domainId,
    );
    const subdomains = selectedDomain.subDomain || [];
    const currentSubId =
      selectedSubdomain.subDomainId || selectedSubdomain.id;
    const subIdx = subdomains.findIndex(
      (sd) => (sd.subDomainId || sd.id) === currentSubId,
    );

    if (subIdx >= 0 && subIdx < subdomains.length - 1) {
      return {
        domain: selectedDomain,
        subdomain: subdomains[subIdx + 1],
      };
    }

    if (domainIdx >= 0 && domainIdx < domains.length - 1) {
      const nextDomain = domains[domainIdx + 1];
      const firstSub = nextDomain.subDomain?.[0];
      if (firstSub) {
        return { domain: nextDomain, subdomain: firstSub };
      }
    }

    return null;
  }, [domains, selectedDomain, selectedSubdomain]);

  const getNextSubdomain = () => nextSubdomainInfo;

  // Get current tab
  const currentTab = questionTabs[selectedQuestionTab] || null;

  const getSubdomainProgress = (subdomain) => {
    const subdomainId = subdomain.subDomainId || subdomain.id;

    // If subdomain has answerPercentage from API, use it
    if (
      subdomain.answerPercentage !== undefined &&
      subdomain.answerPercentage !== null
    ) {
      return clampProgressPercentage(subdomain.answerPercentage);
    }

    // If this is the currently selected subdomain, calculate from current answers
    if (
      selectedSubdomain &&
      (selectedSubdomain.subDomainId || selectedSubdomain.id) === subdomainId
    ) {
      const totalQuestions = allQuestions.length;
      if (totalQuestions === 0) return 0;
      const answeredQuestions = allQuestions.filter(
        (q) => answers[q.questionId],
      ).length;
      return clampProgressPercentage(
        (answeredQuestions / totalQuestions) * 100,
      );
    }

    return 0;
  };

  const getDomainProgress = (domain) => {
    // If domain has answerPercentage from API, use it
    if (
      domain.answerPercentage !== undefined &&
      domain.answerPercentage !== null
    ) {
      return clampProgressPercentage(domain.answerPercentage);
    }

    if (!domain.subDomain || domain.subDomain.length === 0) return 0;

    // Calculate average progress from subdomains
    let totalProgress = 0;
    let subdomainCount = 0;

    domain.subDomain.forEach((subdomain) => {
      const subdomainProgress = getSubdomainProgress(subdomain);
      totalProgress += subdomainProgress;
      subdomainCount++;
    });

    return clampProgressPercentage(
      subdomainCount > 0 ? totalProgress / subdomainCount : 0,
    );
  };

  // Get domain name based on language
  const getDomainName = (domain) => {
    if (languageCode === "EN") {
      return domain.domainNameEn || domain.domainName;
    } else if (languageCode === "HI") {
      return domain.domainNameHi || domain.domainName;
    } else {
      return domain.domainNameGu || domain.domainName;
    }
  };

  // Get subdomain name based on language
  const getSubdomainName = (subdomain) => {
    if (languageCode === "EN") {
      return subdomain.subDomainNameEn || subdomain.subDomainName;
    } else if (languageCode === "HI") {
      return subdomain.subDomainNameHi || subdomain.subDomainName;
    } else {
      return subdomain.subDomainNameGu || subdomain.subDomainName;
    }
  };

  // Get progress color based on percentage
  const getProgressColor = (progress) => {
    if (progress === 100) {
      return colors.accent.green; // Green for completed
    } else if (progress === 0) {
      return colors.semantic.error; // Red for not started
    } else {
      return colors.semantic.warning; // Yellow for in progress
    }
  };

  // Get question text
  const getQuestionText = (question) => {
    return question.questionText || "";
  };

  // Get option text
  const getOptionText = (option) => {
    return option.optionText || "";
  };

  // Helper function to check if API answer should be shown based on question type and selected dropdowns
  const shouldShowApiAnswer = (question) => {
    const questionType =
      question.questionType || (question.isClassroomObservation === 1 ? 2 : 1);

    if (questionType === 1 || questionType === "1") {
      // General questions - no dropdowns needed
      return true;
    } else if (questionType === 2 || questionType === "2") {
      // Classroom observation - needs class and section
      return !!selectedClass && !!selectedSection;
    } else if (questionType === 3 || questionType === "3") {
      // Subject observation - needs class, section, and subject
      return !!selectedClass && !!selectedSection && !!selectedSubject;
    } else if (questionType === 4 || questionType === "4") {
      // FLN questions - no dropdowns needed
      return true;
    }
    return false;
  };

  // Get domain icon based on domain ID or name
  const getDomainIcon = (domain) => {
    // Default icon
    const defaultIcon = <Assessment sx={{ fontSize: 24 }} />;

    try {
      // Check if domain is null/undefined
      if (!domain) {
        console.warn("getDomainIcon: Domain is null or undefined");
        return defaultIcon;
      }

      // Get domain ID and name
      const domainId = domain.domainId;
      const domainName = getDomainName(domain);

      // Check if domainName is valid
      if (!domainName || typeof domainName !== "string") {
        console.warn("getDomainIcon: Invalid domain name for domain:", domain);
        return defaultIcon;
      }

      // Safely convert to lowercase
      const domainNameLower = String(domainName).toLowerCase();

      // Determine icon based on domain ID or name
      if (
        domainId === 1 ||
        domainNameLower.includes("leadership") ||
        domainNameLower.includes("governance")
      ) {
        return <WorkspacePremium sx={{ fontSize: 24 }} />;
      } else if (
        domainId === 2 ||
        domainNameLower.includes("curricul") || // Changed from "curriculum" to catch variations
        domainNameLower.includes("instruction")
      ) {
        return <MenuBook sx={{ fontSize: 24 }} />;
      } else if (
        domainId === 3 ||
        domainNameLower.includes("human") ||
        domainNameLower.includes("resource") ||
        domainNameLower.includes("staff") ||
        domainNameLower.includes("teacher")
      ) {
        return <Groups sx={{ fontSize: 24 }} />;
      } else if (
        domainId === 4 ||
        domainNameLower.includes("facilit") || // Changed from "facility" to catch variations
        domainNameLower.includes("infrastructure")
      ) {
        return <Business sx={{ fontSize: 24 }} />;
      } else if (
        domainId === 5 ||
        domainNameLower.includes("student") ||
        domainNameLower.includes("outcome")
      ) {
        return <SchoolIcon sx={{ fontSize: 24 }} />;
      }
    } catch (error) {
      console.error("Error in getDomainIcon:", error, "Domain:", domain);
    }

    return defaultIcon;
  };

  const toggleQuestionExpansion = (questionId) => {
    setExpandedQuestions((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  const parseOptions = (options) => parseQuestionOptions(options);

  const handleDomainSelect = (domain) => {
    // Toggle domain selection - if already selected, deselect it
    if (selectedDomain?.domainId === domain.domainId) {
      setSelectedDomain(null);
      setSelectedSubdomain(null);
      setAnswers({});
    } else {
      setSelectedDomain(domain);
      // Keep subdomain selected if it belongs to the new domain
      if (
        selectedSubdomain &&
        domain.subDomain?.some(
          (sd) =>
            (sd.subDomainId || sd.id) ===
            (selectedSubdomain.subDomainId || selectedSubdomain.id),
        )
      ) {
        // Subdomain belongs to this domain, keep it selected
      } else {
        setSelectedSubdomain(null);
        setAnswers({});
      }
    }
  };

  const handleSubdomainSelect = (subdomain) => {
    const subdomainId = subdomain.subDomainId || subdomain.id;
    const activeClassKey = selectedClass ? String(selectedClass) : "general";

    if (selectedSubdomain) {
      const currentSubdomainId =
        selectedSubdomain.subDomainId || selectedSubdomain.id;

      // Save current answers to subdomainAnswers
      setSubdomainAnswers((prev) => ({
        ...prev,
        [currentSubdomainId]: { ...answers },
      }));
      setSubdomainTextAnswers((prev) => ({
        ...prev,
        [currentSubdomainId]: { ...textAnswers },
      }));

      // Save current answers to class-wise storage (also supports "general")
      const storageKey = `${currentSubdomainId}_${activeClassKey}`;
      setClassWiseAnswers((prev) => ({
        ...prev,
        [storageKey]: { ...answers },
      }));
      setClassWiseTextAnswers((prev) => ({
        ...prev,
        [storageKey]: { ...textAnswers },
      }));
    }

    const savedAnswers = subdomainAnswers[subdomainId] || {};
    const nextStorageKey = `${subdomainId}_${activeClassKey}`;
    const savedTextAnswers =
      subdomainTextAnswers[subdomainId] ||
      classWiseTextAnswers[nextStorageKey] ||
      {};
    setSelectedSubdomain(subdomain);
    setAnswers(savedAnswers);
    setTextAnswers(savedTextAnswers);
    // Reset class group, class, section, and subject when switching subdomains
    setSelectedClassGroup(null);
    setSelectedClass(null);
    setSelectedSection(null);
    setSelectedSubject(null);
    // Reset question tab and wizard index to first
    setSelectedQuestionTab(0);
    setCurrentQuestionIndex(0);
  };

  const handleAssessmentSelect = (assessment) => {
    setSelectedAssessmentId(assessment.assessmentId);
    setSelectedDomain(null);
    setSelectedSubdomain(null);
    setAnswers({});
    setTextAnswers({});
    setSubdomainTextAnswers({});
    setSelectedClassGroup(null);
    setSelectedClass(null);
    setSelectedSection(null);
    setSelectedSubject(null);
    setSelectedQuestionTab(0);
    setCurrentQuestionIndex(0);
    setChartDrilldownAssessmentId(null);
  };

  // Reset section and subject when class changes
  useEffect(() => {
    if (selectedClass) {
      setSelectedSection(null);
      setSelectedSubject(null);
      // Clear MCQ/option answers only; keep textAnswers so FLN prefill persists
      setAnswers({});
    }
  }, [selectedClass]);

  // Reset subject and answers when section changes
  useEffect(() => {
    if (selectedSection) {
      setSelectedSubject(null);
      // Clear MCQ/option answers only; keep textAnswers so FLN prefill persists
      setAnswers({});
    }
  }, [selectedSection]);

  // Effect to load API answers when questions are fetched (same as SchoolVerification)
  useEffect(() => {
    const questionsForOptions =
      allQuestions && allQuestions.length > 0 ? allQuestions : [];
    const questionsForFLN =
      allQuestionsForCount && allQuestionsForCount.length > 0
        ? allQuestionsForCount
        : questionsForOptions;

    if (
      (questionsForOptions.length > 0 || questionsForFLN.length > 0) &&
      selectedSubdomain
    ) {
      const apiAnswers = {};
      const apiTextAnswers = {};
      const flnAnswersMap = {};

      // Build FLN prefill from unfiltered list so FLN rows (questionId, std, answerText) are always present
      questionsForFLN.forEach((question) => {
        const questionType =
          question.questionType ||
          (question.isClassroomObservation === 1 ? 2 : 1);

        if (questionType !== 4 && questionType !== "4") return;

        const marksValue = question.obtainedMarks ?? question.answerText;
        const hasStd = question.std != null;
        const hasMarks = marksValue != null && marksValue !== "";

        if (hasStd && hasMarks) {
          const qId = question.questionId;
          if (!flnAnswersMap[qId]) flnAnswersMap[qId] = {};
          const stdKey = Number(question.std);
          flnAnswersMap[qId][stdKey] = {
            obtainedMarks: String(marksValue),
            answerId: question.answerId ?? null,
          };
        }
      });

      // Process non-FLN answers from the (possibly filtered) questions list
      questionsForOptions.forEach((question) => {
        const questionType =
          question.questionType ||
          (question.isClassroomObservation === 1 ? 2 : 1);

        let shouldLoadAnswer = false;
        if (questionType === 1 || questionType === "1") {
          shouldLoadAnswer = true;
        } else if (questionType === 2 || questionType === "2") {
          shouldLoadAnswer = !!selectedClass && !!selectedSection;
        } else if (questionType === 3 || questionType === "3") {
          shouldLoadAnswer =
            !!selectedClass &&
            !!selectedSection &&
            !!selectedSubject &&
            question.subjectId === Number(selectedSubject);
        } else if (questionType === 4 || questionType === "4") {
          return;
        }

        if (!shouldLoadAnswer || !question.selectedOptionId) return;

        apiAnswers[question.questionId] = String(question.selectedOptionId);
      });

      // Convert flnAnswersMap to JSON strings for textAnswers state
      Object.keys(flnAnswersMap).forEach((questionId) => {
        if (Object.keys(flnAnswersMap[questionId]).length > 0) {
          apiTextAnswers[questionId] = JSON.stringify(
            flnAnswersMap[questionId],
          );
        }
      });

      if (Object.keys(apiAnswers).length > 0) {
        setAnswers(apiAnswers);
        if (selectedClass) {
          const subdomainId =
            selectedSubdomain.subDomainId || selectedSubdomain.id;
          const classKey = String(selectedClass);
          const storageKey = `${subdomainId}_${classKey}`;
          setClassWiseAnswers((prev) => ({
            ...prev,
            [storageKey]: apiAnswers,
          }));
        }
      } else {
        setAnswers({});
      }

      // Merge FLN textAnswers per questionId so API data for one class doesn't wipe the other
      if (Object.keys(apiTextAnswers).length > 0) {
        setTextAnswers((prevTextAnswers) => {
          const merged = { ...prevTextAnswers };
          Object.keys(apiTextAnswers).forEach((qId) => {
            try {
              const apiData = JSON.parse(apiTextAnswers[qId]);
              let prevData = {};
              if (merged[qId]) {
                try {
                  prevData = JSON.parse(merged[qId]);
                } catch (_) {}
              }
              merged[qId] = JSON.stringify({ ...prevData, ...apiData });
            } catch (_) {
              merged[qId] = apiTextAnswers[qId];
            }
          });
          return merged;
        });
        const currentSubdomainId =
          selectedSubdomain.subDomainId || selectedSubdomain.id;
        setSubdomainTextAnswers((prev) => {
          const existing = prev[currentSubdomainId] || {};
          const merged = { ...existing };
          Object.keys(apiTextAnswers).forEach((qId) => {
            try {
              const apiData = JSON.parse(apiTextAnswers[qId]);
              let existingData = {};
              if (merged[qId]) {
                try {
                  existingData = JSON.parse(merged[qId]);
                } catch (_) {}
              }
              merged[qId] = JSON.stringify({ ...existingData, ...apiData });
            } catch (_) {
              merged[qId] = apiTextAnswers[qId];
            }
          });
          return {
            ...prev,
            [currentSubdomainId]: merged,
          };
        });
        if (selectedClass) {
          const subdomainId =
            selectedSubdomain.subDomainId || selectedSubdomain.id;
          const classKey = String(selectedClass);
          const storageKey = `${subdomainId}_${classKey}`;
          setClassWiseTextAnswers((prev) => ({
            ...prev,
            [storageKey]: {
              ...(prev[storageKey] || {}),
              ...apiTextAnswers,
            },
          }));
        }
      }
    }
  }, [
    allQuestions,
    allQuestionsForCount,
    selectedSubdomain,
    selectedClass,
    selectedSection,
    selectedSubject,
  ]);

  // Handle answer selection
  const handleAnswerChange = (questionId, optionId) => {
    const newAnswers = {
      ...answers,
      [questionId]: optionId,
    };
    setAnswers(newAnswers);

    // Also update subdomainAnswers for the current subdomain
    if (selectedSubdomain) {
      const subdomainId = selectedSubdomain.subDomainId || selectedSubdomain.id;
      setSubdomainAnswers((prev) => ({
        ...prev,
        [subdomainId]: newAnswers,
      }));

      // Save to classWiseAnswers
      const classKey = selectedClass ? String(selectedClass) : "general";
      const storageKey = `${subdomainId}_${classKey}`;
      setClassWiseAnswers((prev) => ({
        ...prev,
        [storageKey]: newAnswers,
      }));
    }
  };

  // Handle text answer change for FLN questions
  const handleTextAnswerChange = (questionId, text) => {
    const newTextAnswers = {
      ...textAnswers,
      [questionId]: text,
    };
    setTextAnswers(newTextAnswers);

    // Save to subdomain-level cache so switching subdomains never wipes FLN entries
    if (selectedSubdomain) {
      const subdomainId = selectedSubdomain.subDomainId || selectedSubdomain.id;
      setSubdomainTextAnswers((prev) => ({
        ...prev,
        [subdomainId]: newTextAnswers,
      }));

      // Save to classWiseTextAnswers
      const classKey = selectedClass ? String(selectedClass) : "general";
      const storageKey = `${subdomainId}_${classKey}`;
      setClassWiseTextAnswers((prev) => ({
        ...prev,
        [storageKey]: newTextAnswers,
      }));
    }
  };

  const submitAnswerMutation = useSubmitAnswerMutation({
    onSuccess: () => {
      // Do not refetch questions/domains per answer — local state already has the selection.
      // Domains + questions refresh on subdomain save / session submit only (cuts SP_GetQuestion storm).
      enqueueSnackbar("Answer submitted successfully!", {
        variant: "success",
      });
    },
    onError: (error) => {
      console.error("Error submitting answer:", error);
      enqueueSnackbar(
        error?.response?.data?.message ||
          "Failed to submit answer. Please try again.",
        {
          variant: "error",
        },
      );
    },
  });

  const submitSubdomainWiseAnswersMutation =
    useSubmitSubdomainWiseAnswersMutation({
      onSuccess: async (data) => {
        // Save current answers to subdomainAnswers before clearing
        if (selectedSubdomain) {
          const subdomainId =
            selectedSubdomain.subDomainId || selectedSubdomain.id;
          setSubdomainAnswers((prev) => ({
            ...prev,
            [subdomainId]: { ...answers },
          }));
          // Backend summary will reflect કક્ષા 0/4 exemptions after refetch.
          setEvidenceAnswerAdjustmentsBySubdomain((prev) => {
            if (!prev[subdomainId] && !prev[String(subdomainId)]) return prev;
            const next = { ...prev };
            delete next[subdomainId];
            delete next[String(subdomainId)];
            return next;
          });
          evidenceHydrationRef.current.delete(String(subdomainId));
        }
        const domainsResult = await fetchDomainsBypassingCache({
          roleId,
          languageCode,
          userId: userId ? Number(userId) : undefined,
        });
        const freshSessionId = getSessionIdFromDomainsResponse(
          domainsResult,
          selectedAssessment?.assessmentId ?? selectedAssessmentId,
        );

        // Never re-upsert with isSubmitted:0 after a final submit (would clear
        // read-only if SP allowed downgrade / stale cache hid sessionId).
        if (
          (freshSessionId === null || freshSessionId === undefined) &&
          !isAssessmentSubmitted(selectedAssessment)
        ) {
          const sessionPayload = {
            sessionId: null,
            assessmentId: selectedAssessment?.assessmentId ?? null,
            userId: Number(userId),
            roleId: Number(roleId),
            schoolId: userName || undefined,
            isSubmitted: 0,
          };
          submitAssessmentMutation.mutate(sessionPayload);
        } else {
          refetchQuestions();
        }
        enqueueSnackbar("All answers submitted successfully!", {
          variant: "success",
        });
      },
      onError: (error) => {
        console.error("Error submitting subdomain answers:", error);
        enqueueSnackbar(
          error?.response?.data?.message ||
            "Failed to submit answers. Please try again.",
          {
            variant: "error",
          },
        );
      },
    });

  const submitAssessmentMutation = useSubmitAssessmentMutation({
    onSuccess: (data, variables) => {
      if (Number(variables?.isSubmitted) === 0) {
        // Must refresh immediately so sessionId is available for the next save
        fetchDomainsBypassingCache({
          roleId,
          languageCode,
          userId: userId ? Number(userId) : undefined,
        });
      } else {
        // Final submission - close the feedback modal
        setShowSubmitConfirmation(false);
        setSubmitFeedback("");

        fetchDomainsBypassingCache({
          roleId,
          languageCode,
          userId: userId ? Number(userId) : undefined,
        });

        // Refetch questions if subdomain is selected
        if (selectedSubdomain) {
          refetchQuestions();
        }

        // Invalidate all school-related queries to refresh dashboard data
        // (domains already refreshed via bypass-cache fetch above)
        queryClient.invalidateQueries({
          queryKey: ["school"],
          predicate: (query) => query.queryKey[1] !== "domains",
        });

        queryClient.invalidateQueries({
          queryKey: queryKeys.school.schoolData(userName),
        });

        queryClient.invalidateQueries({
          queryKey: queryKeys.school.schoolSections(userName),
        });
      }
    },
    onError: (error) => {
      console.error("Error submitting assessment:", error);
      setShowSubmitConfirmation(false);
      setSubmitFeedback("");
      enqueueSnackbar(
        error?.response?.data?.message ||
          "Failed to submit assessment. Please try again.",
        {
          variant: "error",
        },
      );
    },
  });

  // Handler to open answer preview, then final submit from that modal
  const handleOpenSubmitConfirmation = async () => {
    if (!userId) {
      enqueueSnackbar("User ID is missing. Please login again.", {
        variant: "error",
      });
      return;
    }

    if (!allAssessmentsAnswersComplete) {
      enqueueSnackbar(
        t("selfAssessment.submitBlocked.allAssessmentsDomainsIncomplete", {
          defaultValue:
            "Please complete all domains (100%) in every assessment before submitting.",
        }),
        { variant: "warning" },
      );
      return;
    }

    if (!allAssessmentsMandatoryEvidenceComplete) {
      enqueueSnackbar(
        t("selfAssessment.submitBlocked.evidenceIncomplete", {
          remaining: allAssessmentsMandatoryEvidenceProgress.remaining,
          defaultValue:
            "Please upload all mandatory evidence before submitting ({{remaining}} remaining).",
        }),
        { variant: "warning" },
      );
      return;
    }

    if (!canSubmitAssessment) {
      return;
    }

    setSubmitPreviewError(null);
    setSubmitPreviewData([]);
    setShowSubmitPreview(true);
    setIsLoadingSubmitPreview(true);

    try {
      const preview = await buildSubmitPreviewDataForAssessments({
        assessments,
        roleId,
        languageCode,
        userId: Number(userId),
        schoolId: userName || undefined,
        getDomainName,
        getSubdomainName,
        getAssessmentName: (assessment) =>
          assessment.assessmentName ||
          t("selfAssessment.assessmentNameFallback", {
            id: assessment.assessmentId,
          }),
      });
      setSubmitPreviewData(preview);
    } catch (error) {
      console.error("Error loading submit preview:", error);
      setSubmitPreviewError(
        "Failed to load your submitted answers. Please try again.",
      );
    } finally {
      setIsLoadingSubmitPreview(false);
    }
  };

  const handleCloseSubmitPreview = () => {
    if (submitAssessmentMutation.isPending || isFetchingDomains || isSubmittingAllAssessments) {
      return;
    }
    setShowSubmitPreview(false);
    setSubmitPreviewData([]);
    setSubmitPreviewError(null);
  };

  // Handler to confirm final submit from the preview (empty feedback → "NA")
  const handleConfirmSubmit = async () => {
    if (!userId) {
      enqueueSnackbar("User ID is missing. Please login again.", {
        variant: "error",
      });
      return;
    }

    if (
      !allAssessmentsAnswersComplete ||
      !allAssessmentsMandatoryEvidenceComplete ||
      !canSubmitAssessment
    ) {
      return;
    }

    if (submitAssessmentMutation.isPending || isFetchingDomains || isSubmittingAllAssessments) {
      return;
    }

    setIsSubmittingAllAssessments(true);

    try {
      const domainsResult = await fetchDomainsBypassingCache({
        roleId,
        languageCode,
        userId: userId ? Number(userId) : undefined,
      });
      const freshAssessments = mergeEvidenceAdjustmentsIntoAssessments(
        normalizeAssessmentsFromDomainsPayload(domainsResult, hostelValue, t),
        evidenceAnswerAdjustmentsBySubdomain,
      );

      const freshEvidenceProgress = getAssessmentMandatoryEvidenceProgress(
        freshAssessments.flatMap((assessment) => assessment.domains || []),
      );
      if (!freshEvidenceProgress.isComplete) {
        enqueueSnackbar(
          t("selfAssessment.submitBlocked.evidenceIncomplete", {
            remaining: freshEvidenceProgress.remaining,
            defaultValue:
              "Please upload all mandatory evidence before submitting ({{remaining}} remaining).",
          }),
          { variant: "warning" },
        );
        return;
      }

      const pendingAssessments = freshAssessments.filter(
        (assessment) => !isAssessmentSubmitted(assessment),
      );

      if (!pendingAssessments.length) {
        enqueueSnackbar(
          t("selfAssessment.allAssessmentsAlreadySubmitted", {
            defaultValue: "All assessments are already submitted.",
          }),
          { variant: "info" },
        );
        return;
      }

      const feedback = "NA";

      for (const assessment of pendingAssessments) {
        const freshSessionId = getSessionIdFromDomainsResponse(
          domainsResult,
          assessment.assessmentId,
        );

        await submitAssessment({
          sessionId: freshSessionId ?? null,
          assessmentId: assessment.assessmentId ?? null,
          userId: Number(userId),
          roleId: Number(roleId),
          schoolId: userName || undefined,
          isSubmitted: 1,
          feedback,
        });
      }

      setShowSubmitPreview(false);
      setSubmitPreviewData([]);
      setSubmitPreviewError(null);
      setShowSubmitConfirmation(false);
      setSubmitFeedback("");

      // Optimistic: flip UI to read-only immediately even if Redis is briefly stale
      const submittedIds = new Set(
        pendingAssessments.map((a) => Number(a.assessmentId)),
      );
      const domainsQueryKey = queryKeys.school.domains(
        roleId,
        languageCode,
        userId ? Number(userId) : undefined,
      );
      queryClient.setQueryData(domainsQueryKey, (old) => {
        if (!old?.data || !Array.isArray(old.data)) return old;
        return {
          ...old,
          data: old.data.map((assessment) =>
            submittedIds.has(Number(assessment.assessmentId))
              ? { ...assessment, isSubmitted: 1 }
              : assessment,
          ),
        };
      });

      // Bypass Redis so isSubmitted=1 is not masked by a stale GET cache
      await fetchDomainsBypassingCache({
        roleId,
        languageCode,
        userId: userId ? Number(userId) : undefined,
      });

      if (selectedSubdomain) {
        refetchQuestions();
      }

      // Do not invalidate domains here — bypass-cache fetch already set fresh
      // isSubmitted; a normal refetch can re-hit stale Redis and undo read-only.
      queryClient.invalidateQueries({
        queryKey: ["school"],
        predicate: (query) => query.queryKey[1] !== "domains",
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.school.schoolData(userName),
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.school.schoolSections(userName),
      });

      enqueueSnackbar(
        pendingAssessments.length > 1
          ? t("selfAssessment.allAssessmentsSubmitted", {
              defaultValue: "All assessments submitted successfully!",
            })
          : t("selfAssessment.submitSuccess", {
              defaultValue: "Assessment submitted successfully!",
            }),
        { variant: "success" },
      );
    } catch (error) {
      console.error("Error submitting assessments:", error);
      enqueueSnackbar(
        error?.response?.data?.message ||
          "Failed to submit assessments. Please try again.",
        { variant: "error" },
      );
    } finally {
      setIsSubmittingAllAssessments(false);
    }
  };

  const handleConfirmSubmitPreview = handleConfirmSubmit;

  const submitPreviewAnswerCount = useMemo(() => {
    if (!Array.isArray(submitPreviewData)) return 0;
    return submitPreviewData.reduce(
      (total, domain) =>
        total +
        (domain.subdomains || []).reduce(
          (subTotal, subdomain) =>
            subTotal + (subdomain.questions?.length || 0),
          0,
        ),
      0,
    );
  }, [submitPreviewData]);

  const allDomainsComplete = useMemo(() => {
    if (!domains || domains.length === 0) return false;
    return domains.every((domain) => {
      const progress = getDomainProgress(domain);
      return Math.round(progress) === 100;
    });
  }, [domains, getDomainProgress]);

  const mandatoryEvidenceProgress = useMemo(
    () => getAssessmentMandatoryEvidenceProgress(domains),
    [domains],
  );

  const handleSubdomainEvidenceProgressChange = useCallback(
    (progress) => {
      const subDomainId =
        selectedSubdomain?.subDomainId || selectedSubdomain?.id;
      if (!subDomainId || progress == null) return;

      if (progress.questionId != null) {
        const questionKey = String(progress.questionId);
        setEvidenceAnswerAdjustmentsBySubdomain((prev) => {
          const current = { ...(prev[subDomainId] || prev[String(subDomainId)] || {}) };
          if (progress.exempt) {
            current[questionKey] = {
              exempt: true,
              slotTotal: Number(progress.slotTotal ?? progress.rawTotal) || 0,
              slotUploaded:
                Number(progress.slotUploaded ?? progress.rawUploaded) || 0,
            };
          } else if (current[questionKey]) {
            delete current[questionKey];
          } else {
            return prev;
          }
          return {
            ...prev,
            [subDomainId]: current,
          };
        });
      }

      updateDomainsCacheSubdomainEvidence(queryClient, subDomainId, progress);
    },
    [queryClient, selectedSubdomain],
  );

  const allMandatoryEvidenceComplete = mandatoryEvidenceProgress.isComplete;
  const allAssessmentsMandatoryEvidenceComplete =
    allAssessmentsMandatoryEvidenceProgress.isComplete;

  const canSubmitAssessment =
    allAssessmentsAnswersComplete &&
    allAssessmentsMandatoryEvidenceComplete &&
    !allAssessmentsSubmitted;

  // Prepare chart data for bar graph
  const domainChartData = useMemo(() => {
    if (!domains || domains.length === 0) return [];
    return domains.map((domain, index) => {
      const progress = getDomainProgress(domain);
      const roundedProgress = Math.round(progress);
      return {
        name: `${index + 1}. ${getDomainName(domain)}`,
        progress: roundedProgress,
        domainId: domain.domainId,
        color: getProgressColor(progress),
      };
    });
  }, [domains]);

  const assessmentChartData = useMemo(() => {
    if (!assessments || assessments.length === 0) return [];
    return assessments.map((assessment, index) => {
      const assessmentDomains = assessment.domains || [];
      const { answerPercentage } = sumProgressFromDomains(assessmentDomains);
      return {
        name: `${index + 1}. ${
          assessment.assessmentName ||
          t("selfAssessment.assessmentNameFallback", {
            id: assessment.assessmentId,
          })
        }`,
        progress: Math.round(answerPercentage),
        assessmentId: assessment.assessmentId,
        color: getProgressColor(answerPercentage),
      };
    });
  }, [assessments, t]);

  const currentChartData = useMemo(() => {
    if (assessments.length > 1 && !chartDrilldownAssessmentId) {
      return assessmentChartData;
    }
    if (chartDrilldownAssessmentId) {
      const drillAssessment = assessments.find(
        (a) => a.assessmentId === chartDrilldownAssessmentId,
      );
      const drillDomains = drillAssessment?.domains || [];
      return drillDomains.map((domain, index) => {
        const progress = getDomainProgress(domain);
        return {
          name: `${index + 1}. ${getDomainName(domain)}`,
          progress: Math.round(progress),
          domainId: domain.domainId,
          color: getProgressColor(progress),
        };
      });
    }
    return domainChartData;
  }, [
    assessments,
    chartDrilldownAssessmentId,
    assessmentChartData,
    domainChartData,
  ]);

  // Calculate total answered and total questions
  const { totalAnswered, totalQuestions } = useMemo(() => {
    const total = allQuestionsForCount.length;
    const answered = allQuestionsForCount.filter((q) => {
      const questionType =
        q.questionType || (q.isClassroomObservation === 1 ? 2 : 1);
      // For FLN questions (type 4), check if JSON has valid data
      if (questionType === 4 || questionType === "4") {
        const textAnswer = textAnswers[q.questionId];
        if (!textAnswer) return false;
        try {
          const flnData = JSON.parse(textAnswer);
          // Check if at least one class has an answer
          return Object.keys(flnData).some(
            (key) => flnData[key] && flnData[key].obtainedMarks,
          );
        } catch (e) {
          return false;
        }
      }
      // For other questions, check if option is selected
      // Only count API answer if required dropdowns are selected
      const apiAnswer =
        shouldShowApiAnswer(q) && q.selectedOptionId
          ? q.selectedOptionId
          : null;
      return answers[q.questionId] || apiAnswer;
    }).length;
    return { totalAnswered: answered, totalQuestions: total };
  }, [allQuestionsForCount, answers, textAnswers]);

  // Get domain and subdomain indices for numbering
  const { domainNumber, subdomainNumber } = useMemo(() => {
    if (!selectedDomain || !selectedSubdomain) {
      return { domainNumber: 0, subdomainNumber: 0 };
    }

    const domainIdx = domains.findIndex(
      (d) => d.domainId === selectedDomain.domainId,
    );
    const subdomainIdx = selectedDomain.subDomain?.findIndex(
      (sd) =>
        (sd.subDomainId || sd.id) ===
        (selectedSubdomain.subDomainId || selectedSubdomain.id),
    );

    return {
      domainNumber: domainIdx + 1,
      subdomainNumber: subdomainIdx + 1,
    };
  }, [selectedDomain, selectedSubdomain, domains]);

  // Handle individual question submission
  const handleSubmitQuestion = (question) => {
    if (!userId) {
      enqueueSnackbar("User ID is missing. Please login again.", {
        variant: "error",
      });
      return;
    }

    const questionType =
      question.questionType || (question.isClassroomObservation === 1 ? 2 : 1);

    // For FLN questions (type 4), validate text answer
    if (questionType === 4 || questionType === "4") {
      const textAnswer = textAnswers[question.questionId];
      if (!textAnswer) {
        enqueueSnackbar("Please enter an answer before submitting.", {
          variant: "warning",
        });
        return;
      }
      // Validate that at least one class has an answer
      try {
        const flnData = JSON.parse(textAnswer);
        const hasAnswer = Object.keys(flnData).some(
          (key) => flnData[key] && flnData[key].obtainedMarks,
        );
        if (!hasAnswer) {
          enqueueSnackbar("Please enter marks for at least one class.", {
            variant: "warning",
          });
          return;
        }
      } catch (e) {
        enqueueSnackbar("Invalid answer format. Please try again.", {
          variant: "error",
        });
        return;
      }
    } else {
      // For other question types, validate option selection
      const userSelectedOption = answers[question.questionId];
      const apiSelectedOption =
        shouldShowApiAnswer(question) && question.selectedOptionId
          ? String(question.selectedOptionId)
          : null;
      const selectedOptionId = userSelectedOption || apiSelectedOption;

      if (!selectedOptionId) {
        enqueueSnackbar("Please select an option before submitting.", {
          variant: "warning",
        });
        return;
      }
    }

    let classValue = 2; // Default
    let sectionValue = "general"; // Default
    let subjectId = null;

    // For classroom observation (type 2) and subject observation (type 3)
    if (
      questionType === 2 ||
      questionType === "2" ||
      questionType === 3 ||
      questionType === "3"
    ) {
      if (!selectedClass) {
        enqueueSnackbar("Please select a class before submitting.", {
          variant: "warning",
        });
        return;
      }
      if (!selectedSection) {
        enqueueSnackbar("Please select a section before submitting.", {
          variant: "warning",
        });
        return;
      }
      classValue = Number(selectedClass);
      sectionValue = selectedSection;

      // For subject observation (type 3), subject is required
      if (questionType === 3 || questionType === "3") {
        if (!selectedSubject) {
          enqueueSnackbar("Please select a subject before submitting.", {
            variant: "warning",
          });
          return;
        }
        subjectId = Number(selectedSubject);
      }
    }

    const payload = {
      isAns: 1,
      answerId: question.answerId || null,
      questionId: question.questionId,
      userId: Number(userId),
      subjectId: subjectId,
      optionId:
        questionType === 4 || questionType === "4"
          ? null
          : Number(
              answers[question.questionId] ||
                (shouldShowApiAnswer(question) && question.selectedOptionId
                  ? question.selectedOptionId
                  : null),
            ),
      obtainedMarks:
        questionType === 4 || questionType === "4"
          ? textAnswers[question.questionId]
          : null,
      cls: classValue,
      section: sectionValue,
      schoolId: userName || undefined,
    };

    submitAnswerMutation.mutate(payload);
  };

  // Handle submit - Submit all answers for the current subdomain
  const handleSubmit = () => {
    if (
      submitSubdomainWiseAnswersMutation.isPending ||
      submitAssessmentMutation.isPending ||
      isFetchingDomains
    ) {
      return;
    }

    if (!selectedSubdomain) {
      enqueueSnackbar("Please select a subdomain first.", {
        variant: "warning",
      });
      return;
    }

    // Check if there are any answers (either option-based or text-based)
    const hasAnswers =
      (answers && Object.keys(answers).length > 0) ||
      (textAnswers && Object.keys(textAnswers).length > 0);

    if (!hasAnswers) {
      enqueueSnackbar(
        "Please answer at least one question before submitting.",
        {
          variant: "warning",
        },
      );
      return;
    }

    // Validate class/section/subject based on CURRENT TAB TYPE only
    if (currentTab?.id === "classroom") {
      if (!selectedClass) {
        enqueueSnackbar("Please select a class before submitting.", {
          variant: "warning",
        });
        return;
      }
      if (!selectedSection) {
        enqueueSnackbar("Please select a section before submitting.", {
          variant: "warning",
        });
        return;
      }
    }

    if (currentTab?.id === "subject") {
      if (!selectedClass) {
        enqueueSnackbar("Please select a class before submitting.", {
          variant: "warning",
        });
        return;
      }
      if (!selectedSection) {
        enqueueSnackbar("Please select a section before submitting.", {
          variant: "warning",
        });
        return;
      }
      if (!selectedSubject) {
        enqueueSnackbar("Please select a subject before submitting.", {
          variant: "warning",
        });
        return;
      }
    }

    let clsValue = null;
    let sectionValue = null;
    const isClassSelected =
      (currentTab?.id === "classroom" || currentTab?.id === "subject") &&
      selectedClass;

    if (isClassSelected) {
      // Class-based questions - use selected class and section
      clsValue = Number(selectedClass);
      sectionValue = selectedSection || null;
    }
    // For General / FLN tabs, cls and section must stay null so type-1 answers
    // are not duplicated per class/section in question_answer.

    // Determine questionType for current submission (tab-based)
    const questionTypeByTabId = {
      general: 1,
      classroom: 2,
      subject: 3,
      fln: 4,
    };
    const payloadQuestionType = currentTab?.id
      ? questionTypeByTabId[currentTab.id] || null
      : null;

    // Format answers array from current tab questions only
    const answersArray = [];
    const questionsToProcess =
      currentTab?.questions?.length > 0 ? currentTab.questions : allQuestions;

    for (const question of questionsToProcess) {
      const questionType =
        question.questionType ||
        (question.isClassroomObservation === 1 ? 2 : 1);

      if (
        payloadQuestionType != null &&
        Number(questionType) !== Number(payloadQuestionType)
      ) {
        continue;
      }

      // For FLN questions (type 4), create separate answer objects for each class
      if (questionType === 4 || questionType === "4") {
        const textAnswer = textAnswers[question.questionId];
        if (textAnswer) {
          try {
            const flnData = JSON.parse(textAnswer);
            // Create separate answer objects for class 2 and 3
            [2, 3].forEach((classNum) => {
              if (flnData[classNum] && flnData[classNum].obtainedMarks) {
                answersArray.push({
                  answerId: flnData[classNum].answerId || null, // Use class-specific answerId
                  questionId: question.questionId,
                  optionId: null,
                  obtainedMarks: {
                    answerText: Number(flnData[classNum].obtainedMarks),
                    std: classNum,
                  },
                });
              }
            });
          } catch (e) {
            console.error("Error parsing FLN answer:", e);
          }
        }
      } else {
        // For other question types, check if option is selected
        const userSelectedAnswer = answers[question.questionId];
        const apiSelectedAnswer =
          shouldShowApiAnswer(question) && question.selectedOptionId
            ? String(question.selectedOptionId)
            : null;
        const selectedOptionId = userSelectedAnswer || apiSelectedAnswer;

        if (selectedOptionId) {
          answersArray.push({
            answerId: question.answerId || null,
            questionId: question.questionId,
            optionId: Number(selectedOptionId),
            obtainedMarks: null,
          });
        }
      }
    }

    if (answersArray.length === 0) {
      enqueueSnackbar(
        "Please answer at least one question before submitting.",
        {
          variant: "warning",
        },
      );
      return;
    }

    if (!userId) {
      enqueueSnackbar("User ID is missing. Please login again.", {
        variant: "error",
      });
      return;
    }

    const payload = {
      isAns: 1,
      questionType: payloadQuestionType,
      userId: Number(userId),
      cls: clsValue,
      section: sectionValue,
      subjectId: selectedSubject ? Number(selectedSubject) : null,
      schoolId: userName || undefined,
      answers: answersArray,
    };

    submitSubdomainWiseAnswersMutation.mutate(payload);
  };

  const handleNextQuestion = () => {
    if (!isLastQuestionInSubdomain) {
      setCurrentQuestionIndex((prev) =>
        Math.min(prev + 1, flattenedQuestions.length - 1),
      );
    }
  };

  const handlePreviousQuestion = () => {
    if (!isFirstQuestionInSubdomain) {
      setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0));
    }
  };

  const handleGoToNextSubdomain = () => {
    const next = getNextSubdomain();
    if (!next) {
      enqueueSnackbar("You have reached the last subdomain.", {
        variant: "info",
      });
      return;
    }

    if (selectedSubdomain) {
      const currentSubdomainId =
        selectedSubdomain.subDomainId || selectedSubdomain.id;
      const activeClassKey = selectedClass ? String(selectedClass) : "general";

      setSubdomainAnswers((prev) => ({
        ...prev,
        [currentSubdomainId]: { ...answers },
      }));
      setSubdomainTextAnswers((prev) => ({
        ...prev,
        [currentSubdomainId]: { ...textAnswers },
      }));

      const storageKey = `${currentSubdomainId}_${activeClassKey}`;
      setClassWiseAnswers((prev) => ({
        ...prev,
        [storageKey]: { ...answers },
      }));
      setClassWiseTextAnswers((prev) => ({
        ...prev,
        [storageKey]: { ...textAnswers },
      }));
    }

    if (next.domain.domainId !== selectedDomain?.domainId) {
      setSelectedDomain(next.domain);
    }

    const nextSubId = next.subdomain.subDomainId || next.subdomain.id;
    const savedAnswers = subdomainAnswers[nextSubId] || {};
    const nextStorageKey = `${nextSubId}_general`;
    const savedTextAnswers =
      subdomainTextAnswers[nextSubId] ||
      classWiseTextAnswers[nextStorageKey] ||
      {};

    setSelectedSubdomain(next.subdomain);
    setAnswers(savedAnswers);
    setTextAnswers(savedTextAnswers);
    setSelectedClassGroup(null);
    setSelectedClass(null);
    setSelectedSection(null);
    setSelectedSubject(null);
    setSelectedQuestionTab(0);
    setCurrentQuestionIndex(0);
  };

  const isSaveAssessmentDisabled = () => {
    if (submitSubdomainWiseAnswersMutation.isPending) return true;

    const hasAnswers =
      (answers && Object.keys(answers).length > 0) ||
      (textAnswers && Object.keys(textAnswers).length > 0);

    if (!hasAnswers) return true;

    const hasAnsweredClassBasedQuestions = classBasedQuestions.some(
      (q) => answers[q.questionId] || textAnswers[q.questionId],
    );

    const hasAnsweredSubjectQuestions = subjectObservationQuestions.some(
      (q) => answers[q.questionId] || textAnswers[q.questionId],
    );

    if (hasAnsweredClassBasedQuestions) {
      if (!selectedClass || !selectedSection) return true;
      if (hasAnsweredSubjectQuestions && !selectedSubject) return true;
    }

    return false;
  };

  const isAssessmentDataLoading =
    isLoadingSchoolData ||
    (hostelValue !== null && isLoadingDomains && !isErrorDomains);
  const isAssessmentDataRefreshing =
    isFetchingDomains && !isLoadingDomains && !isErrorDomains;

  return {
    navigate,
    theme,
    matchDownMD,
    drawerOpen,
    setDrawerOpen,
    logout,
    user,
    userId,
    userName,
    t,
    i18n,
    currentLanguage,
    setCurrentLanguage,
    handleLanguageChange,
    selectedDomain,
    setSelectedDomain,
    selectedSubdomain: resolvedSelectedSubdomain,
    setSelectedSubdomain,
    answers,
    setAnswers,
    subdomainAnswers,
    setSubdomainAnswers,
    subdomainTextAnswers,
    setSubdomainTextAnswers,
    classWiseAnswers,
    setClassWiseAnswers,
    classWiseTextAnswers,
    setClassWiseTextAnswers,
    selectedClassGroup,
    setSelectedClassGroup,
    selectedClass,
    setSelectedClass,
    selectedSection,
    setSelectedSection,
    selectedSubject,
    setSelectedSubject,
    textAnswers,
    setTextAnswers,
    expandedQuestions,
    setExpandedQuestions,
    showSubmitConfirmation,
    setShowSubmitConfirmation,
    showSubmitPreview,
    submitPreviewData,
    isLoadingSubmitPreview,
    submitPreviewError,
    submitPreviewAnswerCount,
    handleCloseSubmitPreview,
    handleConfirmSubmitPreview,
    selectedQuestionTab,
    setSelectedQuestionTab,
    currentQuestionIndex,
    setCurrentQuestionIndex,
    flattenedQuestions,
    currentQuestionEntry,
    isFirstQuestionInSubdomain,
    isLastQuestionInSubdomain,
    nextSubdomainInfo,
    getNextSubdomain,
    handleNextQuestion,
    handlePreviousQuestion,
    handleGoToNextSubdomain,
    isSaveAssessmentDisabled,
    sessionId,
    selectedAssessmentId,
    setSelectedAssessmentId,
    chartDrilldownAssessmentId,
    setChartDrilldownAssessmentId,
    logoutMutation,
    handleDrawerToggle,
    handleLogout,
    languageCodeMap,
    languageCode,
    roleId,
    queryClient,
    domainsData,
    isLoadingDomains,
    isFetchingDomains,
    isAssessmentDataLoading,
    isAssessmentDataRefreshing,
    isErrorDomains,
    refetchDomains,
    allQuestionsData,
    hasSubjectWiseQuestions,
    questionsData,
    isLoadingQuestions,
    isErrorQuestions,
    refetchQuestions,
    schoolDataResponse,
    isLoadingSchoolData,
    schoolData,
    gradesData,
    isLoadingGrades,
    gradesCounts,
    lowerClass,
    upperClass,
    classOptions,
    filteredClassOptions,
    sectionsData,
    isLoadingSections,
    subjectsData,
    isLoadingSubjects,
    sections,
    subjects,
    assessments,
    selectedAssessment,
    assessmentTheme,
    domains,
    isPublished,
    endDate,
    isSubmitted,
    isEndDatePassed,
    isReadOnly,
    assessmentProgress,
    mapGroupRangeToApiFormat,
    getGroupFlagColor,
    getFlagColorValue,
    getTotalQuestionsFromGroupWise,
    getTotalQuestionsCount,
    allQuestionsForCount,
    allQuestions,
    singleChoiceQuestionsForCount,
    classroomObservationQuestionsForCount,
    subjectObservationQuestionsForCount,
    flnQuestionsForCount,
    generalQuestionsForCount,
    singleChoiceQuestions,
    classroomObservationQuestions,
    subjectObservationQuestions,
    flnQuestions,
    classBasedQuestions,
    generalQuestions,
    generalQuestionsTotalCount,
    classroomObservationQuestionsTotalCount,
    subjectObservationQuestionsTotalCount,
    flnQuestionsTotalCount,
    questionTabs,
    currentTab,
    getSubdomainProgress,
    getDomainProgress,
    getDomainName,
    getSubdomainName,
    getProgressColor,
    getQuestionText,
    getOptionText,
    shouldShowApiAnswer,
    getDomainIcon,
    toggleQuestionExpansion,
    parseOptions,
    handleDomainSelect,
    handleSubdomainSelect,
    handleAssessmentSelect,
    handleAnswerChange,
    handleTextAnswerChange,
    submitAnswerMutation,
    submitSubdomainWiseAnswersMutation,
    submitAssessmentMutation,
    handleOpenSubmitConfirmation,
    handleConfirmSubmit,
    allDomainsComplete,
    allMandatoryEvidenceComplete,
    allAssessmentsComplete,
    allAssessmentsSubmitted,
    allAssessmentsAnswersComplete,
    allAssessmentsMandatoryEvidenceProgress,
    allAssessmentsMandatoryEvidenceComplete,
    incompleteAssessments,
    mandatoryEvidenceProgress,
    handleSubdomainEvidenceProgressChange,
    canSubmitAssessment,
    isSubmittingAllAssessments,
    domainChartData,
    assessmentChartData,
    currentChartData,
    totalAnswered,
    totalQuestions,
    domainNumber,
    subdomainNumber,
    handleSubmitQuestion,
    handleSubmit,
  };
}
