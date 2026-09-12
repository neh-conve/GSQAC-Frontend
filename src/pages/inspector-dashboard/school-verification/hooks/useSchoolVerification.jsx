import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "../../../../config/queryClient";
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Alert,
  Chip,
  RadioGroup,
  FormControlLabel,
  Radio,
  LinearProgress,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Divider,
  TextField,
  IconButton,
  Tabs,
  Tab,
} from "@mui/material";
import {
  CheckCircle,
  ArrowForward,
  Assessment,
  Class,
  Assignment,
  ExpandMore,
  ExpandLess,
  WorkspacePremium,
  MenuBook,
  Groups,
  Business,
  School as SchoolIcon,
  Create,
} from "@mui/icons-material";
import { colors } from "../../../../constants/colors";
import {
  useGetDomainsQuery,
  useGetSubdomainQuestionsQuery,
  useSubmitAnswerMutation,
  useSubmitSubdomainWiseAnswersMutation,
  useGetSchoolDataQuery,
  useGetSchoolSectionsQuery,
  useGetSchoolGradesQuery,
  useSubmitAssessmentMutation,
} from "../../../../services/verifierService";
import { getRoleId } from "../../../../constants/roles";
import { enqueueSnackbar } from "notistack";
import useAuthStore from "../../../../store/useAuthStore";
import { ToggleButtonGroup, ToggleButton, useMediaQuery } from "@mui/material";
import { useTheme } from "@mui/material/styles";
import { useGetClassWiseSubjectsQuery } from "../../../../services/adminService";
import ConfirmationModal from "../../../../components/ConfirmationModal/ConfirmationModal";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { filterQuestionsByClassRange, resolveEffectiveSchoolClassRange } from "../../../../utils/classRange";
import { dedupeQuestionsById } from "../../../../utils/dedupeQuestions";
import { parseQuestionOptions, resolveAssessmentPeriod } from "../../../../utils/assessmentMeta";
import {
  clampProgressPercentage,
  sanitizeDomainsProgress,
} from "../../../../utils/assessmentSubmit";
import { getAssessmentTheme } from "../../../../utils/assessmentTheme";
import { sumProgressFromDomains } from "../../../../utils/hostelDomain";
import {
  getStoredAppLanguage,
  persistAppLanguage,
} from "../../../../utils/i18nLanguage";
import { useLogoutMutation } from "../../../../services/authService";
import {
  zeroMandatoryEvidenceProgress,
} from "../../../../services/evidenceService";

export function useSchoolVerification() {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const matchDownMD = useMediaQuery(theme.breakpoints.down("md"));
  const navigate = useNavigate();
  const location = useLocation();
  const { userId, userName, user, logout } = useAuthStore();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const queryClient = useQueryClient();
  const [currentLanguage, setCurrentLanguage] = useState("gu");
  const [selectedDomain, setSelectedDomain] = useState(null);
  const [selectedSubdomain, setSelectedSubdomain] = useState(null);
  const [answers, setAnswers] = useState({});
  const [subdomainAnswers, setSubdomainAnswers] = useState({});
  const [subdomainTextAnswers, setSubdomainTextAnswers] = useState({});
  const [classWiseAnswers, setClassWiseAnswers] = useState({});
  const [classWiseTextAnswers, setClassWiseTextAnswers] = useState({});
  const [selectedClassGroup, setSelectedClassGroup] = useState(null);
  const [selectedClass, setSelectedClass] = useState(null);
  const [selectedSection, setSelectedSection] = useState(null);
  const [selectedSubject, setSelectedSubject] = useState(null);
  const [textAnswers, setTextAnswers] = useState({});
  const [expandedQuestions, setExpandedQuestions] = useState({});
  const [showSubmitConfirmation, setShowSubmitConfirmation] = useState(false);
  const [selectedQuestionTab, setSelectedQuestionTab] = useState(0);
  const [selectedAssessmentId, setSelectedAssessmentId] = useState(null);
  const [chartDrilldownAssessmentId, setChartDrilldownAssessmentId] =
    useState(null);

  // Get school info from location state
  const schoolFromState = location.state?.school;
  const schoolId =
    schoolFromState?.schoolId || schoolFromState?.schoolCode || userName;

  const languageCodeMap = {
    en: "EN",
    hi: "HI",
    gu: "GU",
  };
  const languageCode = languageCodeMap[currentLanguage] || "EN";

  // Use inspector role ID (roleId: 3)
  const roleId = getRoleId("inspector");

  const logoutMutation = useLogoutMutation({
    onSuccess: () => {
      logout();
      navigate("/login");
    },
    onError: () => {
      logout();
      navigate("/login");
    },
  });

  const handleDrawerToggle = () => setDrawerOpen((prev) => !prev);
  const handleLogout = () => logoutMutation.mutate();

  const handleLanguageChange = useCallback(
    (lang) => {
      const next = lang || getStoredAppLanguage() || "gu";
      setCurrentLanguage(next);
      persistAppLanguage(next);
      i18n.changeLanguage(next);
    },
    [i18n],
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
    schoolId: schoolId || undefined,
    enabled: !!roleId,
  });

  // Fetch all questions (without class filter) for counting purposes
  const { data: allQuestionsData } = useGetSubdomainQuestionsQuery({
    subDomainId: selectedSubdomain?.subDomainId || selectedSubdomain?.id,
    roleId,
    languageCode,
    userId: userId ? Number(userId) : undefined,
    schoolId: schoolId || undefined,
    enabled: !!selectedSubdomain,
  });

  // Check if there are subject-wise questions (type 3) in the current subdomain
  const hasSubjectWiseQuestions = useMemo(() => {
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
    // Only send cls and section when they are explicitly selected
    ...(selectedClass && { classNumber: Number(selectedClass) }),
    ...(selectedSection && { section: selectedSection }),
    // Only send subjectId for subject-wise questions when subject is selected
    ...(hasSubjectWiseQuestions &&
      selectedSubject && { subjectId: Number(selectedSubject) }),
    userId: userId ? Number(userId) : undefined,
    schoolId: schoolId || undefined,
    enabled: !!selectedSubdomain,
  });

  const { data: schoolDataResponse, isLoading: isLoadingSchoolData } =
    useGetSchoolDataQuery({
      schoolId: schoolId || undefined,
    });

  const schoolData = schoolDataResponse?.data || {};

  // Fetch school grades for FLN questions
  const { data: gradesData, isLoading: isLoadingGrades } =
    useGetSchoolGradesQuery({
      schoolId: schoolId || undefined,
      enabled: !!schoolId,
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

  // Fetch all school sections once
  const { data: sectionsData, isLoading: isLoadingSections } =
    useGetSchoolSectionsQuery({
      schoolId: schoolId || undefined,
      enabled: !!schoolId,
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

  const assessments = useMemo(() => {
    let list = [];
    if (Array.isArray(domainsData?.data)) {
      if (domainsData.data.length > 0 && domainsData.data[0]?.domains) {
        list = domainsData.data;
      } else {
        list = [
          {
            assessmentId: null,
            assessmentName: "Assessment",
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
    return list.map((assessment) => ({
      ...assessment,
      ...resolveAssessmentPeriod({
        academicYear: assessment.academicYear || domainsData?.academicYear,
        round: assessment.round ?? domainsData?.round,
      }),
      answerPercentage: clampProgressPercentage(assessment.answerPercentage),
      domains: sanitizeDomainsProgress(assessment.domains || []),
    }));
  }, [domainsData]);

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

  const domains = selectedAssessment?.domains || [];

  const assessmentTheme = useMemo(
    () => getAssessmentTheme(selectedAssessment),
    [selectedAssessment],
  );

  const isPublished = Boolean(
    selectedAssessment?.isPublished ?? domainsData?.isPublished ?? false,
  );
  const endDate = selectedAssessment?.endDate ?? domainsData?.endDate ?? null;
  const isSubmitted = Boolean(
    selectedAssessment?.isSubmitted ?? domainsData?.isSubmitted ?? false,
  );
  const sessionId =
    selectedAssessment?.sessionId ?? domainsData?.sessionId ?? null;

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

  const isEndDatePassed = false;
  const isReadOnly = isSubmitted || isEndDatePassed;
  const handleSubdomainEvidenceProgressChange = useCallback(() => {}, []);

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

  // Get total counts from API groupWise data
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

  // Questions for counting (unfiltered) - kept for answer checking logic
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

  // Get domain name based on language
  const getDomainName = (domain) => {
    if (!domain) return "";
    if (languageCode === "EN") {
      return domain.domainNameEn || domain.domainName || "";
    } else if (languageCode === "HI") {
      return domain.domainNameHi || domain.domainName || "";
    } else {
      return domain.domainNameGu || domain.domainName || "";
    }
  };

  // Get subdomain name based on language
  const getSubdomainName = (subdomain) => {
    if (!subdomain) return "";
    if (languageCode === "EN") {
      return subdomain.subDomainNameEn || subdomain.subDomainName || "";
    } else if (languageCode === "HI") {
      return subdomain.subDomainNameHi || subdomain.subDomainName || "";
    } else {
      return subdomain.subDomainNameGu || subdomain.subDomainName || "";
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

  // Calculate subdomain progress
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
      const answeredQuestions = allQuestions.filter((q) => {
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
      return clampProgressPercentage(
        (answeredQuestions / totalQuestions) * 100,
      );
    }

    return 0;
  };

  // Calculate domain progress
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

  // Get domain icon
  // Get domain icon based on domain ID or name
  const getDomainIcon = (domain) => {
    if (!domain) return <Assessment sx={{ fontSize: 24 }} />;
    const domainId = domain.domainId;
    const domainName = getDomainName(domain);
    if (!domainName) return <Assessment sx={{ fontSize: 24 }} />;
    const domainNameLower = domainName.toLowerCase();

    if (
      domainId === 1 ||
      domainNameLower.includes("leadership") ||
      domainNameLower.includes("governance")
    ) {
      return <WorkspacePremium sx={{ fontSize: 24 }} />;
    } else if (
      domainId === 2 ||
      domainNameLower.includes("curriculum") ||
      domainNameLower.includes("instruction") ||
      domainNameLower.includes("teaching") ||
      domainNameLower.includes("learning")
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
      domainNameLower.includes("facility") ||
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
    return <Assessment sx={{ fontSize: 24 }} />;
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

  // Handle domain selection
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
    setChartDrilldownAssessmentId(null);
    setSelectedQuestionTab(0);
    setCurrentQuestionIndex(0);
  };

  // Effect to handle class changes - reset section and subject
  useEffect(() => {
    if (!selectedSubdomain) return;

    // If class is cleared, also clear section and subject
    if (!selectedClass) {
      setSelectedSection(null);
      setSelectedSubject(null);
      setAnswers({});
      // Do not clear textAnswers here so FLN prefilled data from API is preserved
      return;
    }

    // Reset subject when class changes (since it's class-specific)
    setSelectedSubject(null);

    // Reset MCQ/option answers only; keep textAnswers (FLN input) so prefilled data persists
    setAnswers({});
  }, [selectedClass, selectedSubdomain]);

  // Effect to handle section changes - reset subject and answers
  useEffect(() => {
    if (!selectedSubdomain) return;

    // If section is cleared, also clear subject
    if (!selectedSection) {
      setSelectedSubject(null);
      setAnswers({});
      // Do not clear textAnswers so FLN prefilled data persists when switching tabs
      return;
    }

    // Reset subject when section changes
    setSelectedSubject(null);

    // Reset MCQ/option answers only; keep textAnswers (FLN input) so prefilled data persists
    setAnswers({});
  }, [selectedSection, selectedSubdomain]);

  // Effect to handle subject changes - reset answers
  useEffect(() => {
    if (!selectedSubdomain) return;

    // If subject is cleared, clear option answers only; keep textAnswers for FLN
    if (!selectedSubject) {
      setAnswers({});
      return;
    }

    // Reset MCQ/option answers only; keep textAnswers (FLN input) so prefilled data persists
    setAnswers({});
  }, [selectedSubject, selectedSubdomain]);

  // Effect to load API answers when questions are fetched (API answers take priority)
  useEffect(() => {
    const questionsForOptions =
      allQuestions && allQuestions.length > 0 ? allQuestions : [];
    // Use unfiltered list for FLN so we always have type-4 answers (API returns one row per questionId+std)
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
      const flnAnswersMap = {}; // To group FLN answers by questionId

      // Build FLN prefill from unfiltered list so FLN rows (questionId, std, answerText) are always present
      questionsForFLN.forEach((question) => {
        const questionType =
          question.questionType ||
          (question.isClassroomObservation === 1 ? 2 : 1);

        if (questionType !== 4 && questionType !== "4") return;

        // FLN/input type: API sends answerText (and optionally obtainedMarks)
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
            !!selectedClass && !!selectedSection && !!selectedSubject;
        } else if (questionType === 4 || questionType === "4") {
          return; // FLN already handled above
        }

        if (!shouldLoadAnswer || !question.selectedOptionId) return;

        if (questionType === 3 || questionType === "3") {
          if (
            question.subjectId &&
            Number(question.subjectId) === Number(selectedSubject)
          ) {
            apiAnswers[question.questionId] = String(question.selectedOptionId);
          }
        } else {
          apiAnswers[question.questionId] = String(question.selectedOptionId);
        }
      });

      // Convert flnAnswersMap to JSON strings for textAnswers state
      Object.keys(flnAnswersMap).forEach((questionId) => {
        if (Object.keys(flnAnswersMap[questionId]).length > 0) {
          apiTextAnswers[questionId] = JSON.stringify(
            flnAnswersMap[questionId],
          );
        }
      });

      // API answers take priority - they override any locally saved answers
      // Only set answers if we have valid answers that match current selections
      if (Object.keys(apiAnswers).length > 0) {
        setAnswers(apiAnswers);

        // Also save to classWiseAnswers so it persists (if class is selected)
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
        // If no API answers match current selections, ensure answers are cleared
        // This prevents showing cached answers from previous selections
        setAnswers({});
      }

      // Always set textAnswers if we have FLN answers, even if apiAnswers is empty
      // Merge per questionId so API data for one class (std) doesn't wipe the other's prefill
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

        // Also save to classWiseTextAnswers (if class is selected)
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
      // Note: We don't clear textAnswers here to preserve user-entered FLN answers
      // when switching between question types or dropdowns
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

    // Save to classWiseTextAnswers
    if (selectedSubdomain) {
      const subdomainId = selectedSubdomain.subDomainId || selectedSubdomain.id;
      setSubdomainTextAnswers((prev) => ({
        ...prev,
        [subdomainId]: newTextAnswers,
      }));
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
      // Match school: no per-answer domain/question refetch (was driving SP_GetDomain + evidence summary + SP_GetQuestion).
      // Progress refreshes on subdomain save / assessment submit.
      enqueueSnackbar("Answer submitted successfully!", {
        variant: "success",
      });
    },
    onError: (error) => {
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
      onSuccess: (data) => {
        // Save current answers to subdomainAnswers before clearing
        if (selectedSubdomain) {
          const subdomainId =
            selectedSubdomain.subDomainId || selectedSubdomain.id;
          setSubdomainAnswers((prev) => ({
            ...prev,
            [subdomainId]: { ...answers },
          }));
        }
        // Create session after first successful save (same flow as self-assessment)
        if (sessionId === null || sessionId === undefined) {
          const sessionPayload = {
            sessionId: null,
            assessmentId: selectedAssessment?.assessmentId ?? null,
            userId: Number(userId),
            roleId: Number(roleId),
            schoolId: schoolId || undefined,
            isSubmitted: 0,
          };
          submitAssessmentMutation.mutate(sessionPayload);
        } else {
          refetchQuestions();
          refetchDomains();
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
      if (variables.isSubmitted === 0) {
        refetchDomains();
        refetchQuestions();
      } else {
        setShowSubmitConfirmation(false);

        refetchDomains();

        if (selectedSubdomain) {
          refetchQuestions();
        }

        queryClient.invalidateQueries({
          queryKey: ["verifier"],
        });

        queryClient.invalidateQueries({
          queryKey: queryKeys.verifier.domains(roleId, languageCode, schoolId),
        });

        queryClient.invalidateQueries({
          queryKey: queryKeys.verifier.schoolData(schoolId || userName),
        });

        queryClient.invalidateQueries({
          queryKey: queryKeys.verifier.schoolSections(schoolId || userName),
        });

        enqueueSnackbar("Assessment submitted successfully!", {
          variant: "success",
        });
      }
    },
    onError: (error) => {
      console.error("Error submitting assessment:", error);
      // Close the confirmation modal
      setShowSubmitConfirmation(false);
      enqueueSnackbar(
        error?.response?.data?.message ||
          "Failed to submit assessment. Please try again.",
        {
          variant: "error",
        },
      );
    },
  });

  // Handler to open confirmation modal for final submit
  const handleOpenSubmitConfirmation = () => {
    if (!userId) {
      enqueueSnackbar("User ID is missing. Please login again.", {
        variant: "error",
      });
      return;
    }
    setShowSubmitConfirmation(true);
  };

  // Handler to confirm final submit
  const handleConfirmSubmit = () => {
    if (!userId) {
      enqueueSnackbar("User ID is missing. Please login again.", {
        variant: "error",
      });
      return;
    }

    if (submitAssessmentMutation.isPending) {
      return;
    }

    const payload = {
      sessionId: sessionId || null,
      assessmentId: selectedAssessment?.assessmentId ?? null,
      userId: Number(userId),
      roleId: Number(roleId),
      schoolId: schoolId || undefined,
      isSubmitted: 1,
    };
    submitAssessmentMutation.mutate(payload);
  };

  // Check if all domains are complete
  const allDomainsComplete = useMemo(() => {
    if (!domains || domains.length === 0) return false;
    return domains.every((domain) => {
      const progress = getDomainProgress(domain);
      return Math.round(progress) === 100;
    });
  }, [domains]);

  const mandatoryEvidenceProgress = zeroMandatoryEvidenceProgress();
  const allMandatoryEvidenceComplete = true;
  const allAssessmentsMandatoryEvidenceProgress = zeroMandatoryEvidenceProgress();
  const allAssessmentsMandatoryEvidenceComplete = true;
  const allAssessmentsSubmitted = isSubmitted;
  const allAssessmentsAnswersComplete = allDomainsComplete;
  const allAssessmentsComplete = allDomainsComplete;
  const canSubmitAssessment = allDomainsComplete && !isSubmitted;
  const isSubmittingAllAssessments = false;
  const incompleteAssessments = [];
  const isAssessmentDataLoading = isLoadingDomains;
  const isAssessmentDataRefreshing = isFetchingDomains && !isLoadingDomains;

  // Handle submit - Submit all answers for the current subdomain
  const handleSubmit = () => {
    if (
      submitSubdomainWiseAnswersMutation.isPending ||
      submitAssessmentMutation.isPending
    ) {
      return;
    }

    const questionTypeByTabId = {
      general: 1,
      classroom: 2,
      subject: 3,
      fln: 4,
    };
    const payloadQuestionType = currentTab?.id
      ? questionTypeByTabId[currentTab.id] || null
      : null;

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
    // For classroom observation questions, validate class and section
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

    // For subject observation questions, validate class, section, and subject
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

    // Determine class and section values based on current tab type
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
    // For General questions or FLN questions, clsValue and sectionValue remain null

    // Format answers array from current tab questions only
    const answersArray = [];
    const questionsToProcess =
      currentTab?.questions?.length > 0 ? currentTab.questions : allQuestions;

    questionsToProcess.forEach((question) => {
      const questionType =
        question.questionType ||
        (question.isClassroomObservation === 1 ? 2 : 1);

      if (
        payloadQuestionType != null &&
        Number(questionType) !== Number(payloadQuestionType)
      ) {
        return;
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
    });

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

    const subDomainId = selectedSubdomain.subDomainId || selectedSubdomain.id;

    const payload = {
      isAns: 1,
      questionType: payloadQuestionType,
      userId: Number(userId),
      schoolId: schoolId || undefined,
      cls: clsValue,
      section: sectionValue,
      subjectId: selectedSubject ? Number(selectedSubject) : null,
      answers: answersArray,
    };

    submitSubdomainWiseAnswersMutation.mutate(payload);
  };

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
      const progress =
        assessmentDomains.length > 0
          ? assessmentDomains.reduce(
              (sum, domain) => sum + getDomainProgress(domain),
              0,
            ) / assessmentDomains.length
          : 0;
      const roundedProgress = Math.round(progress);

      return {
        name: `${index + 1}. ${
          assessment.assessmentName ||
          t("selfAssessment.assessmentNameFallback", {
            id: assessment.assessmentId,
          })
        }`,
        progress: roundedProgress,
        assessmentId: assessment.assessmentId,
        color: getProgressColor(progress),
      };
    });
  }, [assessments, currentLanguage]);

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

  // Define question type tabs — only show types that have questions to answer
  const questionTabs = useMemo(() => {
    const tabs = [];

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

    if (classroomObservationQuestions.length > 0) {
      tabs.push({
        id: "classroom",
        label: t("selfAssessment.tabs.classroomObservation"),
        icon: <Class sx={{ fontSize: 20 }} />,
        color: colors.primary.blue,
        questions: classroomObservationQuestions,
        questionsForCount: classroomObservationQuestionsForCount,
        totalCount: classroomObservationQuestionsTotalCount,
      });
    }

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
  ]);

  // Reset tab to first when questions change
  useEffect(() => {
    if (questionTabs.length > 0 && selectedQuestionTab >= questionTabs.length) {
      setSelectedQuestionTab(0);
    }
  }, [questionTabs.length, selectedQuestionTab]);

  // Get current tab
  const currentTab = questionTabs[selectedQuestionTab] || null;

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

  const currentQuestionEntry = flattenedQuestions[currentQuestionIndex] || null;
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
      return { domain: selectedDomain, subdomain: subdomains[subIdx + 1] };
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
      enqueueSnackbar("You have reached the last subdomain.", { variant: "info" });
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

  const totalAnswered = assessmentProgress.totalAnswer;
  const totalQuestions = assessmentProgress.totalQuestions;

  // Reset selected class group if it becomes unavailable (no flag)
  useEffect(() => {
    if (selectedClassGroup && selectedSubdomain && currentTab) {
      let questionType = null;
      if (currentTab.id === "classroom") {
        questionType = 2;
      } else if (currentTab.id === "subject") {
        questionType = 3;
      }

      if (questionType) {
        const flag = getGroupFlagColor(questionType, selectedClassGroup);
        if (flag === null || flag === undefined) {
          // Reset if the selected group no longer has a flag
          setSelectedClassGroup(null);
          setSelectedClass(null);
          setSelectedSection(null);
          setSelectedSubject(null);
          setAnswers({});
          setTextAnswers({});
        }
      }
    }
  }, [selectedClassGroup, selectedSubdomain, currentTab]);

  // Check if all questions of the current tab type are answered
  const areAllQuestionsAnsweredForCurrentTab = useMemo(() => {
    if (
      !currentTab ||
      !currentTab.questionsForCount ||
      currentTab.questionsForCount.length === 0
    ) {
      return false;
    }

    const questionsForCount = currentTab.questionsForCount;

    // For FLN questions (type 4), check if all have valid JSON answers
    if (currentTab.id === "fln") {
      return questionsForCount.every((q) => {
        const textAnswer = textAnswers[q.questionId];
        if (!textAnswer) return false;
        try {
          const flnData = JSON.parse(textAnswer);
          // Check if at least one class (2 or 3) has an answer
          return Object.keys(flnData).some(
            (key) => flnData[key] && flnData[key].obtainedMarks,
          );
        } catch (e) {
          return false;
        }
      });
    }

    // For other question types, check if all questions have answers
    return questionsForCount.every((q) => {
      // Check if question has an answer (either from user or API)
      const userAnswer = answers[q.questionId];
      const userTextAnswer = textAnswers[q.questionId];

      // Find the question in allQuestions to check API answer
      const questionInAll = allQuestions.find(
        (aq) => aq.questionId === q.questionId,
      );

      // For questions that need class/section/subject, check if API answer should be shown
      const apiAnswer =
        questionInAll &&
        shouldShowApiAnswer(questionInAll) &&
        questionInAll.selectedOptionId
          ? String(questionInAll.selectedOptionId)
          : null;

      return userAnswer || userTextAnswer || apiAnswer;
    });
  }, [
    currentTab,
    answers,
    textAnswers,
    allQuestions,
    selectedClass,
    selectedSection,
    selectedSubject,
  ]);

  return {
    t,
    i18n,
    theme,
    matchDownMD,
    navigate,
    location,
    user,
    userId,
    userName,
    queryClient,
    drawerOpen,
    setDrawerOpen,
    handleDrawerToggle,
    handleLogout,
    logoutMutation,
    currentLanguage,
    setCurrentLanguage,
    handleLanguageChange,
    selectedDomain,
    setSelectedDomain,
    selectedSubdomain,
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
    showSubmitPreview: false,
    submitPreviewData: null,
    isLoadingSubmitPreview: false,
    submitPreviewError: null,
    submitPreviewAnswerCount: 0,
    handleCloseSubmitPreview: () => {},
    handleConfirmSubmitPreview: () => {},
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
    selectedAssessmentId,
    setSelectedAssessmentId,
    chartDrilldownAssessmentId,
    setChartDrilldownAssessmentId,
    schoolFromState,
    schoolId,
    languageCodeMap,
    languageCode,
    roleId,
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
    assessmentProgress,
    endDate,
    isSubmitted,
    isEndDatePassed,
    isReadOnly,
    mandatoryEvidenceProgress,
    allMandatoryEvidenceComplete,
    allAssessmentsMandatoryEvidenceProgress,
    allAssessmentsMandatoryEvidenceComplete,
    allAssessmentsSubmitted,
    allAssessmentsAnswersComplete,
    allAssessmentsComplete,
    incompleteAssessments,
    canSubmitAssessment,
    isSubmittingAllAssessments,
    handleSubdomainEvidenceProgressChange,
    totalAnswered,
    totalQuestions,
    sessionId,
    mapGroupRangeToApiFormat,
    getGroupFlagColor,
    getFlagColorValue,
    getTotalQuestionsFromGroupWise,
    getTotalQuestionsCount,
    allQuestionsForCount,
    allQuestions,
    generalQuestionsTotalCount,
    classroomObservationQuestionsTotalCount,
    subjectObservationQuestionsTotalCount,
    flnQuestionsTotalCount,
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
    getDomainName,
    getSubdomainName,
    getQuestionText,
    getOptionText,
    getSubdomainProgress,
    getDomainProgress,
    shouldShowApiAnswer,
    getDomainIcon,
    getProgressColor,
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
    handleSubmit,
    handleSubmitQuestion: handleSubmit,
    domainChartData,
    assessmentChartData,
    currentChartData,
    domainNumber,
    subdomainNumber,
    questionTabs,
    currentTab,
    areAllQuestionsAnsweredForCurrentTab,
  };
}
