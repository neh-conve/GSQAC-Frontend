import React, { useState, useCallback } from "react";
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
  FormControl,
  AppBar,
  Toolbar,
  IconButton,
  useMediaQuery,
  Divider,
  LinearProgress,
  Select,
  MenuItem,
  InputLabel,
  ToggleButtonGroup,
  ToggleButton,
  TextField,
  Tabs,
  Tab,
  Stack,
} from "@mui/material";
import {
  CheckCircle,
  ArrowForward,
  ArrowBack,
  Menu,
  Assessment,
  Class,
  Assignment,
  ExpandMore,
  ExpandLess,
  ChevronLeft,
  ChevronRight,
  Logout as LogoutIcon,
  WorkspacePremium,
  MenuBook,
  Groups,
  Business,
  School as SchoolIcon,
  Language,
  Create,
  LocationOn,
  AccountTree,
} from "@mui/icons-material";
import { colors } from "../../../../constants/colors";
import AppDrawer from "../../../../components/AppDrawer/AppDrawer";
import { DRAWER_WIDTH } from "../../../../constants/menuItems";
import { SubmitPreviewModal } from "./SubmitPreviewModal";
import { AssessmentNavProgressBar } from "../../../../components/AssessmentNavProgressBar/AssessmentNavProgressBar";
import { AssessmentChipSelector } from "../../../../components/AssessmentChipSelector/AssessmentChipSelector";
import { AssessmentPeriodChips } from "../../../../components/AssessmentPeriodChips/AssessmentPeriodChips";
import { ENV_ACADEMIC_YEAR } from "../../../../utils/assessmentMeta";
import {
  getSubdomainEvidenceProgress,
  getDomainMandatoryEvidenceProgress,
} from "../../../../services/evidenceService";
import { ErrorBoundary } from "../../../../components/ErrorBoundary/ErrorBoundary";
import { SubdomainQuestionFlow } from "./SubdomainQuestionFlow";
import { AssessmentProgressOverview } from "./AssessmentProgressOverview";
import "../SelfAssessment.css";

function EvidenceCountChip({ progress, t, compact = false }) {
  if (!progress?.total) return null;

  const isComplete = progress.remaining <= 0 || progress.percentage >= 100;

  return (
    <Chip
      size="small"
      label={
        isComplete
          ? t("selfAssessment.evidence.countComplete", {
              uploaded: progress.uploaded,
              total: progress.total,
              defaultValue: `Evidence ${progress.uploaded}/${progress.total}`,
            })
          : t("selfAssessment.evidence.countRemaining", {
              uploaded: progress.uploaded,
              total: progress.total,
              remaining: progress.remaining,
              defaultValue: `Evidence ${progress.uploaded}/${progress.total} · ${progress.remaining} left`,
            })
      }
      sx={{
        height: compact ? 20 : 22,
        maxWidth: compact ? 150 : 180,
        fontSize: compact ? "0.6rem" : "0.625rem",
        fontWeight: 800,
        flexShrink: 0,
        bgcolor: isComplete
          ? `${colors.accent.green}18`
          : `${colors.semantic.warning}18`,
        color: isComplete ? colors.accent.green : colors.semantic.warning,
        border: `1px solid ${
          isComplete
            ? `${colors.accent.green}40`
            : `${colors.semantic.warning}40`
        }`,
        "& .MuiChip-label": {
          px: 0.75,
          overflow: "hidden",
          textOverflow: "ellipsis",
        },
      }}
    />
  );
}

function SelfAssessmentLoadingPanel({
  message,
  subtitle,
  accentColor,
  compact = false,
}) {
  return (
    <Box
      className="sa-loading-panel"
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        py: compact ? 4 : 6,
        px: 3,
        gap: 2,
        minHeight: compact ? 160 : 220,
      }}
    >
      <CircularProgress size={compact ? 32 : 40} sx={{ color: accentColor }} />
      <Typography
        variant="body1"
        sx={{
          fontWeight: 600,
          color: colors.text.primary,
          textAlign: "center",
          fontSize: compact ? "0.875rem" : "1rem",
        }}
      >
        {message}
      </Typography>
      {subtitle && (
        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ textAlign: "center", maxWidth: 320, lineHeight: 1.5 }}
        >
          {subtitle}
        </Typography>
      )}
    </Box>
  );
}

function EvidenceCountProgress({
  uploaded,
  total,
  remaining,
  percentage,
  getProgressColor,
  t,
  mobile = false,
  scope = "subdomain",
}) {
  if (!total) return null;

  const isComplete = remaining <= 0 || percentage >= 100;
  const progressColor = isComplete
    ? colors.accent.green
    : getProgressColor(percentage);

  return (
    <Box
      className={`sa-evidence-count-progress sa-evidence-count-progress--${scope}`}
      sx={{
        mt: mobile ? 1.25 : 0.75,
        width: "100%",
        pt: mobile ? 1 : 0.75,
        borderTop: `1px dashed ${colors.neutral.gray200}`,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1,
          mb: 0.6,
        }}
      >
        <Typography
          variant="caption"
          sx={{
            fontSize: mobile ? "0.75rem" : "0.6875rem",
            color: colors.text.secondary,
            fontWeight: 700,
            lineHeight: 1.3,
          }}
        >
          {scope === "domain"
            ? t("selfAssessment.evidence.domainProgressLabel", {
                uploaded,
                total,
              })
            : t("selfAssessment.evidence.progressLabel", {
                uploaded,
                total,
              })}
        </Typography>
        <Chip
          size="small"
          label={
            isComplete
              ? t("selfAssessment.evidence.complete")
              : t("selfAssessment.evidence.remaining", { count: remaining })
          }
          sx={{
            height: mobile ? 22 : 20,
            fontSize: mobile ? "0.6875rem" : "0.625rem",
            fontWeight: 800,
            bgcolor: isComplete
              ? `${colors.accent.green}18`
              : `${colors.semantic.warning}18`,
            color: isComplete
              ? colors.accent.green
              : colors.semantic.warning,
            border: `1px solid ${
              isComplete
                ? `${colors.accent.green}40`
                : `${colors.semantic.warning}40`
            }`,
            "& .MuiChip-label": { px: 0.9 },
          }}
        />
      </Box>
      <LinearProgress
        variant="determinate"
        value={Math.min(100, Math.max(0, percentage))}
        sx={{
          height: mobile ? 7 : 5,
          borderRadius: 99,
          bgcolor: colors.neutral.gray200,
          "& .MuiLinearProgress-bar": {
            borderRadius: 99,
            bgcolor: progressColor,
          },
        }}
      />
    </Box>
  );
}

function SubdomainEvidenceProgressBar({
  subdomain,
  getProgressColor,
  t,
  mobile = false,
}) {
  const evidenceProgress = getSubdomainEvidenceProgress(subdomain);
  if (!evidenceProgress.total) return null;

  return (
    <EvidenceCountProgress
      uploaded={evidenceProgress.uploaded}
      total={evidenceProgress.total}
      remaining={evidenceProgress.remaining}
      percentage={evidenceProgress.percentage}
      getProgressColor={getProgressColor}
      t={t}
      mobile={mobile}
      scope="subdomain"
    />
  );
}

function DomainEvidenceProgressBar({
  domain,
  getProgressColor,
  t,
  mobile = false,
}) {
  const evidenceProgress = getDomainMandatoryEvidenceProgress(domain);
  if (!evidenceProgress.total) return null;

  return (
    <EvidenceCountProgress
      uploaded={evidenceProgress.uploaded}
      total={evidenceProgress.total}
      remaining={evidenceProgress.remaining}
      percentage={evidenceProgress.percentage}
      getProgressColor={getProgressColor}
      t={t}
      mobile={mobile}
      scope="domain"
    />
  );
}

export function SelfAssessmentLayout({ c }) {
  const {
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
    showSubmitPreview,
    submitPreviewData,
    isLoadingSubmitPreview,
    submitPreviewError,
    submitPreviewAnswerCount,
    handleCloseSubmitPreview,
    handleConfirmSubmitPreview,
    selectedQuestionTab,
    setSelectedQuestionTab,
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
    flattenedQuestions,
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
    mandatoryEvidenceProgress,
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
    layoutMode,
    pageTitle,
    pageSubtitle,
    onNavigateBack,
    renderPageHeaderExtra,
    renderDomainsPanelExtra,
  } = c;

  const isVerifierLayout = layoutMode === "verifier";
  const hideAppChrome = isVerifierLayout;
  const verifierPanelHeight = "calc(100vh - 132px)";

  const [isLeftPanelCollapsed, setIsLeftPanelCollapsed] = useState(false);
  const [mobileStep, setMobileStep] = useState(0);
  const leftPanelWidth = isVerifierLayout ? 400 : 300;
  const at = assessmentTheme;

  const scrollMobileToTop = useCallback(() => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const handleMobileDomainSelect = (domain) => {
    const isSame = selectedDomain?.domainId === domain.domainId;
    if (isSame) {
      setMobileStep(1);
      scrollMobileToTop();
      return;
    }
    handleDomainSelect(domain);
    if (matchDownMD) {
      setMobileStep(1);
      scrollMobileToTop();
    }
  };

  const handleMobileSubdomainSelect = (subdomain) => {
    handleSubdomainSelect(subdomain);
    if (matchDownMD) {
      setMobileStep(2);
      scrollMobileToTop();
    }
  };

  const handleMobileStepBack = () => {
    if (mobileStep === 2) {
      setSelectedSubdomain(null);
      setAnswers({});
      setTextAnswers({});
      setMobileStep(1);
      scrollMobileToTop();
      return;
    }
    if (mobileStep === 1) {
      setMobileStep(0);
      setSelectedDomain(null);
      setSelectedSubdomain(null);
      scrollMobileToTop();
    }
  };

  const isTablet = useMediaQuery(theme.breakpoints.between("sm", "md"));

  const showMobileOverallProgress =
    matchDownMD && (mobileStep < 2 || (mobileStep === 2 && isTablet));
  const showMobileSubdomainsPanel =
    matchDownMD && mobileStep === 1 && !!selectedDomain;
  const showMobileQuestionsPanel =
    selectedSubdomain && (!matchDownMD || mobileStep === 2);
  const showMobileNavPanel =
    matchDownMD && (mobileStep === 0 || mobileStep === 1);

  const renderOverallProgress = (compact = false, variant = "default") => {
    if (assessmentProgress.totalQuestions <= 0) return null;

    const isInline = variant === "inline";
    const progressColor = getProgressColor(assessmentProgress.answerPercentage);
    const ringSize = isInline ? 44 : compact ? 48 : 56;
    const stroke = isInline ? 5 : 5;
    const radius = (ringSize - stroke) / 2;
    const circumference = 2 * Math.PI * radius;
    const ringOffset =
      circumference -
      (assessmentProgress.answerPercentage / 100) * circumference;

    return (
      <Box
        className={`sa-overall-progress${
          isInline ? " sa-overall-progress--inline" : ""
        }`}
        sx={{
          p: isInline
            ? { xs: 1, sm: 1.25 }
            : compact
              ? { xs: 1.25, md: 1.5 }
              : { xs: 2, md: 2 },
          borderRadius: 2.5,
          background: isInline ? "#fff" : at.panelGradient,
          border: `1px solid ${at.primary}${isInline ? "22" : "28"}`,
          boxShadow: isInline
            ? "none"
            : compact
              ? `0 4px 16px ${at.primary}10`
              : `0 8px 24px ${at.primary}12`,
          minWidth: isInline
            ? 0
            : compact
              ? { xs: "100%", md: 220 }
              : undefined,
          maxWidth: isInline ? "none" : compact ? { md: 260 } : undefined,
          flex: isInline ? "1 1 0" : compact ? { md: "0 0 240px" } : undefined,
          width: isInline ? "100%" : undefined,
        }}
      >
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: isInline ? 1.25 : 1.75,
          }}
        >
          <Box
            sx={{
              position: "relative",
              width: ringSize,
              height: ringSize,
              flexShrink: 0,
            }}
          >
            <svg
              width={ringSize}
              height={ringSize}
              style={{ transform: "rotate(-90deg)" }}
            >
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke={`${at.primary}20`}
                strokeWidth={stroke}
              />
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke={at.primary}
                strokeWidth={stroke}
                strokeDasharray={circumference}
                strokeDashoffset={ringOffset}
                strokeLinecap="round"
              />
            </svg>
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Typography
                sx={{
                  fontWeight: 800,
                  fontSize: isInline ? "0.6875rem" : "0.8125rem",
                  color: at.primary,
                  lineHeight: 1,
                }}
              >
                {assessmentProgress.displayPercentage}%
              </Typography>
            </Box>
          </Box>

          <Box sx={{ flex: 1, minWidth: 0 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 1,
                mb: isInline ? 0.5 : 0.75,
              }}
            >
              <Typography
                variant={isInline || compact ? "caption" : "subtitle2"}
                sx={{
                  fontWeight: 800,
                  color: colors.text.primary,
                  fontSize: isInline
                    ? "0.6875rem"
                    : compact
                      ? "0.8125rem"
                      : "0.9375rem",
                  lineHeight: 1.3,
                  whiteSpace: isInline ? "nowrap" : undefined,
                  overflow: isInline ? "hidden" : undefined,
                  textOverflow: isInline ? "ellipsis" : undefined,
                }}
              >
                {t("selfAssessment.overallProgress")}
              </Typography>
              <Typography
                variant="caption"
                sx={{
                  fontWeight: 700,
                  color: progressColor,
                  flexShrink: 0,
                  fontSize: isInline ? "0.625rem" : "0.6875rem",
                }}
              >
                {assessmentProgress.totalAnswer}/{assessmentProgress.totalQuestions}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={assessmentProgress.answerPercentage}
              sx={{
                height: isInline ? 6 : compact ? 8 : 9,
                borderRadius: 99,
                bgcolor: `${at.primary}14`,
                "& .MuiLinearProgress-bar": {
                  borderRadius: 99,
                  bgcolor: progressColor,
                },
              }}
            />
            {!isInline ? (
              <Typography
                variant="caption"
                sx={{
                  display: "block",
                  mt: 0.75,
                  color: colors.text.secondary,
                  fontWeight: 500,
                  fontSize: compact ? "0.6875rem" : "0.75rem",
                }}
              >
                {t("selfAssessment.questionsAnswered", {
                  answered: assessmentProgress.totalAnswer,
                  total: assessmentProgress.totalQuestions,
                })}
              </Typography>
            ) : null}
          </Box>
        </Box>
      </Box>
    );
  };

  const handleProgressOverviewItemClick = useCallback(
    (data) => {
      if (assessments.length > 1 && !chartDrilldownAssessmentId) {
        const assessment = assessments.find(
          (a) => a.assessmentId === data.assessmentId,
        );
        if (assessment) {
          handleAssessmentSelect(assessment);
          setChartDrilldownAssessmentId(assessment.assessmentId);
        }
        return;
      }

      const sourceDomains = chartDrilldownAssessmentId
        ? assessments.find((a) => a.assessmentId === chartDrilldownAssessmentId)
            ?.domains || []
        : domains;

      const domain = sourceDomains.find((d) => d.domainId === data.domainId);
      if (domain) {
        handleDomainSelect(domain);
      }
    },
    [
      assessments,
      chartDrilldownAssessmentId,
      domains,
      handleAssessmentSelect,
      handleDomainSelect,
      setChartDrilldownAssessmentId,
    ],
  );

  const progressOverviewTitle =
    assessments.length > 1 && !chartDrilldownAssessmentId
      ? t("selfAssessment.progressOverview.titleAssessments")
      : t("selfAssessment.progressOverview.titleDomains");

  const progressOverviewSubtitle =
    assessments.length > 1 && !chartDrilldownAssessmentId
      ? t("selfAssessment.progressOverview.subtitleAssessments")
      : t("selfAssessment.progressOverview.subtitleDomains");

  return (
    <Box
      sx={{
        display: "flex",
        minHeight: hideAppChrome ? 0 : "100vh",
        width: "100%",
      }}
    >
      {!hideAppChrome ? (
        <AppDrawer open={drawerOpen} handleDrawerToggle={handleDrawerToggle} />
      ) : null}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: "100%",
          minHeight: 0,
          height: hideAppChrome ? "auto" : "100vh",
          maxHeight: hideAppChrome ? "none" : "100dvh",
          display: "flex",
          flexDirection: "column",
          overflow: hideAppChrome ? "visible" : "hidden",
          marginLeft: !hideAppChrome && drawerOpen && !matchDownMD ? 4 : 0,
          [`@media (min-width:${theme.breakpoints.values.xl}px)`]: {
            marginLeft: drawerOpen && !matchDownMD ? 4 : 0,
          },
          transition: theme.transitions.create(["margin-left"], {
            easing: theme.transitions.easing.sharp,
            duration: theme.transitions.duration.enteringScreen,
          }),
        }}
      >
        {!hideAppChrome ? (
        <AppBar
          position="fixed"
          sx={{
            background: "rgba(255, 255, 255, 0.85)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            zIndex: theme.zIndex.drawer + 1,
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            borderBottom: "1px solid rgba(0,0,0,0.06)",
            width:
              drawerOpen && !matchDownMD
                ? `calc(100% - ${DRAWER_WIDTH.xs}px)`
                : "100%",
            [`@media (min-width:${theme.breakpoints.values.xl}px)`]: {
              width:
                drawerOpen && !matchDownMD
                  ? `calc(100% - ${DRAWER_WIDTH.xl}px)`
                  : "100%",
            },
            transition: theme.transitions.create(["width", "margin"], {
              easing: theme.transitions.easing.sharp,
              duration: theme.transitions.duration.enteringScreen,
            }),
          }}
        >
          <Toolbar
            className="sa-app-toolbar"
            sx={{
              height: { xs: 56, sm: 64, md: 72 },
              minHeight: {
                xs: "56px !important",
                sm: "64px !important",
                md: "72px !important",
              },
              px: { xs: 1.25, sm: 2, md: 4 },
              display: "flex",
              alignItems: "center",
              gap: { xs: 1, md: 2 },
            }}
          >
            {isVerifierLayout && onNavigateBack ? (
              <IconButton
                onClick={onNavigateBack}
                edge="start"
                aria-label="Back to allocated schools"
                sx={{
                  color: "#64748b",
                  borderRadius: "12px",
                  width: { xs: 40, md: 44 },
                  height: { xs: 40, md: 44 },
                  flexShrink: 0,
                  backgroundColor: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(0,0,0,0.05)",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                  "&:hover": {
                    backgroundColor: "#ffffff",
                    color: at.primary,
                    transform: "scale(1.05)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    borderColor: `${at.primary}33`,
                  },
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <ArrowBack sx={{ fontSize: { xs: 22, md: 24 } }} />
              </IconButton>
            ) : (
              <IconButton
                onClick={handleDrawerToggle}
                edge="start"
                sx={{
                  color: "#64748b",
                  borderRadius: "12px",
                  width: { xs: 40, md: 44 },
                  height: { xs: 40, md: 44 },
                  flexShrink: 0,
                  backgroundColor: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(0,0,0,0.05)",
                  boxShadow: "0 2px 6px rgba(0,0,0,0.06)",
                  "&:hover": {
                    backgroundColor: "#ffffff",
                    color: at.primary,
                    transform: "scale(1.05)",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                    borderColor: `${at.primary}33`,
                  },
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                <Menu sx={{ fontSize: { xs: 22, md: 24 } }} />
              </IconButton>
            )}
            <Box
              sx={{
                flex: 1,
                minWidth: 0,
                display: "flex",
                alignItems: "center",
                gap: { xs: 1.25, md: 2.5 },
              }}
            >
              <Box
                sx={{
                  width: { xs: 36, sm: 40, md: 48 },
                  height: { xs: 36, sm: 40, md: 48 },
                  borderRadius: { xs: "10px", md: "14px" },
                  background: at.gradient || at.panelGradient,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: `0 4px 16px ${at.primary}47`,
                  flexShrink: 0,
                }}
              >
                <Assessment
                  sx={{
                    color: "white",
                    fontSize: {
                      xs: "1.125rem",
                      sm: "1.375rem",
                      md: "1.625rem",
                    },
                  }}
                />
              </Box>
              <Box sx={{ minWidth: 0 }}>
                <Typography
                  variant="h6"
                  component="div"
                  noWrap
                  sx={{
                    fontSize: { xs: "0.9375rem", sm: "1rem", md: "1.125rem" },
                    fontWeight: 700,
                    color: "#0f172a",
                    letterSpacing: "-0.02em",
                    lineHeight: 1.2,
                    background: `linear-gradient(135deg, ${at.primary} 0%, ${at.dark} 100%)`,
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  {pageTitle || t("selfAssessment.title")}
                </Typography>
                <Typography
                  variant="caption"
                  noWrap
                  sx={{
                    display: { xs: "none", sm: "block" },
                    fontSize: "0.6875rem",
                    color: "#64748b",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    lineHeight: 1.4,
                    mt: 0.25,
                  }}
                >
                  {pageSubtitle || t("selfAssessment.appBarSubtitle")}
                </Typography>
              </Box>
            </Box>
            {matchDownMD ? (
              <IconButton
                onClick={handleLogout}
                aria-label="Logout"
                sx={{
                  flexShrink: 0,
                  color: "#64748b",
                  borderRadius: "12px",
                  width: 40,
                  height: 40,
                  border: "1px solid rgba(0,0,0,0.06)",
                  bgcolor: "rgba(255,255,255,0.9)",
                  "&:hover": {
                    bgcolor: "#fef2f2",
                    color: "#dc2626",
                    borderColor: "#fecaca",
                  },
                }}
              >
                <LogoutIcon sx={{ fontSize: 20 }} />
              </IconButton>
            ) : (
              <Button
                onClick={handleLogout}
                sx={{
                  flexShrink: 0,
                  color: "#475569",
                  textTransform: "none",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  borderRadius: "12px",
                  px: 3,
                  py: 1.25,
                  backgroundColor: "rgba(255,255,255,0.9)",
                  border: "1px solid rgba(0,0,0,0.06)",
                  boxShadow: "0 2px 4px rgba(0,0,0,0.04)",
                  "&:hover": {
                    backgroundColor: "#fef2f2",
                    color: "#dc2626",
                    borderColor: "#fecaca",
                    boxShadow: "0 4px 8px rgba(220, 38, 38, 0.15)",
                    transform: "translateY(-1px)",
                  },
                  transition: "all 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
                }}
              >
                Logout
              </Button>
            )}
          </Toolbar>
        </AppBar>
        ) : null}

        <Box
          sx={{
            mt: hideAppChrome ? 0 : 8,
            flex: 1,
            minHeight: hideAppChrome ? verifierPanelHeight : 0,
            display: "flex",
            flexDirection: "column",
            overflow: hideAppChrome ? "visible" : "hidden",
          }}
          className={`self-assessment-page-content${hideAppChrome ? "" : " app-page-below-header"} sa-theme-${at.kind}`}
        >
          {isAssessmentDataRefreshing && (
            <LinearProgress
              className="sa-data-refresh-bar"
              sx={{
                position: "sticky",
                top: 0,
                zIndex: 2,
                height: 3,
                bgcolor: `${at.primary}12`,
                "& .MuiLinearProgress-bar": { bgcolor: at.primary },
              }}
            />
          )}
          {typeof renderPageHeaderExtra === "function"
            ? renderPageHeaderExtra()
            : null}

          <Box
            sx={{
              pl:
                hideAppChrome || (drawerOpen && !matchDownMD)
                  ? 0
                  : { xs: 1.5, sm: 2, md: 3 },
              pr: hideAppChrome ? 0 : { xs: 1.5, sm: 2, md: 3 },
              py: {
                xs: mobileStep === 2 ? 1 : hideAppChrome ? 0.75 : 2,
                md: hideAppChrome ? 1 : 3,
              },
              flex: 1,
              minHeight: 0,
              display: "flex",
              flexDirection: "column",
              overflow: {
                xs:
                  showMobileNavPanel || mobileStep === 2 ? "hidden" : "auto",
                md: "hidden",
              },
              WebkitOverflowScrolling: "touch",
            }}
          >
            {/* Header */}
            {!isVerifierLayout ? (
            <Box
              sx={{
                display: { xs: "none", md: "flex" },
                flexDirection: { sm: "row" },
                alignItems: { sm: "center" },
                justifyContent: "space-between",
                mb: 3,
                gap: 2,
              }}
            >
              <Box sx={{ flex: 1 }}>
                <Box
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    flexWrap: "wrap",
                  }}
                >
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>
                    {t("selfAssessment.title")}
                  </Typography>
                  <Chip
                    size="small"
                    label={at.label}
                    sx={{
                      height: 26,
                      fontWeight: 800,
                      fontSize: "0.6875rem",
                      letterSpacing: 0.3,
                      textTransform: "uppercase",
                      bgcolor: `${at.primary}12`,
                      color: at.primary,
                      border: `1px solid ${at.primary}30`,
                    }}
                  />
                  <AssessmentPeriodChips
                    academicYear={ENV_ACADEMIC_YEAR}
                    showRound={false}
                  />
                  {/* Status Message */}
                  {!isSubmitted && endDate && (
                    <Typography
                      variant="body2"
                      sx={{
                        color: isReadOnly
                          ? colors.semantic.error
                          : colors.semantic.warning,
                        fontWeight: 600,
                        fontSize: "0.875rem",
                      }}
                    >
                      {isReadOnly
                        ? t("selfAssessment.submissionClosedOn", {
                            date: endDate,
                          })
                        : t("selfAssessment.submitBefore", { date: endDate })}
                    </Typography>
                  )}
                </Box>
                {isSubmitted && (
                  <Typography
                    sx={{
                      mt: 1.25,
                      color: "#dc2626",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      lineHeight: 1.55,
                      maxWidth: 780,
                    }}
                  >
                    {t("selfAssessment.assessmentSubmittedReadonly", {
                      defaultValue:
                        "આપનું મૂલ્યાંકન સફળ રીતે સબમિટ થઈ ગયું છે. હવે આપ આ મૂલ્યાંકનમાં કોઈ ફેરફાર કરી શકશો નહીં. કરેલ મૂલ્યાંકન ને ફરી થી જોવા માટે આપ કોઈ પણ સમયે પુનઃ લૉગિન કરી ને જોઈ શકશો.",
                    })}
                  </Typography>
                )}
                {isErrorDomains && (
                  <Alert
                    severity="warning"
                    sx={{
                      mt: 1,
                      fontSize: "0.75rem",
                      py: 0.5,
                      "& .MuiAlert-message": {
                        fontSize: "0.75rem",
                      },
                    }}
                  >
                    {t("selfAssessment.failedToLoadAssessment")}
                  </Alert>
                )}
              </Box>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                {/* <Language sx={{ color: at.primary, fontSize: 20 }} /> */}
                <ToggleButtonGroup
                  value={currentLanguage}
                  exclusive
                  onChange={(e, newLanguage) => {
                    handleLanguageChange(newLanguage);
                  }}
                  size="small"
                  sx={{
                    "& .MuiToggleButton-root": {
                      px: 2,
                      py: 0.5,
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      borderColor: at.primary + "40",
                      color: colors.text.secondary,
                      "&.Mui-selected": {
                        bgcolor: at.primary,
                        color: "white",
                        "&:hover": {
                          bgcolor: at.dark,
                        },
                      },
                      "&:hover": {
                        bgcolor: at.lightest,
                      },
                    },
                  }}
                >
                  <ToggleButton value="gu">ગુ</ToggleButton>
                  <ToggleButton value="en">EN</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            </Box>
            ) : (
              <Box
                sx={{
                  display: { xs: "none", md: "flex" },
                  alignItems: "center",
                  justifyContent: "flex-end",
                  mb: 1,
                  gap: 1,
                }}
              >
                <ToggleButtonGroup
                  value={currentLanguage}
                  exclusive
                  onChange={(e, newLanguage) => {
                    handleLanguageChange(newLanguage);
                  }}
                  size="small"
                  sx={{
                    "& .MuiToggleButton-root": {
                      px: 2,
                      py: 0.5,
                      fontSize: "0.8125rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      borderColor: at.primary + "40",
                      color: colors.text.secondary,
                      "&.Mui-selected": {
                        bgcolor: at.primary,
                        color: "white",
                        "&:hover": {
                          bgcolor: at.dark,
                        },
                      },
                      "&:hover": {
                        bgcolor: at.lightest,
                      },
                    },
                  }}
                >
                  <ToggleButton value="gu">ગુ</ToggleButton>
                  <ToggleButton value="en">EN</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            )}

            {/* Mobile: language + deadline only (title lives in AppBar) */}
            {matchDownMD && mobileStep < 2 && (
              <Box
                className="sa-mobile-page-toolbar"
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1.5,
                  mb: 1.25,
                  flexWrap: "wrap",
                  flexShrink: 0,
                }}
              >
                {isSubmitted ? (
                  <Typography
                    variant="caption"
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      color: "#dc2626",
                      fontWeight: 700,
                      fontSize: "0.75rem",
                      lineHeight: 1.5,
                    }}
                  >
                    {t("selfAssessment.assessmentSubmittedReadonly", {
                      defaultValue:
                        "આપનું મૂલ્યાંકન સફળ રીતે સબમિટ થઈ ગયું છે. હવે આપ આ મૂલ્યાંકનમાં કોઈ ફેરફાર કરી શકશો નહીં. કરેલ મૂલ્યાંકન ને ફરી થી જોવા માટે આપ કોઈ પણ સમયે પુનઃ લૉગિન કરી ને જોઈ શકશો.",
                    })}
                  </Typography>
                ) : endDate ? (
                  <Typography
                    variant="caption"
                    sx={{
                      flex: 1,
                      minWidth: 0,
                      color: isReadOnly
                        ? colors.semantic.error
                        : colors.semantic.warning,
                      fontWeight: 600,
                      fontSize: "0.75rem",
                      lineHeight: 1.4,
                    }}
                  >
                    {isReadOnly
                      ? t("selfAssessment.submissionClosedOn", {
                          date: endDate,
                        })
                      : t("selfAssessment.submitBefore", { date: endDate })}
                  </Typography>
                ) : (
                  <Box sx={{ flex: 1 }} />
                )}
                <ToggleButtonGroup
                  value={currentLanguage}
                  exclusive
                  onChange={(e, newLanguage) => {
                    handleLanguageChange(newLanguage);
                  }}
                  size="small"
                  sx={{
                    flexShrink: 0,
                    "& .MuiToggleButton-root": {
                      px: 1.25,
                      py: 0.35,
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      textTransform: "uppercase",
                      borderColor: at.primary + "40",
                      color: colors.text.secondary,
                      "&.Mui-selected": {
                        bgcolor: at.primary,
                        color: "white",
                      },
                    },
                  }}
                >
                  <ToggleButton value="gu">ગુ</ToggleButton>
                  <ToggleButton value="en">EN</ToggleButton>
                </ToggleButtonGroup>
              </Box>
            )}

            {matchDownMD && isErrorDomains && (
              <Alert
                severity="warning"
                sx={{ mb: 2, fontSize: "0.75rem", py: 0.5 }}
              >
                {t("selfAssessment.failedToLoadAssessment")}
              </Alert>
            )}

            {showMobileOverallProgress && (
              <Box
                className={`sa-overall-progress-shell${
                  isTablet && mobileStep === 2
                    ? " sa-overall-progress-shell--tablet-questions"
                    : ""
                }`}
                sx={{ mb: { xs: 1.25, md: 2 }, flexShrink: 0 }}
              >
                {renderOverallProgress(true)}
              </Box>
            )}

            {/* Main Content - Split Layout */}
            <Box
              className={
                showMobileNavPanel ? "sa-main-split--mobile-nav-only" : undefined
              }
              sx={{
                display: "flex",
                flexDirection: { xs: "column", md: "row" },
                gap: { xs: showMobileNavPanel ? 0 : 2, md: 0 },
                flex: {
                  xs: showMobileNavPanel ? "1 1 0" : 1,
                  md: 1,
                },
                minHeight: 0,
                minWidth: 0,
                overflow: "hidden",
                alignItems: "stretch",
              }}
            >
              {/* Left panel — collapses horizontally so questions expand */}
              <Box
                className={`sa-left-panel-shell${
                  isLeftPanelCollapsed ? " sa-left-panel-shell--collapsed" : ""
                }${showMobileNavPanel ? " sa-left-panel-shell--mobile-nav" : ""}`}
                sx={{
                  flexShrink: {
                    xs: showMobileNavPanel ? 1 : 0,
                    md: 0,
                  },
                  flex: {
                    xs: showMobileNavPanel ? "1 1 0" : undefined,
                    md: undefined,
                  },
                  minHeight: {
                    xs: showMobileNavPanel ? 0 : 0,
                    md: undefined,
                  },
                  width: {
                    xs: "100%",
                    md: isLeftPanelCollapsed ? 0 : leftPanelWidth,
                  },
                  minWidth: {
                    xs: 0,
                    md: isLeftPanelCollapsed ? 0 : leftPanelWidth,
                  },
                  maxWidth: {
                    xs: "100%",
                    md: isLeftPanelCollapsed ? 0 : leftPanelWidth,
                  },
                  overflow: "hidden",
                  transition:
                    "width 0.28s ease, min-width 0.28s ease, max-width 0.28s ease",
                  display: {
                    xs: showMobileNavPanel ? "flex" : "none",
                    md: "block",
                  },
                  flexDirection: { xs: "column", md: "row" },
                }}
              >
                <Paper
                  className={`sa-domains-panel${
                    showMobileNavPanel ? " sa-domains-panel--mobile-nav" : ""
                  }`}
                  sx={{
                    width: { xs: "100%", md: leftPanelWidth },
                    minWidth: { xs: 0, md: leftPanelWidth },
                    flex: {
                      xs: showMobileNavPanel ? "1 1 0" : "1 1 0",
                      md: "none",
                    },
                    borderRadius: 3,
                    bgcolor: "white",
                    display: "flex",
                    flexDirection: "column",
                    overflow: "hidden",
                    maxHeight: {
                      xs: showMobileNavPanel ? "none" : "100%",
                      md: hideAppChrome ? verifierPanelHeight : "calc(100vh - 200px)",
                    },
                    minHeight: {
                      xs: showMobileNavPanel ? 0 : "auto",
                      md: hideAppChrome ? verifierPanelHeight : "auto",
                    },
                    height: {
                      xs: showMobileNavPanel ? "100%" : "100%",
                      md: "100%",
                    },
                    boxShadow: `0 4px 20px ${at.primary}14`,
                    border: `1px solid ${at.primary}18`,
                  }}
                >
                  <Box
                    className="sa-panel-header"
                    sx={{
                      p: {
                        xs: 2.5,
                        md: isVerifierLayout ? 2.25 : 1.75,
                      },
                      borderBottom: `2px solid ${at.primary}22`,
                      background: at.panelGradient,
                      flexShrink: 0,
                    }}
                  >
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 1,
                      }}
                    >
                      {matchDownMD && showMobileSubdomainsPanel && (
                        <IconButton
                          size="small"
                          onClick={handleMobileStepBack}
                          aria-label={t("selfAssessment.mobileStep.back")}
                          sx={{
                            flexShrink: 0,
                            mt: 0.15,
                            color: at.primary,
                            bgcolor: `${at.primary}12`,
                            "&:hover": { bgcolor: `${at.primary}22` },
                          }}
                        >
                          <ArrowBack fontSize="small" />
                        </IconButton>
                      )}
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 700,
                            color: colors.text.primary,
                            mb: 0.25,
                            fontSize: {
                              xs: "1rem",
                              md: isVerifierLayout ? "1.0625rem" : "0.9375rem",
                            },
                            lineHeight: 1.3,
                          }}
                        >
                          {showMobileSubdomainsPanel
                            ? t("selfAssessment.mobileStep.subdomains")
                            : t("selfAssessment.assessmentDomains")}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            fontSize: {
                              xs: "0.8125rem",
                              md: isVerifierLayout ? "0.8125rem" : "0.75rem",
                            },
                          }}
                        >
                          {showMobileSubdomainsPanel && selectedDomain
                            ? getDomainName(selectedDomain)
                            : t("selfAssessment.navigateSubtitle")}
                        </Typography>
                        {!showMobileSubdomainsPanel &&
                        typeof renderDomainsPanelExtra === "function"
                          ? renderDomainsPanelExtra()
                          : null}
                      </Box>
                    </Box>
                    <AssessmentChipSelector
                      className="sa-domains-panel__chip-selector"
                      assessments={assessments}
                      selectedAssessmentId={selectedAssessment?.assessmentId}
                      label={t("selfAssessment.selectAssessment")}
                      onSelect={handleAssessmentSelect}
                      showPeriod={false}
                      getAssessmentLabel={(assessment) =>
                        assessment.assessmentName ||
                        t("selfAssessment.assessmentNameFallback", {
                          id: assessment.assessmentId,
                        })
                      }
                    />
                  </Box>

                  {isAssessmentDataLoading && (
                    <LinearProgress
                      sx={{
                        flexShrink: 0,
                        height: 3,
                        bgcolor: `${at.primary}12`,
                        "& .MuiLinearProgress-bar": { bgcolor: at.primary },
                      }}
                    />
                  )}

                  {/* Domains/Subdomains List */}
                  <Box
                    className="sa-nav-list"
                    sx={{
                      flex: "1 1 0",
                      minHeight: 0,
                      overflowY: "auto",
                      overflowX: "hidden",
                      WebkitOverflowScrolling: "touch",
                      p: {
                        xs: 2.5,
                        md: isVerifierLayout ? 2 : 1.5,
                      },
                    }}
                  >
                    {isAssessmentDataLoading ? (
                      <SelfAssessmentLoadingPanel
                        message={t("selfAssessment.loadingAssessmentData")}
                        subtitle={t("selfAssessment.loadingAssessmentDataHint")}
                        accentColor={at.primary}
                        compact={matchDownMD}
                      />
                    ) : showMobileSubdomainsPanel ? (
                      selectedDomain?.subDomain?.length > 0 ? (
                        <Box
                          sx={{
                            display: "flex",
                            flexDirection: "column",
                            gap: { xs: 2, md: 1 },
                          }}
                        >
                          {selectedDomain.subDomain.map(
                            (subdomain, subdomainIndex) => {
                              const subdomainId =
                                subdomain.subDomainId || subdomain.id;
                              const subdomainProgress =
                                getSubdomainProgress(subdomain);
                              const subdomainEvidenceProgress =
                                getSubdomainEvidenceProgress(subdomain);
                              const isSubdomainSelected =
                                selectedSubdomain?.subDomainId ===
                                  subdomainId ||
                                selectedSubdomain?.id === subdomainId;
                              const domainIdx = domains.findIndex(
                                (d) => d.domainId === selectedDomain.domainId,
                              );
                              const subdomainNumber = `${domainIdx + 1}.${
                                subdomainIndex + 1
                              }`;

                              return (
                                <Card
                                  className="sa-nav-card sa-nav-card--subdomain"
                                  key={subdomainId}
                                  onClick={() =>
                                    handleMobileSubdomainSelect(subdomain)
                                  }
                                  sx={{
                                    cursor: "pointer",
                                    transition: "all 0.3s ease",
                                    border: isSubdomainSelected
                                      ? "2px solid"
                                      : "1px solid",
                                    borderColor: isSubdomainSelected
                                      ? at.primary
                                      : colors.neutral.gray200,
                                    borderRadius: 2,
                                    bgcolor: isSubdomainSelected
                                      ? at.primary + "12"
                                      : "white",
                                    boxShadow: isSubdomainSelected
                                      ? `0 4px 12px ${at.primary}20`
                                      : "0 2px 8px rgba(0,0,0,0.04)",
                                    "&:active": {
                                      transform: "scale(0.99)",
                                    },
                                  }}
                                >
                                  <CardContent
                                    sx={{
                                      p: { xs: 2.5, md: 2 },
                                      "&:last-child": {
                                        pb: { xs: 2.5, md: 2 },
                                      },
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1.5,
                                        mb: 1,
                                      }}
                                    >
                                      <Typography
                                        variant="body1"
                                        sx={{
                                          fontWeight: 600,
                                          color: colors.text.primary,
                                          fontSize: "0.9375rem",
                                          lineHeight: 1.35,
                                          flex: 1,
                                          minWidth: 0,
                                        }}
                                      >
                                        {getSubdomainName(subdomain)}
                                      </Typography>
                                      <EvidenceCountChip
                                        progress={subdomainEvidenceProgress}
                                        t={t}
                                      />
                                      {subdomainProgress === 100 && (
                                        <CheckCircle
                                          sx={{
                                            color: colors.accent.green,
                                            fontSize: 18,
                                          }}
                                        />
                                      )}
                                    </Box>
                                    <AssessmentNavProgressBar
                                      progress={subdomainProgress}
                                      getProgressColor={getProgressColor}
                                      label={t("selfAssessment.progress")}
                                      mobile
                                    />
                                    <SubdomainEvidenceProgressBar
                                      subdomain={subdomain}
                                      getProgressColor={getProgressColor}
                                      t={t}
                                      mobile
                                    />
                                  </CardContent>
                                </Card>
                              );
                            },
                          )}
                        </Box>
                      ) : (
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ textAlign: "center", py: 4 }}
                        >
                          {t("selfAssessment.mobileStep.selectSubdomain")}
                        </Typography>
                      )
                    ) : domains.length > 0 ? (
                      <Box
                        sx={{
                          display: "flex",
                          flexDirection: "column",
                          gap: { xs: 2, md: 1 },
                        }}
                      >
                        {domains.map((domain, domainIndex) => {
                          const progress = getDomainProgress(domain);
                          const domainEvidenceProgress =
                            getDomainMandatoryEvidenceProgress(domain);
                          const isDomainSelected =
                            selectedDomain?.domainId === domain.domainId;
                          const DomainIcon = getDomainIcon(domain);
                          const domainNumber = domainIndex + 1;

                          return (
                            <Box key={domain.domainId}>
                              <Card
                                className="sa-nav-card sa-nav-card--domain"
                                onClick={() =>
                                  matchDownMD
                                    ? handleMobileDomainSelect(domain)
                                    : handleDomainSelect(domain)
                                }
                                sx={{
                                  cursor: "pointer",
                                  transition: "all 0.3s ease",
                                  border: "1.5px solid",
                                  borderColor: isDomainSelected
                                    ? at.primary
                                    : "transparent",
                                  borderRadius: 2,
                                  bgcolor: isDomainSelected
                                    ? at.primary + "08"
                                    : colors.background.primary,
                                  boxShadow: isDomainSelected
                                    ? `0 4px 12px ${at.primary}15`
                                    : "0 2px 8px rgba(0,0,0,0.04)",
                                  "&:hover": {
                                    transform: "translateX(4px)",
                                    boxShadow: `0 6px 16px ${at.primary}25`,
                                    borderColor: at.primary,
                                  },
                                }}
                              >
                                <CardContent
                                  sx={{
                                    p: { xs: 2.5, md: 1.5 },
                                    "&:last-child": { pb: { xs: 2.5, md: 1.5 } },
                                  }}
                                >
                                  <Box
                                    sx={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: 1,
                                      mb: 1,
                                    }}
                                  >
                                    <Box
                                      sx={{
                                        width: { xs: 36, md: 28 },
                                        height: { xs: 36, md: 28 },
                                        borderRadius: 1.25,
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        flexShrink: 0,
                                        bgcolor: isDomainSelected
                                          ? `${at.primary}18`
                                          : colors.neutral.gray100,
                                        color: isDomainSelected
                                          ? at.primary
                                          : colors.text.secondary,
                                      }}
                                    >
                                      {React.cloneElement(DomainIcon, {
                                        sx: { fontSize: { xs: 24, md: 18 } },
                                      })}
                                    </Box>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                      <Typography
                                        variant="body2"
                                        sx={{
                                          fontWeight: 600,
                                          color: isDomainSelected
                                            ? at.primary
                                            : colors.text.primary,
                                          fontSize: {
                                            xs: "0.9375rem",
                                            md: "0.8125rem",
                                          },
                                          mb: 0,
                                          lineHeight: 1.35,
                                        }}
                                      >
                                        {getDomainName(domain)}
                                      </Typography>
                                    </Box>
                                    <EvidenceCountChip
                                      progress={domainEvidenceProgress}
                                      t={t}
                                      compact
                                    />
                                    {progress === 100 && (
                                      <CheckCircle
                                        sx={{
                                          color: colors.accent.green,
                                          fontSize: 18,
                                        }}
                                      />
                                    )}
                                  </Box>
                                  {/* Progress Bar */}
                                  <Box sx={{ mt: 0.75 }}>
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        mb: 0.5,
                                      }}
                                    >
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          fontSize: "0.7rem",
                                          color: colors.text.secondary,
                                          fontWeight: 500,
                                        }}
                                      >
                                        {t("selfAssessment.progress")}
                                      </Typography>
                                      <Typography
                                        variant="caption"
                                        sx={{
                                          fontSize: "0.7rem",
                                          color: getProgressColor(progress),
                                          fontWeight: 600,
                                        }}
                                      >
                                        {Math.round(progress)}%
                                      </Typography>
                                    </Box>
                                    <LinearProgress
                                      variant="determinate"
                                      value={progress}
                                      sx={{
                                        height: 6,
                                        borderRadius: 3,
                                        bgcolor: colors.neutral.gray200,
                                        "& .MuiLinearProgress-bar": {
                                          borderRadius: 3,
                                          bgcolor: getProgressColor(progress),
                                        },
                                      }}
                                    />
                                  </Box>
                                  <DomainEvidenceProgressBar
                                    domain={domain}
                                    getProgressColor={getProgressColor}
                                    t={t}
                                    mobile={matchDownMD}
                                  />
                                </CardContent>
                              </Card>

                              {/* Show Subdomains when domain is selected (desktop only) */}
                              {!matchDownMD &&
                                isDomainSelected &&
                                domain.subDomain &&
                                domain.subDomain.length > 0 && (
                                  <Box
                                    sx={{
                                      mt: 1.5,
                                      ml: 1.5,
                                      pl: 1.5,
                                      borderLeft: `2px solid ${at.primary}30`,
                                    }}
                                  >
                                    {domain.subDomain.map(
                                      (subdomain, subdomainIndex) => {
                                        const subdomainId =
                                          subdomain.subDomainId || subdomain.id;
                                        const subdomainProgress =
                                          getSubdomainProgress(subdomain);
                                        const subdomainEvidenceProgress =
                                          getSubdomainEvidenceProgress(subdomain);
                                        const isSubdomainSelected =
                                          selectedSubdomain?.subDomainId ===
                                          subdomainId;
                                        const subdomainNumber = `${domainNumber}.${
                                          subdomainIndex + 1
                                        }`;

                                        return (
                                          <Card
                                            className="sa-nav-card sa-nav-card--subdomain"
                                            key={subdomainId}
                                            onClick={() =>
                                              handleSubdomainSelect(subdomain)
                                            }
                                            sx={{
                                              cursor: "pointer",
                                              mb: 1.5,
                                              transition: "all 0.3s ease",
                                              border: isSubdomainSelected
                                                ? "2px solid"
                                                : "1px solid",
                                              borderColor: isSubdomainSelected
                                                ? at.primary
                                                : colors.neutral.gray200,
                                              borderRadius: 1.2,
                                              bgcolor: isSubdomainSelected
                                                ? at.primary + "15"
                                                : "white",
                                              boxShadow: isSubdomainSelected
                                                ? `0 4px 12px ${at.primary}30`
                                                : "none",
                                              "&:hover": {
                                                borderColor:
                                                  at.primary,
                                                bgcolor:
                                                  at.primary + "08",
                                              },
                                            }}
                                          >
                                            <CardContent
                                              sx={{
                                                p: { xs: 2, md: 1.75 },
                                                "&:last-child": {
                                                  pb: { xs: 2, md: 1.75 },
                                                },
                                              }}
                                            >
                                              <Box
                                                sx={{
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: 1,
                                                  mb: 0.8,
                                                }}
                                              >
                                                <Box
                                                  sx={{ flex: 1, minWidth: 0 }}
                                                >
                                                  <Typography
                                                    variant="body2"
                                                    sx={{
                                                      fontWeight: 600,
                                                      color: isSubdomainSelected
                                                        ? at.primary
                                                        : colors.text.primary,
                                                      fontSize: "0.75rem",
                                                      lineHeight: 1.3,
                                                    }}
                                                  >
                                                    {getSubdomainName(subdomain)}
                                                  </Typography>
                                                </Box>
                                                <EvidenceCountChip
                                                  progress={subdomainEvidenceProgress}
                                                  t={t}
                                                  compact
                                                />
                                                {isSubdomainSelected &&
                                                  subdomainProgress === 100 && (
                                                    <CheckCircle
                                                      sx={{
                                                        color:
                                                          colors.accent.green,
                                                        fontSize: 14,
                                                      }}
                                                    />
                                                  )}
                                              </Box>
                                              {/* Progress Bar */}
                                              <Box sx={{ mt: 0.6 }}>
                                                <Box
                                                  sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    justifyContent:
                                                      "space-between",
                                                    mb: 0.3,
                                                  }}
                                                >
                                                  <Typography
                                                    variant="caption"
                                                    sx={{
                                                      fontSize: "0.625rem",
                                                      color:
                                                        colors.text.secondary,
                                                      fontWeight: 500,
                                                    }}
                                                  >
                                                    {t("selfAssessment.progress")}
                                                  </Typography>
                                                  <Typography
                                                    variant="caption"
                                                    sx={{
                                                      fontSize: "0.625rem",
                                                      color:
                                                        getProgressColor(
                                                          subdomainProgress,
                                                        ),
                                                      fontWeight: 600,
                                                    }}
                                                  >
                                                    {Math.round(
                                                      subdomainProgress,
                                                    )}
                                                    %
                                                  </Typography>
                                                </Box>
                                                <LinearProgress
                                                  variant="determinate"
                                                  value={subdomainProgress}
                                                  sx={{
                                                    height: 4,
                                                    borderRadius: 2,
                                                    bgcolor:
                                                      colors.neutral.gray200,
                                                    "& .MuiLinearProgress-bar":
                                                      {
                                                        borderRadius: 2,
                                                        bgcolor:
                                                          getProgressColor(
                                                            subdomainProgress,
                                                          ),
                                                      },
                                                  }}
                                                />
                                              </Box>
                                              <SubdomainEvidenceProgressBar
                                                subdomain={subdomain}
                                                getProgressColor={getProgressColor}
                                                t={t}
                                              />
                                            </CardContent>
                                          </Card>
                                        );
                                      },
                                    )}
                                  </Box>
                                )}
                            </Box>
                          );
                        })}
                      </Box>
                    ) : (
                      <Box sx={{ textAlign: "center", py: 4, px: 2 }}>
                        <Assessment
                          sx={{
                            fontSize: 64,
                            color: colors.neutral.gray400,
                            mb: 2,
                          }}
                        />
                        <Typography
                          variant="h6"
                          sx={{
                            fontWeight: 600,
                            color: colors.text.primary,
                            mb: 1,
                          }}
                        >
                          {t("selfAssessment.noAssessmentAvailable")}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {t("selfAssessment.noAssessmentAvailableDescription")}
                        </Typography>
                      </Box>
                    )}
                  </Box>

                  {/* Final Submit Button — desktop + mobile domains tab only */}
                  {!!isPublished &&
                    !allAssessmentsSubmitted &&
                    (!matchDownMD || mobileStep === 0) && (
                      <Box
                        className="sa-domains-panel__submit"
                        sx={{
                          p: 2.5,
                          borderTop: `2px solid ${colors.neutral.gray200}`,
                          bgcolor: colors.background.secondary,
                          flexShrink: 0,
                          mt: "auto",
                        }}
                      >
                        <Button
                          variant="contained"
                          fullWidth
                          onClick={handleOpenSubmitConfirmation}
                          disabled={
                            submitAssessmentMutation.isPending ||
                            isSubmittingAllAssessments ||
                            (!isVerifierLayout && !allAssessmentsAnswersComplete) ||
                            (!isVerifierLayout &&
                              !allAssessmentsMandatoryEvidenceComplete) ||
                            allAssessmentsSubmitted ||
                            !canSubmitAssessment
                          }
                          title={
                            !allAssessmentsAnswersComplete
                              ? t(
                                  "selfAssessment.submitBlocked.allAssessmentsDomainsIncomplete",
                                  {
                                    defaultValue:
                                      "Please complete all domains (100%) in every assessment before submitting.",
                                  },
                                )
                              : !allAssessmentsMandatoryEvidenceComplete
                                ? t("selfAssessment.submitBlocked.evidenceIncomplete", {
                                    remaining:
                                      allAssessmentsMandatoryEvidenceProgress.remaining,
                                    defaultValue:
                                      "Please upload all mandatory evidence before submitting ({{remaining}} remaining).",
                                  })
                                : t("selfAssessment.submitBlocked.readyAll", {
                                    defaultValue:
                                      "Submit all assessments when every assessment is complete.",
                                  })
                          }
                          sx={{
                            bgcolor: colors.accent.green,
                            "&:hover": {
                              bgcolor: colors.accent.greenDark,
                              "&:disabled": {
                                bgcolor: colors.neutral.gray300,
                              },
                            },
                            "&:disabled": {
                              bgcolor: colors.neutral.gray300,
                              color: colors.neutral.gray600,
                              cursor: "not-allowed",
                            },
                            textTransform: "none",
                            fontWeight: 600,
                            py: 1.5,
                            borderRadius: 2,
                          }}
                        >
                          {submitAssessmentMutation.isPending ||
                          isSubmittingAllAssessments
                            ? t("selfAssessment.submitting", {
                                defaultValue: "Submitting...",
                              })
                            : assessments.length > 1
                              ? t("selfAssessment.submitAllAssessments", {
                                  defaultValue: "Submit All Assessments",
                                })
                              : t("selfAssessment.submitAssessment", {
                                  defaultValue: "Submit Assessment",
                                })}
                        </Button>
                      </Box>
                    )}
                </Paper>
              </Box>

              {!matchDownMD && (
                <Box
                  className="sa-left-panel-divider"
                  sx={{
                    flexShrink: 0,
                    width: 28,
                    display: "flex",
                    alignItems: "flex-start",
                    justifyContent: "center",
                    pt: 2,
                    borderLeft: isLeftPanelCollapsed
                      ? "none"
                      : `1px solid ${colors.neutral.gray200}`,
                  }}
                >
                  <IconButton
                    type="button"
                    className="sa-left-panel-toggle"
                    onClick={() => setIsLeftPanelCollapsed((prev) => !prev)}
                    aria-expanded={!isLeftPanelCollapsed}
                    aria-label={
                      isLeftPanelCollapsed
                        ? t("selfAssessment.expandDomainsPanel")
                        : t("selfAssessment.collapseDomainsPanel")
                    }
                    title={
                      isLeftPanelCollapsed
                        ? t("selfAssessment.showDomains")
                        : t("selfAssessment.hideDomains")
                    }
                    sx={{
                      width: 28,
                      height: 48,
                      borderRadius: "0 8px 8px 0",
                      bgcolor: at.primary,
                      color: "#fff",
                      boxShadow: `0 2px 8px ${at.primary}40`,
                      "&:hover": { bgcolor: at.dark },
                    }}
                  >
                    {isLeftPanelCollapsed ? (
                      <ChevronRight fontSize="small" />
                    ) : (
                      <ChevronLeft fontSize="small" />
                    )}
                  </IconButton>
                </Box>
              )}

              <Box
                className={`sa-main-workspace${
                  matchDownMD && mobileStep === 2
                    ? " sa-main-workspace--questions-mobile"
                    : ""
                }${
                  showMobileNavPanel
                    ? " sa-main-workspace--mobile-nav-hidden"
                    : ""
                }`}
                sx={{
                  flex: {
                    xs: showMobileNavPanel ? "0 0 0" : 1,
                    md: 1,
                  },
                  minWidth: 0,
                  minHeight: { xs: showMobileNavPanel ? 0 : 0, md: 0 },
                  display: {
                    xs: showMobileNavPanel ? "none" : "flex",
                    md: "flex",
                  },
                  flexDirection: "column",
                  gap: { xs: mobileStep === 2 ? 0 : 2, md: 0 },
                  overflow: "hidden",
                }}
              >
                {/* Right Panel - Questions */}
                {showMobileQuestionsPanel && (
                  <Box
                    sx={{
                      flex: "1 1 0",
                      minHeight: 0,
                      display: "flex",
                      flexDirection: "column",
                      overflow: "hidden",
                    }}
                  >
                    {matchDownMD && mobileStep === 2 ? (
                      <Box
                        className="sa-mobile-questions-toolbar"
                        sx={{
                          display: "flex",
                          alignItems: "stretch",
                          gap: 1,
                          mb: 1,
                          flexShrink: 0,
                          flexWrap: { xs: "wrap", sm: "nowrap" },
                        }}
                      >
                        <Box
                          className="sa-mobile-questions-back"
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            gap: 0.5,
                            flexShrink: 0,
                            alignSelf: "center",
                          }}
                        >
                          <IconButton
                            size="small"
                            onClick={handleMobileStepBack}
                            aria-label={t("selfAssessment.mobileStep.back")}
                            sx={{
                              color: at.primary,
                              bgcolor: at.primary + "10",
                            }}
                          >
                            <ArrowBack fontSize="small" />
                          </IconButton>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color: colors.text.secondary,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {t("selfAssessment.mobileStep.subdomains")}
                          </Typography>
                        </Box>
                        {!isTablet
                          ? renderOverallProgress(false, "inline")
                          : null}
                      </Box>
                    ) : null}
                    <Paper
                      className={`sa-questions-panel${
                        matchDownMD ? " sa-questions-panel--mobile-full" : ""
                      }`}
                      sx={{
                        flex: "1 1 0",
                        minHeight: 0,
                        height: { md: "100%" },
                        borderRadius: 3,
                        bgcolor: "white",
                        display: "flex",
                        flexDirection: "column",
                        overflow: "hidden",
                        minWidth: 0,
                        boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                      }}
                    >
                      {/* <Box
                      className="sa-panel-header sa-panel-header--compact"
                      sx={{
                        p: { xs: 1.5, md: 2 },
                        borderBottom: `1px solid ${colors.neutral.gray200}`,
                        bgcolor: colors.background.secondary,
                        display: { xs: "none", md: "block" },
                      }}
                    >
                      <Typography
                        variant="subtitle2"
                        sx={{ fontWeight: 700, color: colors.text.primary }}
                      >
                        Answer questions one at a time
                      </Typography>
                    </Box> */}

                      {/* Questions Content */}
                      <Box
                        className="sa-questions-content sa-questions-content--wizard"
                        sx={{
                          flex: "1 1 0",
                          minHeight: 0,
                          overflow: "hidden",
                          p: { xs: matchDownMD ? 1 : 1.5, sm: 2, md: 3 },
                          display: "flex",
                          flexDirection: "column",
                        }}
                      >
                        {/* Loading State */}
                        {isLoadingQuestions && (
                          <Box
                            sx={{
                              display: "flex",
                              justifyContent: "center",
                              alignItems: "center",
                              minHeight: "400px",
                            }}
                          >
                            <CircularProgress />
                          </Box>
                        )}

                        {/* No Questions Message */}
                        {!isLoadingQuestions && allQuestions.length === 0 && (
                          <Box sx={{ textAlign: "center", py: 8, px: 3 }}>
                            <Assignment
                              sx={{
                                fontSize: 80,
                                color: colors.neutral.gray400,
                                mb: 3,
                              }}
                            />
                            <Typography
                              variant="h5"
                              sx={{
                                fontWeight: 700,
                                color: colors.text.primary,
                                mb: 1.5,
                              }}
                            >
                              No Questions Added
                            </Typography>
                            <Typography
                              variant="body1"
                              color="text.secondary"
                              sx={{ maxWidth: 400, mx: "auto" }}
                            >
                              There are no questions available for this
                              subdomain yet. Please contact your administrator
                              to add questions.
                            </Typography>
                          </Box>
                        )}

                        {!isLoadingQuestions &&
                          allQuestions.length > 0 &&
                          flattenedQuestions.length > 0 && (
                            <Box
                              sx={{
                                flex: "1 1 0",
                                minHeight: 0,
                                display: "flex",
                                flexDirection: "column",
                                overflow: "hidden",
                              }}
                            >
                              <ErrorBoundary
                                logLabel="SubdomainQuestionFlow"
                                title="Questions could not be loaded"
                                message="This subdomain hit an unexpected error. Go back and try another subdomain, or reload the page."
                              >
                                <SubdomainQuestionFlow
                                  c={c}
                                  matchDownMD={matchDownMD}
                                  setMobileStep={setMobileStep}
                                  scrollMobileToTop={scrollMobileToTop}
                                />
                              </ErrorBoundary>
                            </Box>
                          )}
                      </Box>
                    </Paper>
                  </Box>
                )}

                {/* Domain View - When Domain Selected but No Subdomain (desktop) */}
                {!matchDownMD &&
                  selectedDomain &&
                  !selectedSubdomain &&
                  (() => {
                    const domainIdx = domains.findIndex(
                      (d) => d.domainId === selectedDomain.domainId,
                    );
                    const currentDomainNumber = domainIdx + 1;

                    return (
                      <Paper
                        sx={{
                          flex: 1,
                          borderRadius: 3,
                          bgcolor: "white",
                          display: "flex",
                          flexDirection: "column",
                          overflow: "hidden",
                          maxHeight: "calc(100vh - 200px)",
                          minWidth: 0,
                          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
                        }}
                      >
                        {/* Domain Header */}
                        <Box
                          sx={{
                            p: 3,
                            borderBottom: `2px solid ${colors.neutral.gray200}`,
                            bgcolor: colors.background.secondary,
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "flex-start",
                              justifyContent: "space-between",
                              mb: 2,
                              pt: 3,
                            }}
                          >
                            <Box sx={{ flex: 1 }}>
                              <Typography
                                variant="h5"
                                sx={{
                                  fontWeight: 700,
                                  color: colors.text.primary,
                                  mb: 0.5,
                                }}
                              >
                                {currentDomainNumber}.{" "}
                                {getDomainName(selectedDomain)}
                              </Typography>
                              <Typography
                                variant="body2"
                                color="text.secondary"
                                sx={{ fontSize: "0.875rem" }}
                              >
                                Assessment of{" "}
                                {(
                                  getDomainName(selectedDomain) || ""
                                ).toLowerCase()}
                              </Typography>
                            </Box>

                            {/* Domain Progress Card */}
                            <Card
                              sx={{
                                minWidth: 140,
                                p: 1.5,
                                borderRadius: 2,
                                bgcolor: colors.background.primary,
                                border: `1px solid ${colors.neutral.gray200}`,
                              }}
                            >
                              <Typography
                                variant="caption"
                                sx={{
                                  color: colors.text.secondary,
                                  fontSize: "0.7rem",
                                  fontWeight: 600,
                                  mb: 1,
                                  display: "block",
                                }}
                              >
                                {t("selfAssessment.progress")}
                              </Typography>
                              <Box
                                sx={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 1,
                                }}
                              >
                                <CircularProgress
                                  variant="determinate"
                                  value={getDomainProgress(selectedDomain)}
                                  size={40}
                                  thickness={4}
                                  sx={{
                                    color: getProgressColor(
                                      getDomainProgress(selectedDomain),
                                    ),
                                  }}
                                />
                                <Typography
                                  variant="h6"
                                  sx={{
                                    fontWeight: 700,
                                    color: colors.text.primary,
                                    fontSize: "1rem",
                                  }}
                                >
                                  {Math.round(
                                    getDomainProgress(selectedDomain),
                                  )}
                                  %
                                </Typography>
                              </Box>
                            </Card>
                          </Box>
                        </Box>

                        {/* Subdomains List */}
                        <Box
                          sx={{
                            flex: 1,
                            overflowY: "auto",
                            p: { xs: 2.5, md: 3.5 },
                          }}
                        >
                          {selectedDomain.subDomain &&
                          selectedDomain.subDomain.length > 0 ? (
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 2.5,
                              }}
                            >
                              {selectedDomain.subDomain.map(
                                (subdomain, index) => {
                                  const subdomainId =
                                    subdomain.subDomainId || subdomain.id;
                                  const subdomainProgress =
                                    getSubdomainProgress(subdomain);
                                  const domainIdx = domains.findIndex(
                                    (d) =>
                                      d.domainId === selectedDomain.domainId,
                                  );
                                  const subdomainNumber = `${domainIdx + 1}.${
                                    index + 1
                                  }`;

                                  return (
                                    <Card
                                      key={subdomainId}
                                      onClick={() =>
                                        handleSubdomainSelect(subdomain)
                                      }
                                      sx={{
                                        cursor: "pointer",
                                        transition: "all 0.3s ease",
                                        border: "1px solid",
                                        borderColor: colors.neutral.gray200,
                                        borderRadius: 2,
                                        bgcolor: colors.background.primary,
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                                        "&:hover": {
                                          transform: "translateY(-2px)",
                                          boxShadow:
                                            "0 4px 12px rgba(0,0,0,0.1)",
                                          borderColor: at.primary,
                                        },
                                      }}
                                    >
                                      <CardContent sx={{ p: 2.5 }}>
                                        <Box
                                          sx={{
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "space-between",
                                            mb: 2,
                                          }}
                                        >
                                          <Box
                                            sx={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 2,
                                              flex: 1,
                                              minWidth: 0,
                                            }}
                                          >
                                            <Typography
                                              variant="body1"
                                              sx={{
                                                fontWeight: 600,
                                                color: colors.text.primary,
                                                fontSize: "0.9375rem",
                                              }}
                                            >
                                              {getSubdomainName(subdomain)}
                                            </Typography>
                                          </Box>
                                          <Box
                                            sx={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 2,
                                            }}
                                          >
                                            <Box
                                              sx={{
                                                position: "relative",
                                                display: "inline-flex",
                                              }}
                                            >
                                              <CircularProgress
                                                variant="determinate"
                                                value={subdomainProgress}
                                                size={50}
                                                thickness={4}
                                                sx={{
                                                  color:
                                                    getProgressColor(
                                                      subdomainProgress,
                                                    ),
                                                }}
                                              />
                                              <Box
                                                sx={{
                                                  top: 0,
                                                  left: 0,
                                                  bottom: 0,
                                                  right: 0,
                                                  position: "absolute",
                                                  display: "flex",
                                                  alignItems: "center",
                                                  justifyContent: "center",
                                                }}
                                              >
                                                <Typography
                                                  variant="caption"
                                                  component="div"
                                                  sx={{
                                                    fontSize: "0.7rem",
                                                    fontWeight: 600,
                                                    color: colors.text.primary,
                                                  }}
                                                >
                                                  {Math.round(
                                                    subdomainProgress,
                                                  )}
                                                  %
                                                </Typography>
                                              </Box>
                                            </Box>
                                          </Box>
                                        </Box>
                                      </CardContent>
                                    </Card>
                                  );
                                },
                              )}
                            </Box>
                          ) : (
                            <Box sx={{ textAlign: "center", py: 8 }}>
                              <Typography
                                variant="body1"
                                color="text.secondary"
                              >
                                {t("selfAssessment.noSubdomainsForDomain")}
                              </Typography>
                            </Box>
                          )}
                        </Box>
                      </Paper>
                    );
                  })()}

                {/* Domains Overview - No Domain Selected (desktop) */}
                {!matchDownMD && !selectedDomain && (
                  <Paper
                    className="sa-overview-panel"
                    elevation={0}
                    sx={{
                      flex: 1,
                      borderRadius: 3,
                      bgcolor: "white",
                      display: "flex",
                      flexDirection: "column",
                      maxHeight: hideAppChrome
                        ? verifierPanelHeight
                        : "calc(100vh - 200px)",
                      minHeight: hideAppChrome ? verifierPanelHeight : undefined,
                      overflow: "hidden",
                      minWidth: 0,
                      border: `1px solid ${at.primary}18`,
                      boxShadow: `0 8px 32px ${at.primary}12`,
                    }}
                  >
                    {/* Header */}
                    <Box
                      className="sa-panel-header sa-overview-panel__header"
                      sx={{
                        p: {
                          xs: 2.5,
                          md: isVerifierLayout ? 2.25 : 1.75,
                        },
                        borderBottom: `2px solid ${at.primary}22`,
                        background: at.panelGradient,
                        display: "flex",
                        alignItems: "flex-start",
                        justifyContent: "space-between",
                        gap: 2,
                        flexWrap: "wrap",
                      }}
                    >
                      <Box sx={{ flex: 1, minWidth: 180 }}>
                        <Typography
                          variant="subtitle1"
                          sx={{
                            fontWeight: 700,
                            color: colors.text.primary,
                            mb: 0.25,
                            fontSize: {
                              xs: "1.125rem",
                              md: isVerifierLayout ? "1.0625rem" : "1rem",
                            },
                            lineHeight: 1.3,
                          }}
                        >
                          {t("selfAssessment.assessmentOverview")}
                        </Typography>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{
                            fontSize: {
                              xs: "0.8125rem",
                              md: isVerifierLayout ? "0.8125rem" : "0.75rem",
                            },
                          }}
                        >
                          {t("selfAssessment.reviewSubtitle")}
                        </Typography>
                      </Box>
                      {renderOverallProgress(true)}
                    </Box>

                    {/* Bar Graph - Domains Progress */}
                    <Box
                      className="sa-overview-panel__body"
                      sx={{
                        flex: 1,
                        overflowY: "auto",
                        p: {
                          xs: 2.5,
                          md: isVerifierLayout ? 2.5 : 2,
                        },
                        display: "flex",
                        flexDirection: "column",
                      }}
                    >
                      {isAssessmentDataLoading ? (
                        <SelfAssessmentLoadingPanel
                          message={t("selfAssessment.loadingAssessmentData")}
                          subtitle={t("selfAssessment.loadingAssessmentDataHint")}
                          accentColor={at.primary}
                        />
                      ) : currentChartData.length > 0 ? (
                        <AssessmentProgressOverview
                          embedded
                          items={currentChartData}
                          title={progressOverviewTitle}
                          subtitle={progressOverviewSubtitle}
                          assessmentTheme={at}
                          assessments={assessments}
                          chartDrilldownAssessmentId={chartDrilldownAssessmentId}
                          showBackButton={
                            assessments.length > 1 && !!chartDrilldownAssessmentId
                          }
                          onBack={() => setChartDrilldownAssessmentId(null)}
                          onItemClick={handleProgressOverviewItemClick}
                          getProgressColor={getProgressColor}
                          t={t}
                        />
                      ) : (
                        <Box sx={{ textAlign: "center", py: 8, px: 3 }}>
                          <Assessment
                            sx={{
                              fontSize: 80,
                              color: colors.neutral.gray400,
                              mb: 3,
                            }}
                          />
                          <Typography
                            variant="h5"
                            sx={{
                              fontWeight: 700,
                              color: colors.text.primary,
                              mb: 1.5,
                            }}
                          >
                            {t("selfAssessment.noAssessmentAvailable")}
                          </Typography>
                          <Typography
                            variant="body1"
                            color="text.secondary"
                            sx={{ maxWidth: 400, mx: "auto" }}
                          >
                            {t("selfAssessment.noAssessmentAvailableDescriptionPublish")}
                          </Typography>
                        </Box>
                      )}
                    </Box>
                  </Paper>
                )}
              </Box>
            </Box>
          </Box>
        </Box>
      </Box>

      {/* Answer preview — confirm button does the final submit */}
      <SubmitPreviewModal
        open={showSubmitPreview}
        onClose={handleCloseSubmitPreview}
        onConfirm={handleConfirmSubmitPreview}
        previewData={submitPreviewData}
        isLoading={isLoadingSubmitPreview}
        isSubmitting={
          isFetchingDomains ||
          submitAssessmentMutation.isPending ||
          isSubmittingAllAssessments
        }
        error={submitPreviewError}
        totalAnswered={submitPreviewAnswerCount}
        title={t("selfAssessment.submitPreview.title")}
        description={t("selfAssessment.submitPreview.description")}
        emptyMessage={t("selfAssessment.submitPreview.emptyMessage")}
        confirmText={t("selfAssessment.submitAssessment")}
        cancelText={t("selfAssessment.submitPreview.cancel")}
        academicYear={ENV_ACADEMIC_YEAR}
        round=""
      />
    </Box>
  );
}
