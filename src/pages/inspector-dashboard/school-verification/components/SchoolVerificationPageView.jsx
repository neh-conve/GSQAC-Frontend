import React from "react";
import {
  Box, Paper, Typography, Button, Card, CardContent, CircularProgress, Alert, Chip,
  RadioGroup, FormControlLabel, Radio, FormControl, AppBar, Toolbar, IconButton,
  useTheme, useMediaQuery, Divider, LinearProgress, Select, MenuItem, InputLabel,
  ToggleButtonGroup, ToggleButton, TextField, Tabs, Tab
} from "@mui/material";
import {
  CheckCircle, ArrowForward, Menu, Assessment, Class, Assignment, ExpandMore, ExpandLess,
  WorkspacePremium, MenuBook, Groups, Business, School as SchoolIcon, Language, Create,
  LocationOn, AccountTree
} from "@mui/icons-material";
import { colors } from "../../../../constants/colors";
import AppDrawer from "../../../../components/AppDrawer/AppDrawer";
import { DRAWER_WIDTH } from "../../../../constants/menuItems";
import ConfirmationModal from "../../../../components/ConfirmationModal/ConfirmationModal";
import { SelfAssessmentMobileStepper } from "../../../school-dashboard/self-assessment/components/SelfAssessmentMobileStepper";
import { AssessmentOverallProgress } from "../../../../components/AssessmentOverallProgress/AssessmentOverallProgress";
import { useAssessmentMobileLayout } from "../../../../hooks/useAssessmentMobileLayout";
import { renderAssessmentOptionLabel } from "../../../../utils/assessmentOptionLabel";
import { AssessmentNavProgressBar } from "../../../../components/AssessmentNavProgressBar/AssessmentNavProgressBar";
import { AssessmentChipSelector } from "../../../../components/AssessmentChipSelector/AssessmentChipSelector";
import { AssessmentPeriodChips } from "../../../../components/AssessmentPeriodChips/AssessmentPeriodChips";
import { SubdomainEvidencePanel } from "../../../../components/SubdomainEvidencePanel/SubdomainEvidencePanel";
import { isEvidenceOptionalForSelectedOption } from "../../../../services/evidenceService";
import { VerifierSubdomainConsistencyPanel } from "./VerifierSubdomainConsistencyPanel";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import "../../../school-dashboard/self-assessment/SelfAssessment.css";

export function SchoolVerificationPageView({ c }) {
  const { t, i18n, matchDownMD, navigate, location, userId, userName, queryClient, currentLanguage, setCurrentLanguage, selectedDomain, setSelectedDomain, selectedSubdomain, setSelectedSubdomain, answers, setAnswers, subdomainAnswers, setSubdomainAnswers, subdomainTextAnswers, setSubdomainTextAnswers, classWiseAnswers, setClassWiseAnswers, classWiseTextAnswers, setClassWiseTextAnswers, selectedClassGroup, setSelectedClassGroup, selectedClass, setSelectedClass, selectedSection, setSelectedSection, selectedSubject, setSelectedSubject, textAnswers, setTextAnswers, expandedQuestions, setExpandedQuestions, showSubmitConfirmation, setShowSubmitConfirmation, selectedQuestionTab, setSelectedQuestionTab, selectedAssessmentId, setSelectedAssessmentId, chartDrilldownAssessmentId, setChartDrilldownAssessmentId, schoolFromState, schoolId, languageCodeMap, languageCode, roleId, domainsData, isLoadingDomains, isErrorDomains, refetchDomains, allQuestionsData, hasSubjectWiseQuestions, questionsData, isLoadingQuestions, isErrorQuestions, refetchQuestions, schoolDataResponse, isLoadingSchoolData, schoolData, gradesData, isLoadingGrades, gradesCounts, lowerClass, upperClass, classOptions, filteredClassOptions, sectionsData, isLoadingSections, subjectsData, isLoadingSubjects, sections, subjects, assessments, selectedAssessment, domains, isPublished, assessmentProgress, endDate, isSubmitted, sessionId, mapGroupRangeToApiFormat, getGroupFlagColor, getFlagColorValue, getTotalQuestionsFromGroupWise, getTotalQuestionsCount, allQuestionsForCount, allQuestions, generalQuestionsTotalCount, classroomObservationQuestionsTotalCount, subjectObservationQuestionsTotalCount, flnQuestionsTotalCount, singleChoiceQuestionsForCount, classroomObservationQuestionsForCount, subjectObservationQuestionsForCount, flnQuestionsForCount, generalQuestionsForCount, singleChoiceQuestions, classroomObservationQuestions, subjectObservationQuestions, flnQuestions, classBasedQuestions, generalQuestions, getDomainName, getSubdomainName, getQuestionText, getOptionText, getSubdomainProgress, getDomainProgress, shouldShowApiAnswer, getDomainIcon, getProgressColor, toggleQuestionExpansion, parseOptions, handleDomainSelect, handleSubdomainSelect, handleAssessmentSelect, handleAnswerChange, handleTextAnswerChange, submitAnswerMutation, submitSubdomainWiseAnswersMutation, submitAssessmentMutation, handleOpenSubmitConfirmation, handleConfirmSubmit, allDomainsComplete, handleSubmit, domainChartData, assessmentChartData, currentChartData, domainNumber, subdomainNumber, questionTabs, currentTab, areAllQuestionsAnsweredForCurrentTab } = c;

  const {
    mobileStep,
    showMobileNavigation,
    showMobileSubdomainsPanel,
    showMobileQuestionsPanel,
    showMobileNavPanel,
    handleMobileDomainSelect,
    handleMobileSubdomainSelect,
    handleMobileStepChange,
    handleMobileStepBack,
  } = useAssessmentMobileLayout({
    matchDownMD,
    selectedDomain,
    selectedSubdomain,
    setSelectedSubdomain,
    setSelectedDomain,
    handleDomainSelect,
    handleSubdomainSelect,
    setAnswers,
    setTextAnswers,
  });

  const renderOptionLabel = (option, optIndex, isSelected = false) =>
    renderAssessmentOptionLabel(t, getOptionText, option, optIndex, {
      isSelected,
    });

  return (

    <Box className="crc-assessment-page-content" sx={{ p: { xs: 2, sm: 3 } }}>
      {/* Header - desktop only */}
      <Box
        sx={{
          display: { xs: "none", md: "flex" },
          alignItems: "center",
          justifyContent: "space-between",
          mb: 3,
        }}
      >
        <Box>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
              mb: 0.5,
            }}
          >
            <Typography
              variant="h4"
              sx={{
                fontWeight: 700,
                color: "#0f172a",
                fontSize: { xs: "1.75rem", md: "2.125rem" },
              }}
            >
              {t("schoolVerification.title")}
            </Typography>
            <AssessmentPeriodChips
              academicYear={selectedAssessment?.academicYear}
              round={selectedAssessment?.round}
            />
            {isPublished && endDate && (
              <Typography
                variant="body2"
                sx={{
                  color: colors.semantic.warning,
                  fontWeight: 600,
                  fontSize: { xs: "0.75rem", sm: "0.875rem" },
                }}
              >
                {t("selfAssessment.endDateWarning", { date: endDate })}
              </Typography>
            )}
          </Box>
          <Typography variant="body1" color="text.secondary">
            {t("schoolVerification.subtitle")}
          </Typography>
          {isErrorDomains && (
            <Alert severity="error" sx={{ mt: 2 }}>
              {t("schoolVerification.failedToLoadDomains")}
            </Alert>
          )}
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <ToggleButtonGroup
            value={currentLanguage}
            exclusive
            onChange={(e, newLanguage) => {
              if (newLanguage !== null) {
                setCurrentLanguage(newLanguage);
                i18n.changeLanguage(newLanguage);
              }
            }}
            size="small"
            sx={{
              "& .MuiToggleButton-root": {
                px: 2,
                py: 0.5,
                fontSize: "0.8125rem",
                fontWeight: 600,
                textTransform: "uppercase",
                borderColor: colors.primary.blue + "40",
                color: colors.text.secondary,
                "&.Mui-selected": {
                  bgcolor: colors.primary.blue,
                  color: "white",
                  "&:hover": {
                    bgcolor: colors.primary.dark,
                  },
                },
                "&:hover": {
                  bgcolor: colors.primary.lightest,
                },
              },
            }}
          >
            <ToggleButton value="gu">ગુ</ToggleButton>
            <ToggleButton value="en">EN</ToggleButton>
            <ToggleButton value="hi">हिं</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {matchDownMD && (
        <Box
          className="sa-mobile-page-toolbar"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 1.5,
            mb: 2,
            flexWrap: "wrap",
          }}
        >
          {isPublished && endDate ? (
            <Typography
              variant="caption"
              sx={{
                flex: 1,
                minWidth: 0,
                color: colors.semantic.warning,
                fontWeight: 600,
                fontSize: "0.75rem",
                lineHeight: 1.4,
              }}
            >
              {t("selfAssessment.endDateWarning", { date: endDate })}
            </Typography>
          ) : (
            <Box sx={{ flex: 1 }} />
          )}
          <ToggleButtonGroup
            value={currentLanguage}
            exclusive
            onChange={(e, newLanguage) => {
              if (newLanguage !== null) {
                setCurrentLanguage(newLanguage);
                i18n.changeLanguage(newLanguage);
              }
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
                borderColor: colors.primary.blue + "40",
                color: colors.text.secondary,
                "&.Mui-selected": {
                  bgcolor: colors.primary.blue,
                  color: "white",
                },
              },
            }}
          >
            <ToggleButton value="gu">ગુ</ToggleButton>
            <ToggleButton value="en">EN</ToggleButton>
            <ToggleButton value="hi">हिं</ToggleButton>
          </ToggleButtonGroup>
        </Box>
      )}

      {matchDownMD && isErrorDomains && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {t("schoolVerification.failedToLoadDomains")}
        </Alert>
      )}

      {showMobileNavigation && (
        <Box sx={{ mb: 2 }}>
          <AssessmentOverallProgress
            t={t}
            assessmentProgress={assessmentProgress}
            getProgressColor={getProgressColor}
            compact
          />
        </Box>
      )}

      {showMobileNavigation && (
        <SelfAssessmentMobileStepper
          activeStep={mobileStep}
          onStepChange={handleMobileStepChange}
          onBack={handleMobileStepBack}
          t={t}
          selectedDomain={selectedDomain}
          selectedSubdomain={selectedSubdomain}
          getDomainName={getDomainName}
          getSubdomainName={getSubdomainName}
        />
      )}

      {/* School Details Card */}
      {(schoolFromState || schoolData) && (
        <Paper
          elevation={1}
          sx={{
            p: 2.5,
            mb: 3,
            borderRadius: 2,
            bgcolor: colors.background.secondary,
            border: `1px solid ${colors.neutral.gray200}`,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexWrap: "wrap",
            }}
          >
            <SchoolIcon
              sx={{
                fontSize: 32,
                color: colors.primary.blue,
              }}
            />
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 700,
                  color: colors.text.primary,
                  mb: 0.5,
                }}
              >
                {schoolFromState?.schoolName ||
                  schoolData?.schoolName ||
                  t("schoolVerification.schoolNameFallback")}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  gap: 2,
                  flexWrap: "wrap",
                  mt: 1,
                }}
              >
                <Typography
                  variant="body2"
                  sx={{
                    color: colors.text.secondary,
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <strong>{t("schoolVerification.schoolId")}:</strong>{" "}
                  {schoolId || schoolFromState?.schoolId || t("common.na")}
                </Typography>
                {schoolFromState?.schoolCode && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: colors.text.secondary,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <strong>{t("schoolVerification.schoolCode")}:</strong>{" "}
                    {schoolFromState.schoolCode}
                  </Typography>
                )}
                {schoolData?.districtName && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: colors.text.secondary,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <strong>{t("schoolVerification.district")}:</strong>{" "}
                    {schoolData.districtName}
                  </Typography>
                )}
                {schoolData?.blockName && (
                  <Typography
                    variant="body2"
                    sx={{
                      color: colors.text.secondary,
                      display: "flex",
                      alignItems: "center",
                      gap: 0.5,
                    }}
                  >
                    <strong>{t("schoolVerification.block")}:</strong>{" "}
                    {schoolData.blockName}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        </Paper>
      )}

      {/* Main Content - Split Layout */}
      <Box
        sx={{
          display: "flex",
          flexDirection: { xs: "column", md: "row" },
          gap: { xs: 2, md: 3 },
          minHeight: { xs: "auto", md: "calc(100vh - 300px)" },
        }}
      >
        {/* Left Panel - Domains and Subdomains */}
        <Box
          className="sa-left-panel-shell"
          sx={{
            width: { xs: "100%", md: "380px" },
            minWidth: { xs: 0, md: "380px" },
            maxWidth: { xs: "100%", md: "380px" },
            flexShrink: { md: 0 },
            display: {
              xs: showMobileNavPanel ? "block" : "none",
              md: "block",
            },
          }}
        >
        <Paper
          elevation={2}
          className="sa-domains-panel"
          sx={{
            width: { xs: "100%", md: "380px" },
            minWidth: { xs: 0, md: "380px" },
            borderRadius: 3,
            bgcolor: "white",
            display: "flex",
            flexDirection: "column",
            maxHeight: { xs: "none", md: "calc(100vh - 300px)" },
            overflow: "hidden",
            boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          }}
        >
          {/* Left Panel Header */}
          <Box
            className="sa-panel-header"
            sx={{
              p: { xs: 2.5, md: 3 },
              borderBottom: `2px solid ${colors.neutral.gray200}`,
              bgcolor: colors.background.secondary,
            }}
          >
            <Typography
              variant="h6"
              sx={{
                fontWeight: 700,
                color: colors.text.primary,
                mb: 0.5,
              }}
            >
              {showMobileSubdomainsPanel
                ? t("selfAssessment.mobileStep.subdomains")
                : t("selfAssessment.assessmentDomains")}
            </Typography>
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ fontSize: "0.8125rem" }}
            >
              {showMobileSubdomainsPanel && selectedDomain
                ? getDomainName(selectedDomain)
                : t("selfAssessment.navigateSubtitle")}
            </Typography>
            <AssessmentChipSelector
              assessments={assessments}
              selectedAssessmentId={selectedAssessment?.assessmentId}
              label={t("selfAssessment.selectAssessment")}
              onSelect={handleAssessmentSelect}
              getAssessmentLabel={(assessment) =>
                assessment.assessmentName ||
                t("selfAssessment.assessmentNameFallback", {
                  id: assessment.assessmentId,
                })
              }
            />
          </Box>

          {/* Domains/Subdomains List */}
          <Box
            className="sa-nav-list"
            sx={{
              flex: 1,
              overflowY: "auto",
              p: { xs: 2.5, md: 2.5 },
            }}
          >
            {showMobileSubdomainsPanel ? (
              selectedDomain?.subDomain?.length > 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: { xs: 2, md: 1.5 },
                  }}
                >
                  {selectedDomain.subDomain.map((subdomain, subdomainIndex) => {
                    const subdomainId =
                      subdomain.subDomainId || subdomain.id;
                    const subdomainProgress = getSubdomainProgress(subdomain);
                    const isSubdomainSelected =
                      selectedSubdomain?.subDomainId === subdomainId;
                    const domainIdx = domains.findIndex(
                      (d) => d.domainId === selectedDomain.domainId,
                    );
                    const subdomainNumber = `${domainIdx + 1}.${subdomainIndex + 1}`;

                    return (
                      <Card
                        key={subdomainId}
                        className="sa-nav-card"
                        onClick={() => handleMobileSubdomainSelect(subdomain)}
                        sx={{
                          cursor: "pointer",
                          transition: "all 0.3s ease",
                          border: isSubdomainSelected
                            ? "2px solid"
                            : "1.5px solid",
                          borderColor: isSubdomainSelected
                            ? colors.primary.blue
                            : "transparent",
                          borderRadius: 2,
                          bgcolor: isSubdomainSelected
                            ? colors.primary.blue + "15"
                            : colors.background.primary,
                          boxShadow: isSubdomainSelected
                            ? `0 4px 12px ${colors.primary.blue}30`
                            : "0 2px 8px rgba(0,0,0,0.04)",
                          "&:hover": {
                            borderColor: colors.primary.blue,
                            bgcolor: colors.primary.blue + "08",
                          },
                        }}
                      >
                        <CardContent
                          sx={{
                            p: { xs: 2.5, md: 2 },
                            "&:last-child": { pb: { xs: 2.5, md: 2 } },
                          }}
                        >
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: 600,
                              color: isSubdomainSelected
                                ? colors.primary.blue
                                : colors.text.primary,
                              fontSize: "0.875rem",
                              mb: 1,
                            }}
                          >
                            {getSubdomainName(subdomain)}
                          </Typography>
                          <AssessmentNavProgressBar
                            progress={subdomainProgress}
                            getProgressColor={getProgressColor}
                            label={t("selfAssessment.progress")}
                            mobile
                          />
                        </CardContent>
                      </Card>
                    );
                  })}
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
                  gap: 1.5,
                }}
              >
                {domains.map((domain, domainIndex) => {
                  const progress = getDomainProgress(domain);
                  const isDomainSelected =
                    selectedDomain?.domainId === domain.domainId;
                  const DomainIcon = getDomainIcon(domain);
                  const domainNumber = domainIndex + 1;

                  return (
                    <Box key={domain.domainId}>
                      <Card
                        className="sa-nav-card"
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
                            ? colors.primary.blue
                            : "transparent",
                          borderRadius: 2,
                          bgcolor: isDomainSelected
                            ? colors.primary.blue + "08"
                            : colors.background.primary,
                          boxShadow: isDomainSelected
                            ? `0 4px 12px ${colors.primary.blue}15`
                            : "0 2px 8px rgba(0,0,0,0.04)",
                          "&:hover": {
                            transform: "translateX(4px)",
                            boxShadow: `0 6px 16px ${colors.primary.blue}25`,
                            borderColor: colors.primary.blue,
                          },
                        }}
                      >
                        <CardContent sx={{ p: 2, "&:last-child": { pb: 2 } }}>
                          <Box
                            sx={{
                              display: "flex",
                              alignItems: "center",
                              gap: 1.5,
                              mb: 1.5,
                            }}
                          >
                            <Box
                              sx={{
                                width: 36,
                                height: 36,
                                borderRadius: 1.5,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                flexShrink: 0,
                                color: isDomainSelected
                                  ? colors.primary.blue
                                  : colors.text.secondary,
                              }}
                            >
                              {React.cloneElement(DomainIcon, {
                                sx: { fontSize: 24 },
                              })}
                            </Box>
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                              <Typography
                                variant="body1"
                                sx={{
                                  fontWeight: 600,
                                  color: isDomainSelected
                                    ? colors.primary.blue
                                    : colors.text.primary,
                                  fontSize: "0.9375rem",
                                  mb: 0.25,
                                }}
                              >
                                {getDomainName(domain)}
                              </Typography>
                            </Box>
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
                          <Box sx={{ mt: 1 }}>
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
                                Progress
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
                              ml: 2,
                              pl: 2,
                              borderLeft: `2px solid ${colors.neutral.gray200}`,
                            }}
                          >
                            {domain.subDomain.map((subdomain, index) => {
                              const subdomainId =
                                subdomain.subDomainId || subdomain.id;
                              const subdomainProgress =
                                getSubdomainProgress(subdomain);
                              const isSubdomainSelected =
                                selectedSubdomain?.subDomainId === subdomainId;
                              const subdomainNumber = `${domainNumber}.${
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
                                    mb: 1,
                                    transition: "all 0.3s ease",
                                    border: "1px solid",
                                    borderColor: isSubdomainSelected
                                      ? colors.primary.blue
                                      : colors.neutral.gray200,
                                    borderRadius: 1.5,
                                    bgcolor: isSubdomainSelected
                                      ? colors.primary.blue + "05"
                                      : "white",
                                    boxShadow: isSubdomainSelected
                                      ? `0 2px 8px ${colors.primary.blue}10`
                                      : "none",
                                    "&:hover": {
                                      borderColor: colors.primary.blue,
                                      bgcolor: colors.primary.blue + "05",
                                    },
                                  }}
                                >
                                  <CardContent
                                    sx={{ p: 1.2, "&:last-child": { pb: 1.2 } }}
                                  >
                                    <Box
                                      sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 1,
                                        mb: 0.8,
                                      }}
                                    >
                                      <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            fontWeight: 600,
                                            color: isSubdomainSelected
                                              ? colors.accent.green
                                              : colors.text.primary,
                                            fontSize: "0.75rem",
                                            lineHeight: 1.3,
                                          }}
                                        >
                                          {getSubdomainName(subdomain)}
                                        </Typography>
                                      </Box>
                                      {isSubdomainSelected &&
                                        subdomainProgress === 100 && (
                                          <CheckCircle
                                            sx={{
                                              color: colors.accent.green,
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
                                          justifyContent: "space-between",
                                          mb: 0.3,
                                        }}
                                      >
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            fontSize: "0.625rem",
                                            color: colors.text.secondary,
                                            fontWeight: 500,
                                          }}
                                        >
                                          Progress
                                        </Typography>
                                        <Typography
                                          variant="caption"
                                          sx={{
                                            fontSize: "0.625rem",
                                            color:
                                              getProgressColor(
                                                subdomainProgress
                                              ),
                                            fontWeight: 600,
                                          }}
                                        >
                                          {Math.round(subdomainProgress)}%
                                        </Typography>
                                      </Box>
                                      <LinearProgress
                                        variant="determinate"
                                        value={subdomainProgress}
                                        sx={{
                                          height: 4,
                                          borderRadius: 2,
                                          bgcolor: colors.neutral.gray200,
                                          "& .MuiLinearProgress-bar": {
                                            borderRadius: 2,
                                            bgcolor:
                                              getProgressColor(
                                                subdomainProgress
                                              ),
                                          },
                                        }}
                                      />
                                    </Box>
                                  </CardContent>
                                </Card>
                              );
                            })}
                          </Box>
                        )}
                    </Box>
                  );
                })}
              </Box>
            ) : (
              <Box sx={{ textAlign: "center", py: 4 }}>
                <Typography variant="body2" color="text.secondary">
                  No domains available
                </Typography>
              </Box>
            )}
          </Box>

          {/* Final Submit Button */}
          {isPublished && !isSubmitted && (
            <Box
              sx={{
                p: 2.5,
                borderTop: `2px solid ${colors.neutral.gray200}`,
                bgcolor: colors.background.secondary,
              }}
            >
              <Button
                variant="contained"
                fullWidth
                onClick={handleOpenSubmitConfirmation}
                disabled={
                  submitAssessmentMutation.isPending || !allDomainsComplete
                }
                title={
                  !allDomainsComplete
                    ? "Please complete all domains (100%) before submitting"
                    : "Submit your assessment"
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
                {submitAssessmentMutation.isPending
                  ? "Submitting..."
                  : !allDomainsComplete
                  ? "Final Submit"
                  : "Submit Assessment"}
              </Button>
            </Box>
          )}
        </Paper>
        </Box>

        {/* Right Panel - Questions or Domain Overview */}
        {showMobileQuestionsPanel && (
          <Paper
            elevation={2}
            sx={{
              flex: 1,
              borderRadius: 3,
              bgcolor: "white",
              display: "flex",
              flexDirection: "column",
              maxHeight: "calc(100vh - 300px)",
              overflow: "hidden",
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            }}
          >
            <>
              {/* Questions Header */}
              <Box
                sx={{
                  p: 3,
                  borderBottom: `2px solid ${colors.neutral.gray200}`,
                  bgcolor: colors.background.secondary,
                }}
              >
                {/* Breadcrumb */}
                <Typography
                  variant="caption"
                  sx={{
                    color: colors.text.secondary,
                    fontSize: "0.75rem",
                    mb: 1.5,
                    display: "block",
                  }}
                >
                  {selectedDomain && selectedSubdomain
                    ? `${getDomainName(selectedDomain)} / ${getSubdomainName(selectedSubdomain)}`
                    : ""}
                </Typography>

                <Box
                  sx={{
                    display: "flex",
                    alignItems: { xs: "stretch", sm: "flex-start" },
                    justifyContent: "space-between",
                    gap: { xs: 1, sm: 2 },
                    mb: 2,
                    flexDirection: { xs: "column", sm: "row" },
                  }}
                >
                  <Box sx={{ minWidth: 0, flex: 1 }}>
                    <Typography
                      variant="h5"
                      sx={{
                        fontWeight: 700,
                        color: colors.text.primary,
                        mb: 0.5,
                      }}
                    >
                      {getSubdomainName(selectedSubdomain)}
                    </Typography>
                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{ fontSize: "0.875rem" }}
                    >
                      Assessment of{" "}
                      {getSubdomainName(selectedSubdomain).toLowerCase()}
                    </Typography>
                  </Box>
                  <VerifierSubdomainConsistencyPanel
                    subDomainId={
                      selectedSubdomain?.subDomainId || selectedSubdomain?.id
                    }
                    schoolId={schoolId}
                    assessmentId={
                      selectedAssessment?.assessmentId ?? selectedAssessmentId ?? null
                    }
                    selectedAssessment={selectedAssessment}
                    selectedSubdomain={selectedSubdomain}
                    selectedDomain={selectedDomain}
                    languageCode={languageCode}
                    readOnly={isSubmitted === 1 || isSubmitted === true}
                  />
                </Box>
              </Box>

              {/* Questions Content */}
              <Box
                sx={{
                  flex: 1,
                  overflowY: "auto",
                  p: { xs: 2.5, md: 3.5 },
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
                      There are no questions available for this subdomain yet.
                      Please contact your administrator to add questions.
                    </Typography>
                  </Box>
                )}

                {/* Question Type Tabs */}
                {!isLoadingQuestions &&
                  allQuestions.length > 0 &&
                  questionTabs.length > 0 && (
                    <Box sx={{ mb: 3 }}>
                      <Tabs
                        value={selectedQuestionTab}
                        onChange={(e, newValue) => {
                          // Reset class group, class, section, and subject when changing question type tab
                          setSelectedClassGroup(null);
                          setSelectedClass(null);
                          setSelectedSection(null);
                          setSelectedSubject(null);
                          // Clear MCQ/option answers only; keep textAnswers so FLN prefilled data persists when switching to FLN tab
                          setAnswers({});
                          setSelectedQuestionTab(newValue);
                        }}
                        variant="scrollable"
                        scrollButtons="auto"
                        sx={{
                          borderBottom: 2,
                          borderColor: colors.neutral.gray200,
                          "& .MuiTabs-indicator": {
                            height: 3,
                            borderRadius: "3px 3px 0 0",
                          },
                          "& .MuiTab-root": {
                            textTransform: "none",
                            fontWeight: 600,
                            fontSize: "0.875rem",
                            minHeight: 48,
                            px: 2,
                            "&.Mui-selected": {
                              color: currentTab?.color || colors.primary.blue,
                            },
                          },
                        }}
                      >
                        {questionTabs.map((tab, index) => {
                          return (
                            <Tab
                              key={tab.id}
                              label={
                                <Box
                                  sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: 1,
                                  }}
                                >
                                  {tab.icon}
                                  <Typography
                                    sx={{
                                      fontWeight: 600,
                                      fontSize: "0.875rem",
                                    }}
                                  >
                                    {tab.label}
                                  </Typography>
                                </Box>
                              }
                              sx={{
                                color: colors.text.secondary,
                                "&.Mui-selected": {
                                  color: tab.color,
                                },
                              }}
                            />
                          );
                        })}
                      </Tabs>
                    </Box>
                  )}

                {/* Questions Content Based on Selected Tab */}
                {!isLoadingQuestions &&
                  allQuestions.length > 0 &&
                  currentTab && (
                    <Box>
                      {/* Classroom Observation Questions Section (Type 2) */}
                      {currentTab.id === "classroom" && (
                        <Box sx={{ mb: 4 }}>
                          {/* Section Header */}
                          <Box
                            sx={{
                              mb: 3,
                              pb: 2,
                              borderBottom: `2px solid ${colors.neutral.gray200}`,
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
                              <Class
                                sx={{
                                  fontSize: 24,
                                  color: colors.primary.blue,
                                }}
                              />
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 700,
                                  color: colors.text.primary,
                                }}
                              >
                                {t("selfAssessment.sections.classroomTitle")}
                              </Typography>
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{
                                color: colors.text.secondary,
                                fontSize: "0.875rem",
                              }}
                            >
                              {t("selfAssessment.sections.classroomDescription")}
                            </Typography>
                          </Box>

                          {/* Class and Section Dropdowns */}
                          <Box
                            sx={{
                              mb: 3,
                              p: 2.5,
                              borderRadius: 2,
                              bgcolor: colors.background.secondary,
                              border: `1.5px solid ${colors.neutral.gray200}`,
                            }}
                          >
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: 600,
                                color: colors.text.primary,
                                mb: 2,
                              }}
                            >
                              Select Class Group, Class and Section
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                gap: 2,
                                flexWrap: "wrap",
                              }}
                            >
                              {/* Class Group Dropdown */}
                              <FormControl
                                size="small"
                                sx={{
                                  minWidth: { xs: "100%", sm: "150px" },
                                }}
                              >
                                <InputLabel
                                  sx={{
                                    fontWeight: 600,
                                    color: colors.text.secondary,
                                  }}
                                >
                                  Class Group
                                </InputLabel>
                                <Select
                                  value={selectedClassGroup || ""}
                                  onChange={(e) => {
                                    // Clear all answers and selections when class group changes
                                    setAnswers({});
                                    setTextAnswers({});
                                    setSelectedClass(null);
                                    setSelectedSection(null);
                                    setSelectedSubject(null);
                                    setSelectedClassGroup(e.target.value);
                                  }}
                                  label="Class Group"
                                  sx={{
                                    borderRadius: 2,
                                    bgcolor: "white",
                                    "& .MuiOutlinedInput-notchedOutline": {
                                      borderColor: colors.neutral.gray300,
                                    },
                                    "&:hover .MuiOutlinedInput-notchedOutline":
                                      {
                                        borderColor: colors.primary.blue,
                                      },
                                    "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                                      {
                                        borderColor: colors.primary.blue,
                                        borderWidth: 2,
                                      },
                                  }}
                                >
                                  {["1-2", "3-5", "6-8"]
                                    .filter((groupRange) => {
                                      // Filter out groups with grey/null flags
                                      const flag = getGroupFlagColor(2, groupRange);
                                      return flag !== null && flag !== undefined;
                                    })
                                    .map((groupRange) => {
                                      const flag = getGroupFlagColor(2, groupRange);
                                      const flagColor = flag ? getFlagColorValue(flag) : null;
                                      const displayRange = groupRange === "3-5" ? "3-5" : groupRange;
                                      
                                      return (
                                        <MenuItem key={groupRange} value={groupRange}>
                                          <Box
                                            sx={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 1,
                                            }}
                                          >
                                            {flagColor && (
                                              <Box
                                                sx={{
                                                  width: 10,
                                                  height: 10,
                                                  borderRadius: "50%",
                                                  bgcolor: flagColor,
                                                  flexShrink: 0,
                                                }}
                                              />
                                            )}
                                            <Typography>Class {displayRange}</Typography>
                                          </Box>
                                        </MenuItem>
                                      );
                                    })}
                                </Select>
                              </FormControl>

                              {/* Class Dropdown */}
                              <FormControl
                                size="small"
                                sx={{
                                  minWidth: { xs: "100%", sm: "200px" },
                                }}
                              >
                                <InputLabel
                                  sx={{
                                    fontWeight: 600,
                                    color: colors.text.secondary,
                                  }}
                                >
                                  Select Class
                                </InputLabel>
                                <Select
                                  value={selectedClass || ""}
                                  onChange={(e) => {
                                    // Save current answers before changing class
                                    if (selectedSubdomain && selectedClass) {
                                      const subdomainId =
                                        selectedSubdomain.subDomainId ||
                                        selectedSubdomain.id;
                                      const classKey = String(selectedClass);
                                      const storageKey = `${subdomainId}_${classKey}`;
                                      setClassWiseAnswers((prev) => ({
                                        ...prev,
                                        [storageKey]: { ...answers },
                                      }));
                                      setClassWiseTextAnswers((prev) => ({
                                        ...prev,
                                        [storageKey]: { ...textAnswers },
                                      }));
                                    }
                                    // Clear answers, section, and subject immediately
                                    setAnswers({});
                                    setTextAnswers({});
                                    setSelectedSection(null);
                                    setSelectedSubject(null);
                                    setSelectedClass(e.target.value);
                                  }}
                                  label="Select Class"
                                  disabled={
                                    isLoadingSchoolData ||
                                    filteredClassOptions.length === 0
                                  }
                                  sx={{
                                    borderRadius: 2,
                                    bgcolor: "white",
                                    "& .MuiOutlinedInput-notchedOutline": {
                                      borderColor: colors.neutral.gray300,
                                    },
                                    "&:hover .MuiOutlinedInput-notchedOutline":
                                      {
                                        borderColor: colors.primary.blue,
                                      },
                                    "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                                      {
                                        borderColor: colors.primary.blue,
                                        borderWidth: 2,
                                      },
                                  }}
                                >
                                  {isLoadingSchoolData ? (
                                    <MenuItem disabled>
                                      Loading classes...
                                    </MenuItem>
                                  ) : filteredClassOptions.length === 0 ? (
                                    <MenuItem disabled>
                                      {selectedClassGroup
                                        ? `No classes available in ${selectedClassGroup} range`
                                        : "Please select a class group first"}
                                    </MenuItem>
                                  ) : (
                                    filteredClassOptions.map((classNum) => (
                                      <MenuItem key={classNum} value={classNum}>
                                        Class {classNum}
                                      </MenuItem>
                                    ))
                                  )}
                                </Select>
                              </FormControl>

                              {/* Section Dropdown */}
                              <FormControl
                                size="small"
                                sx={{
                                  minWidth: { xs: "100%", sm: "200px" },
                                }}
                              >
                                <InputLabel
                                  sx={{
                                    fontWeight: 600,
                                    color: colors.text.secondary,
                                  }}
                                >
                                  Select Section
                                </InputLabel>
                                <Select
                                  value={selectedSection || ""}
                                  onChange={(e) => {
                                    // Clear answers and subject before changing section
                                    setAnswers({});
                                    setTextAnswers({});
                                    setSelectedSubject(null);
                                    setSelectedSection(e.target.value);
                                  }}
                                  label="Select Section"
                                  disabled={
                                    !selectedClass || sections.length === 0
                                  }
                                  sx={{
                                    borderRadius: 2,
                                    bgcolor: "white",
                                    "& .MuiOutlinedInput-notchedOutline": {
                                      borderColor: colors.neutral.gray300,
                                    },
                                    "&:hover .MuiOutlinedInput-notchedOutline":
                                      {
                                        borderColor: colors.primary.blue,
                                      },
                                    "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                                      {
                                        borderColor: colors.primary.blue,
                                        borderWidth: 2,
                                      },
                                  }}
                                >
                                  {!selectedClass ? (
                                    <MenuItem disabled>
                                      Please select a class first
                                    </MenuItem>
                                  ) : sections.length === 0 ? (
                                    <MenuItem disabled>
                                      No sections available for this class
                                    </MenuItem>
                                  ) : (
                                    sections.map((section, index) => (
                                      <MenuItem
                                        key={section.id || index}
                                        value={
                                          section.sectionName ||
                                          section.name ||
                                          section.value
                                        }
                                      >
                                        Section{" "}
                                        {section.sectionName ||
                                          section.name ||
                                          section.value}
                                      </MenuItem>
                                    ))
                                  )}
                                </Select>
                              </FormControl>
                            </Box>
                          </Box>

                          {/* Classroom Observation Questions List */}
                          {isLoadingQuestions ? (
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                minHeight: "200px",
                              }}
                            >
                              <CircularProgress />
                            </Box>
                          ) : isErrorQuestions ? (
                            <Alert severity="error">
                              {isErrorQuestions?.message ||
                                t("selfAssessment.failedToLoadQuestions")}
                            </Alert>
                          ) : (
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 2.5,
                              }}
                            >
                              {classroomObservationQuestions.map(
                                (question, index) => {
                                  const options = parseOptions(
                                    question.options
                                  );
                                  const userSelectedAnswer =
                                    answers[question.questionId];
                                  const apiSelectedAnswer =
                                    shouldShowApiAnswer(question) &&
                                    question.selectedOptionId
                                      ? String(question.selectedOptionId)
                                      : null;
                                  const selectedAnswer =
                                    userSelectedAnswer || apiSelectedAnswer;
                                  const isExpanded =
                                    expandedQuestions[question.questionId] ??
                                    true;
                                  const questionNumber = `${domainNumber}.${subdomainNumber}.${
                                    index + 1
                                  }`;

                                  return (
                                    <Card
                                      key={question.questionId}
                                      sx={{
                                        borderRadius: 2,
                                        border: "1px solid",
                                        borderColor: colors.neutral.gray200,
                                        transition: "all 0.2s ease",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                                        overflow: "hidden",
                                        "&:hover": {
                                          boxShadow:
                                            "0 4px 12px rgba(0,0,0,0.1)",
                                        },
                                      }}
                                    >
                                      {/* Question Header - Always Visible */}
                                      <Box
                                        onClick={() =>
                                          toggleQuestionExpansion(
                                            question.questionId
                                          )
                                        }
                                        sx={{
                                          p: 2.5,
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 2,
                                          bgcolor: colors.background.primary,
                                          borderBottom: isExpanded
                                            ? `1px solid ${colors.neutral.gray200}`
                                            : "none",
                                          "&:hover": {
                                            bgcolor:
                                              colors.background.secondary,
                                          },
                                        }}
                                      >
                                        <Chip
                                          label={t("selfAssessment.criterionLabel")}
                                          size="small"
                                          sx={{
                                            bgcolor: colors.neutral.gray800,
                                            color: "white",
                                            fontWeight: 700,
                                            minWidth: "100px",
                                            height: "28px",
                                            fontSize: "0.75rem",
                                          }}
                                        />
                                        <Box sx={{ flex: 1 }}>
                                          <Typography
                                            variant="body2"
                                            sx={{
                                              fontWeight: 700,
                                              fontSize: "1rem",
                                              color: colors.text.primary,
                                              lineHeight: 1.5,
                                            }}
                                          >
                                            {getQuestionText(question)}
                                          </Typography>
                                        </Box>
                                        <IconButton
                                          size="small"
                                          sx={{
                                            color: colors.text.secondary,
                                          }}
                                        >
                                          {isExpanded ? (
                                            <ExpandLess />
                                          ) : (
                                            <ExpandMore />
                                          )}
                                        </IconButton>
                                      </Box>

                                      {/* Question Content - Expandable */}
                                      {isExpanded && (
                                        <CardContent sx={{ p: 3, pt: 2.5 }}>
                                          {question.isClassroomObservation ===
                                            1 &&
                                            question.observationCount && (
                                              <Chip
                                                label={`Observation Count: ${question.observationCount}`}
                                                size="small"
                                                sx={{
                                                  bgcolor:
                                                    colors.semantic.warning +
                                                    "20",
                                                  color:
                                                    colors.semantic.warning,
                                                  fontWeight: 600,
                                                  fontSize: "0.75rem",
                                                  mb: 2.5,
                                                }}
                                              />
                                            )}

                                          {options && options.length > 0 && (
                                            <FormControl
                                              component="fieldset"
                                              fullWidth
                                              sx={{ mb: 3 }}
                                            >
                                              <RadioGroup
                                                value={selectedAnswer || ""}
                                                onChange={(e) =>
                                                  handleAnswerChange(
                                                    question.questionId,
                                                    e.target.value
                                                  )
                                                }
                                              >
                                                {options.map(
                                                  (option, optIndex) => (
                                                    <FormControlLabel
                                                      key={
                                                        option.optionId ||
                                                        optIndex
                                                      }
                                                      value={String(
                                                        option.optionId
                                                      )}
                                                      control={
                                                        <Radio
                                                          disabled={
                                                            !isPublished ||
                                                            isSubmitted
                                                          }
                                                          sx={{
                                                            color:
                                                              colors.primary
                                                                .blue,
                                                            "&.Mui-checked": {
                                                              color:
                                                                colors.primary
                                                                  .blue,
                                                            },
                                                          }}
                                                        />
                                                      }
                                                      label={renderOptionLabel(
                                                        option,
                                                        optIndex,
                                                        selectedAnswer === String(option.optionId)
                                                      )}
                                                      sx={{
                                                        mb: 1.5,
                                                        p: 2,
                                                        borderRadius: 2,
                                                        bgcolor:
                                                          selectedAnswer ===
                                                          String(
                                                            option.optionId
                                                          )
                                                            ? colors.primary
                                                                .lightest
                                                            : "transparent",
                                                        border: "1.5px solid",
                                                        borderColor:
                                                          selectedAnswer ===
                                                          String(
                                                            option.optionId
                                                          )
                                                            ? colors.primary
                                                                .blue
                                                            : colors.neutral
                                                                .gray200,
                                                        transition:
                                                          "all 0.2s ease",
                                                        "&:hover": {
                                                          bgcolor:
                                                            colors.primary
                                                              .lightest + "80",
                                                          borderColor:
                                                            colors.primary.blue,
                                                        },
                                                      }}
                                                    />
                                                  )
                                                )}
                                              </RadioGroup>
                                            </FormControl>
                                          )}

                                          <SubdomainEvidencePanel
                                            questionId={question.questionId}
                                            question={question}
                                            schoolId={schoolId}
                                            assessmentId={
                                              selectedAssessment?.assessmentId ??
                                              selectedAssessmentId ??
                                              null
                                            }
                                            selectedAssessment={selectedAssessment}
                                            readOnly={
                                              isSubmitted === 1 || isSubmitted === true
                                            }
                                            evidenceOptional={isEvidenceOptionalForSelectedOption(
                                              question,
                                              selectedAnswer,
                                              parseOptions,
                                            )}
                                            variant="question"
                                            className="verifier-subdomain-evidence"
                                            languageCode={(languageCode || "EN").toLowerCase()}
                                          />
                                        </CardContent>
                                      )}
                                    </Card>
                                  );
                                }
                              )}
                            </Box>
                          )}
                        </Box>
                      )}

                      {/* Subject-Wise Observation Questions Section (Type 3) */}
                      {currentTab.id === "subject" && (
                        <Box sx={{ mb: 4 }}>
                          {/* Section Header */}
                          <Box
                            sx={{
                              mb: 3,
                              pb: 2,
                              borderBottom: `2px solid ${colors.neutral.gray200}`,
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
                              <MenuBook
                                sx={{
                                  fontSize: 24,
                                  color: colors.accent.purple,
                                }}
                              />
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 700,
                                  color: colors.text.primary,
                                }}
                              >
                                {t("selfAssessment.sections.subjectTitle")}
                              </Typography>
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{
                                color: colors.text.secondary,
                                fontSize: "0.875rem",
                              }}
                            >
                              {t("selfAssessment.sections.subjectDescription")}
                            </Typography>
                          </Box>

                          {/* Class, Section, and Subject Dropdowns */}
                          <Box
                            sx={{
                              mb: 3,
                              p: 2.5,
                              borderRadius: 2,
                              bgcolor: colors.background.secondary,
                              border: `1.5px solid ${colors.neutral.gray200}`,
                            }}
                          >
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: 600,
                                color: colors.text.primary,
                                mb: 2,
                              }}
                            >
                              Select Class Group, Class, Section, and Subject
                            </Typography>
                            <Box
                              sx={{
                                display: "flex",
                                gap: 2,
                                flexWrap: "wrap",
                              }}
                            >
                              {/* Class Group Dropdown */}
                              <FormControl
                                size="small"
                                sx={{
                                  minWidth: { xs: "100%", sm: "150px" },
                                }}
                              >
                                <InputLabel
                                  sx={{
                                    fontWeight: 600,
                                    color: colors.text.secondary,
                                  }}
                                >
                                  Class Group
                                </InputLabel>
                                <Select
                                  value={selectedClassGroup || ""}
                                  onChange={(e) => {
                                    // Clear all answers and selections when class group changes
                                    setAnswers({});
                                    setTextAnswers({});
                                    setSelectedClass(null);
                                    setSelectedSection(null);
                                    setSelectedSubject(null);
                                    setSelectedClassGroup(e.target.value);
                                  }}
                                  label="Class Group"
                                  sx={{
                                    borderRadius: 2,
                                    bgcolor: "white",
                                    "& .MuiOutlinedInput-notchedOutline": {
                                      borderColor: colors.neutral.gray300,
                                    },
                                    "&:hover .MuiOutlinedInput-notchedOutline":
                                      {
                                        borderColor: colors.accent.purple,
                                      },
                                    "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                                      {
                                        borderColor: colors.accent.purple,
                                        borderWidth: 2,
                                      },
                                  }}
                                >
                                  {["1-2", "3-5", "6-8"]
                                    .filter((groupRange) => {
                                      // Filter out groups with grey/null flags
                                      const flag = getGroupFlagColor(3, groupRange);
                                      return flag !== null && flag !== undefined;
                                    })
                                    .map((groupRange) => {
                                      const flag = getGroupFlagColor(3, groupRange);
                                      const flagColor = flag ? getFlagColorValue(flag) : null;
                                      const displayRange = groupRange === "3-5" ? "3-5" : groupRange;
                                      
                                      return (
                                        <MenuItem key={groupRange} value={groupRange}>
                                          <Box
                                            sx={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: 1,
                                            }}
                                          >
                                            {flagColor && (
                                              <Box
                                                sx={{
                                                  width: 10,
                                                  height: 10,
                                                  borderRadius: "50%",
                                                  bgcolor: flagColor,
                                                  flexShrink: 0,
                                                }}
                                              />
                                            )}
                                            <Typography>Class {displayRange}</Typography>
                                          </Box>
                                        </MenuItem>
                                      );
                                    })}
                                </Select>
                              </FormControl>

                              {/* Class Dropdown */}
                              <FormControl
                                size="small"
                                sx={{
                                  minWidth: { xs: "100%", sm: "180px" },
                                }}
                              >
                                <InputLabel
                                  sx={{
                                    fontWeight: 600,
                                    color: colors.text.secondary,
                                  }}
                                >
                                  Select Class
                                </InputLabel>
                                <Select
                                  value={selectedClass || ""}
                                  onChange={(e) => {
                                    // Save current answers before changing class
                                    if (selectedSubdomain && selectedClass) {
                                      const subdomainId =
                                        selectedSubdomain.subDomainId ||
                                        selectedSubdomain.id;
                                      const classKey = String(selectedClass);
                                      const storageKey = `${subdomainId}_${classKey}`;
                                      setClassWiseAnswers((prev) => ({
                                        ...prev,
                                        [storageKey]: { ...answers },
                                      }));
                                      setClassWiseTextAnswers((prev) => ({
                                        ...prev,
                                        [storageKey]: { ...textAnswers },
                                      }));
                                    }
                                    // Clear answers, section, and subject immediately
                                    setAnswers({});
                                    setTextAnswers({});
                                    setSelectedSection(null);
                                    setSelectedSubject(null);
                                    setSelectedClass(e.target.value);
                                  }}
                                  label="Select Class"
                                  disabled={
                                    isLoadingSchoolData ||
                                    filteredClassOptions.length === 0
                                  }
                                  sx={{
                                    borderRadius: 2,
                                    bgcolor: "white",
                                    "& .MuiOutlinedInput-notchedOutline": {
                                      borderColor: colors.neutral.gray300,
                                    },
                                    "&:hover .MuiOutlinedInput-notchedOutline":
                                      {
                                        borderColor: colors.accent.purple,
                                      },
                                    "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                                      {
                                        borderColor: colors.accent.purple,
                                        borderWidth: 2,
                                      },
                                  }}
                                >
                                  {isLoadingSchoolData ? (
                                    <MenuItem disabled>
                                      Loading classes...
                                    </MenuItem>
                                  ) : filteredClassOptions.length === 0 ? (
                                    <MenuItem disabled>
                                      {selectedClassGroup
                                        ? `No classes available in ${selectedClassGroup} range`
                                        : "Please select a class group first"}
                                    </MenuItem>
                                  ) : (
                                    filteredClassOptions.map((classNum) => (
                                      <MenuItem key={classNum} value={classNum}>
                                        Class {classNum}
                                      </MenuItem>
                                    ))
                                  )}
                                </Select>
                              </FormControl>

                              {/* Section Dropdown */}
                              <FormControl
                                size="small"
                                sx={{
                                  minWidth: { xs: "100%", sm: "180px" },
                                }}
                              >
                                <InputLabel
                                  sx={{
                                    fontWeight: 600,
                                    color: colors.text.secondary,
                                  }}
                                >
                                  Select Section
                                </InputLabel>
                                <Select
                                  value={selectedSection || ""}
                                  onChange={(e) => {
                                    // Clear answers and subject before changing section
                                    setAnswers({});
                                    setTextAnswers({});
                                    setSelectedSubject(null);
                                    setSelectedSection(e.target.value);
                                  }}
                                  label="Select Section"
                                  disabled={
                                    !selectedClass || sections.length === 0
                                  }
                                  sx={{
                                    borderRadius: 2,
                                    bgcolor: "white",
                                    "& .MuiOutlinedInput-notchedOutline": {
                                      borderColor: colors.neutral.gray300,
                                    },
                                    "&:hover .MuiOutlinedInput-notchedOutline":
                                      {
                                        borderColor: colors.accent.purple,
                                      },
                                    "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                                      {
                                        borderColor: colors.accent.purple,
                                        borderWidth: 2,
                                      },
                                  }}
                                >
                                  {!selectedClass ? (
                                    <MenuItem disabled>
                                      Please select a class first
                                    </MenuItem>
                                  ) : sections.length === 0 ? (
                                    <MenuItem disabled>
                                      No sections available for this class
                                    </MenuItem>
                                  ) : (
                                    sections.map((section, index) => (
                                      <MenuItem
                                        key={section.id || index}
                                        value={
                                          section.sectionName ||
                                          section.name ||
                                          section.value
                                        }
                                      >
                                        Section{" "}
                                        {section.sectionName ||
                                          section.name ||
                                          section.value}
                                      </MenuItem>
                                    ))
                                  )}
                                </Select>
                              </FormControl>

                              {/* Subject Dropdown */}
                              <FormControl
                                size="small"
                                sx={{
                                  minWidth: { xs: "100%", sm: "180px" },
                                }}
                              >
                                <InputLabel
                                  sx={{
                                    fontWeight: 600,
                                    color: colors.text.secondary,
                                  }}
                                >
                                  Select Subject
                                </InputLabel>
                                <Select
                                  value={selectedSubject || ""}
                                  onChange={(e) => {
                                    // Clear answers before changing subject
                                    setAnswers({});
                                    setTextAnswers({});
                                    // Set new subject - React Query will automatically refetch with new subjectId
                                    setSelectedSubject(e.target.value);
                                  }}
                                  label="Select Subject"
                                  disabled={
                                    !selectedClass ||
                                    isLoadingSubjects ||
                                    subjects.length === 0
                                  }
                                  sx={{
                                    borderRadius: 2,
                                    bgcolor: "white",
                                    "& .MuiOutlinedInput-notchedOutline": {
                                      borderColor: colors.neutral.gray300,
                                    },
                                    "&:hover .MuiOutlinedInput-notchedOutline":
                                      {
                                        borderColor: colors.accent.purple,
                                      },
                                    "&.Mui-focused .MuiOutlinedInput-notchedOutline":
                                      {
                                        borderColor: colors.accent.purple,
                                        borderWidth: 2,
                                      },
                                  }}
                                >
                                  {!selectedClass ? (
                                    <MenuItem disabled>
                                      Please select a class first
                                    </MenuItem>
                                  ) : isLoadingSubjects ? (
                                    <MenuItem disabled>
                                      Loading subjects...
                                    </MenuItem>
                                  ) : subjects.length === 0 ? (
                                    <MenuItem disabled>
                                      No subjects available for this class
                                    </MenuItem>
                                  ) : (
                                    subjects.map((subject) => (
                                      <MenuItem
                                        key={subject.id}
                                        value={subject.id}
                                      >
                                        {subject.subject}
                                      </MenuItem>
                                    ))
                                  )}
                                </Select>
                              </FormControl>
                            </Box>
                          </Box>

                          {/* Subject-Wise Questions List */}
                          {isLoadingQuestions ? (
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                minHeight: "200px",
                              }}
                            >
                              <CircularProgress />
                            </Box>
                          ) : isErrorQuestions ? (
                            <Alert severity="error">
                              {isErrorQuestions?.message ||
                                t("selfAssessment.failedToLoadQuestions")}
                            </Alert>
                          ) : (
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 2.5,
                              }}
                            >
                              {subjectObservationQuestions.map(
                                (question, index) => {
                                  const options = parseOptions(
                                    question.options
                                  );
                                  const userSelectedAnswer =
                                    answers[question.questionId];
                                  const apiSelectedAnswer =
                                    shouldShowApiAnswer(question) &&
                                    question.selectedOptionId
                                      ? String(question.selectedOptionId)
                                      : null;
                                  const selectedAnswer =
                                    userSelectedAnswer || apiSelectedAnswer;
                                  const isExpanded =
                                    expandedQuestions[question.questionId] ??
                                    true;
                                  const questionNumber = `${domainNumber}.${subdomainNumber}.${
                                    index + 1
                                  }`;

                                  return (
                                    <Card
                                      key={question.questionId}
                                      sx={{
                                        borderRadius: 2,
                                        border: "1px solid",
                                        borderColor: colors.neutral.gray200,
                                        transition: "all 0.2s ease",
                                        boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                                        overflow: "hidden",
                                        "&:hover": {
                                          boxShadow:
                                            "0 4px 12px rgba(0,0,0,0.1)",
                                        },
                                      }}
                                    >
                                      {/* Question Header - Always Visible */}
                                      <Box
                                        onClick={() =>
                                          toggleQuestionExpansion(
                                            question.questionId
                                          )
                                        }
                                        sx={{
                                          p: 2.5,
                                          cursor: "pointer",
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 2,
                                          bgcolor: colors.background.primary,
                                          borderBottom: isExpanded
                                            ? `1px solid ${colors.neutral.gray200}`
                                            : "none",
                                          "&:hover": {
                                            bgcolor:
                                              colors.background.secondary,
                                          },
                                        }}
                                      >
                                        <Chip
                                          label={t("selfAssessment.criterionLabel")}
                                          size="small"
                                          sx={{
                                            bgcolor: colors.neutral.gray800,
                                            color: "white",
                                            fontWeight: 700,
                                            minWidth: "100px",
                                            height: "28px",
                                            fontSize: "0.75rem",
                                          }}
                                        />
                                        <Box sx={{ flex: 1 }}>
                                          <Typography
                                            variant="body2"
                                            sx={{
                                              fontWeight: 700,
                                              fontSize: "1rem",
                                              color: colors.text.primary,
                                              lineHeight: 1.5,
                                            }}
                                          >
                                            {getQuestionText(question)}
                                          </Typography>
                                        </Box>
                                        <IconButton
                                          size="small"
                                          sx={{
                                            color: colors.text.secondary,
                                          }}
                                        >
                                          {isExpanded ? (
                                            <ExpandLess />
                                          ) : (
                                            <ExpandMore />
                                          )}
                                        </IconButton>
                                      </Box>

                                      {/* Question Content - Expandable */}
                                      {isExpanded && (
                                        <CardContent sx={{ p: 3, pt: 2.5 }}>
                                          {options && options.length > 0 && (
                                            <FormControl
                                              component="fieldset"
                                              fullWidth
                                              sx={{ mb: 3 }}
                                            >
                                              <RadioGroup
                                                value={selectedAnswer || ""}
                                                onChange={(e) =>
                                                  handleAnswerChange(
                                                    question.questionId,
                                                    e.target.value
                                                  )
                                                }
                                              >
                                                {options.map(
                                                  (option, optIndex) => (
                                                    <FormControlLabel
                                                      key={
                                                        option.optionId ||
                                                        optIndex
                                                      }
                                                      value={String(
                                                        option.optionId
                                                      )}
                                                      control={
                                                        <Radio
                                                          disabled={
                                                            !isPublished ||
                                                            isSubmitted
                                                          }
                                                          sx={{
                                                            color:
                                                              colors.accent
                                                                .purple,
                                                            "&.Mui-checked": {
                                                              color:
                                                                colors.accent
                                                                  .purple,
                                                            },
                                                          }}
                                                        />
                                                      }
                                                      label={renderOptionLabel(
                                                        option,
                                                        optIndex,
                                                        selectedAnswer === String(option.optionId)
                                                      )}
                                                      sx={{
                                                        mb: 1.5,
                                                        p: 2,
                                                        borderRadius: 2,
                                                        bgcolor:
                                                          selectedAnswer ===
                                                          String(
                                                            option.optionId
                                                          )
                                                            ? colors.accent
                                                                .purple + "15"
                                                            : "transparent",
                                                        border: "1.5px solid",
                                                        borderColor:
                                                          selectedAnswer ===
                                                          String(
                                                            option.optionId
                                                          )
                                                            ? colors.accent
                                                                .purple
                                                            : colors.neutral
                                                                .gray200,
                                                        transition:
                                                          "all 0.2s ease",
                                                        "&:hover": {
                                                          bgcolor:
                                                            colors.accent
                                                              .purple + "15",
                                                          borderColor:
                                                            colors.accent
                                                              .purple,
                                                        },
                                                      }}
                                                    />
                                                  )
                                                )}
                                              </RadioGroup>
                                            </FormControl>
                                          )}

                                          <SubdomainEvidencePanel
                                            questionId={question.questionId}
                                            question={question}
                                            schoolId={schoolId}
                                            assessmentId={
                                              selectedAssessment?.assessmentId ??
                                              selectedAssessmentId ??
                                              null
                                            }
                                            selectedAssessment={selectedAssessment}
                                            readOnly={
                                              isSubmitted === 1 || isSubmitted === true
                                            }
                                            evidenceOptional={isEvidenceOptionalForSelectedOption(
                                              question,
                                              selectedAnswer,
                                              parseOptions,
                                            )}
                                            variant="question"
                                            className="verifier-subdomain-evidence"
                                            languageCode={(languageCode || "EN").toLowerCase()}
                                          />
                                        </CardContent>
                                      )}
                                    </Card>
                                  );
                                }
                              )}
                            </Box>
                          )}
                        </Box>
                      )}

                      {/* FLN Questions Section (Type 4) */}
                      {currentTab.id === "fln" && (
                        <Box sx={{ mb: 4 }}>
                          {/* Section Header */}
                          <Box
                            sx={{
                              mb: 3,
                              pb: 2,
                              borderBottom: `2px solid ${colors.neutral.gray200}`,
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
                              <Create
                                sx={{
                                  fontSize: 24,
                                  color: colors.semantic.warning,
                                }}
                              />
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 700,
                                  color: colors.text.primary,
                                }}
                              >
                                {t("selfAssessment.sections.flnTitle")}
                              </Typography>
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{
                                color: colors.text.secondary,
                                fontSize: "0.875rem",
                              }}
                            >
                              {t("selfAssessment.sections.flnDescription")}
                            </Typography>
                          </Box>

                          {/* FLN Questions List */}
                          {isLoadingQuestions ? (
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                minHeight: "200px",
                              }}
                            >
                              <CircularProgress />
                            </Box>
                          ) : isErrorQuestions ? (
                            <Alert severity="error">
                              {isErrorQuestions?.message ||
                                t("selfAssessment.failedToLoadQuestions")}
                            </Alert>
                          ) : (
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 2.5,
                              }}
                            >
                              {flnQuestions.map((question, index) => {
                                const textAnswer =
                                  textAnswers[question.questionId] ||
                                  textAnswers[String(question.questionId)] ||
                                  "";

                                const isExpanded =
                                  expandedQuestions[question.questionId] ??
                                  true;

                                const questionNumber = `${domainNumber}.${subdomainNumber}.${
                                  index + 1
                                }`;

                                return (
                                  <Card
                                    key={question.questionId}
                                    sx={{
                                      borderRadius: 2,
                                      border: "1px solid",
                                      borderColor: colors.neutral.gray200,
                                      transition: "all 0.2s ease",
                                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                                      overflow: "hidden",
                                      "&:hover": {
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                      },
                                    }}
                                  >
                                    {/* Question Header - Always Visible */}
                                    <Box
                                      onClick={() =>
                                        toggleQuestionExpansion(
                                          question.questionId
                                        )
                                      }
                                      sx={{
                                        p: 2.5,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 2,
                                        bgcolor: colors.background.primary,
                                        borderBottom: isExpanded
                                          ? `1px solid ${colors.neutral.gray200}`
                                          : "none",
                                        "&:hover": {
                                          bgcolor: colors.background.secondary,
                                        },
                                      }}
                                    >
                                      <Chip
                                        label={t("selfAssessment.criterionLabel")}
                                        size="small"
                                        sx={{
                                          bgcolor: colors.neutral.gray800,
                                          color: "white",
                                          fontWeight: 700,
                                          minWidth: "100px",
                                          height: "28px",
                                          fontSize: "0.75rem",
                                        }}
                                      />
                                      <Box sx={{ flex: 1 }}>
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            fontWeight: 700,
                                            fontSize: "1rem",
                                            color: colors.text.primary,
                                            lineHeight: 1.5,
                                          }}
                                        >
                                          {getQuestionText(question)}
                                        </Typography>
                                      </Box>
                                      <IconButton
                                        size="small"
                                        sx={{
                                          color: colors.text.secondary,
                                        }}
                                      >
                                        {isExpanded ? (
                                          <ExpandLess />
                                        ) : (
                                          <ExpandMore />
                                        )}
                                      </IconButton>
                                    </Box>

                                    {/* Question Content - Expandable */}
                                    {isExpanded && (
                                      <CardContent sx={{ p: 3, pt: 2.5 }}>
                                        {/* FLN Input Fields for classes 2 and 3 */}
                                        <Box
                                          sx={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: 2.5,
                                          }}
                                        >
                                          {[2, 3].map((classNum) => {
                                            // Parse existing answer if it exists
                                            let flnData = {};
                                            try {
                                              flnData = textAnswer
                                                ? JSON.parse(textAnswer)
                                                : {};
                                            } catch (e) {
                                              console.error("Error parsing FLN textAnswer:", e, {
                                                questionId: question.questionId,
                                                textAnswer,
                                              });
                                              flnData = {};
                                            }

                                            const classData = flnData[
                                              classNum
                                            ] || {
                                              obtainedMarks: "",
                                              answerId: null,
                                            };

                                            // Get total students count from API
                                            const totalStudents =
                                              gradesCounts[classNum] || 0;
                                            const maxMarks = totalStudents * 10;

                                            return (
                                              <Box
                                                key={classNum}
                                                sx={{
                                                  p: 2.5,
                                                  borderRadius: 2,
                                                  bgcolor:
                                                    colors.background.secondary,
                                                  border: `1px solid ${colors.neutral.gray200}`,
                                                  display: "flex",
                                                  alignItems: "center",
                                                  gap: 3,
                                                  flexWrap: "wrap",
                                                }}
                                              >
                                                {/* Total Students - Static Display */}
                                                <Box
                                                  sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 1.5,
                                                    flex: "1 1 300px",
                                                  }}
                                                >
                                                  <Typography
                                                    variant="body2"
                                                    sx={{
                                                      fontWeight: 600,
                                                      color:
                                                        colors.text.primary,
                                                      whiteSpace: "nowrap",
                                                    }}
                                                  >
                                                    Total number of students for
                                                    Class {classNum}:
                                                  </Typography>
                                                  <Box
                                                    sx={{
                                                      px: 2,
                                                      py: 1,
                                                    }}
                                                  >
                                                    <Typography
                                                      variant="body2"
                                                      sx={{
                                                        fontWeight: 700,
                                                        color:
                                                          colors.primary.blue,
                                                      }}
                                                    >
                                                      {totalStudents}
                                                    </Typography>
                                                  </Box>
                                                </Box>

                                                {/* Obtained Marks Field */}
                                                <Box
                                                  sx={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: 1.5,
                                                    flex: "1 1 250px",
                                                  }}
                                                >
                                                  <Typography
                                                    variant="body2"
                                                    sx={{
                                                      fontWeight: 600,
                                                      color:
                                                        colors.text.primary,
                                                      whiteSpace: "nowrap",
                                                    }}
                                                  >
                                                    Obtained marks:
                                                  </Typography>
                                                  <TextField
                                                    size="small"
                                                    type="number"
                                                    disabled={
                                                      !isPublished ||
                                                      isSubmitted
                                                    }
                                                    value={
                                                      classData.obtainedMarks ||
                                                      ""
                                                    }
                                                    onChange={(e) => {
                                                      const value =
                                                        e.target.value;
                                                      // Validate: only positive numbers and <= max marks
                                                      if (
                                                        value === "" ||
                                                        (Number(value) >= 0 &&
                                                          Number(value) <=
                                                            maxMarks)
                                                      ) {
                                                        const newData = {
                                                          ...flnData,
                                                          [classNum]: {
                                                            obtainedMarks:
                                                              value,
                                                            answerId:
                                                              classData.answerId ||
                                                              null, // Preserve answerId
                                                          },
                                                        };
                                                        handleTextAnswerChange(
                                                          question.questionId,
                                                          JSON.stringify(
                                                            newData
                                                          )
                                                        );
                                                      }
                                                    }}
                                                    onKeyDown={(e) => {
                                                      // Prevent minus sign, plus sign, and 'e'
                                                      if (
                                                        e.key === "-" ||
                                                        e.key === "+" ||
                                                        e.key === "e" ||
                                                        e.key === "E"
                                                      ) {
                                                        e.preventDefault();
                                                      }
                                                    }}
                                                    placeholder="Enter marks"
                                                    inputProps={{
                                                      min: 0,
                                                      max: maxMarks,
                                                    }}
                                                    error={
                                                      classData.obtainedMarks &&
                                                      Number(
                                                        classData.obtainedMarks
                                                      ) > maxMarks
                                                    }
                                                    sx={{
                                                      width: "150px",
                                                      "& .MuiOutlinedInput-root":
                                                        {
                                                          borderRadius: 0.5,
                                                          bgcolor: "white",
                                                        },
                                                    }}
                                                  />
                                                  <Typography
                                                    variant="body2"
                                                    sx={{
                                                      fontWeight: 600,
                                                      color:
                                                        colors.semantic.warning,
                                                      whiteSpace: "nowrap",
                                                    }}
                                                  >
                                                    Max: {maxMarks}
                                                  </Typography>
                                                </Box>
                                              </Box>
                                            );
                                          })}
                                        </Box>
                                      </CardContent>
                                    )}
                                  </Card>
                                );
                              })}
                            </Box>
                          )}
                        </Box>
                      )}

                      {/* General Questions Section */}
                      {currentTab.id === "general" && (
                        <Box sx={{ mb: 4 }}>
                          {/* Section Header */}
                          <Box
                            sx={{
                              mb: 3,
                              pb: 2,
                              borderBottom: `2px solid ${colors.neutral.gray200}`,
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
                              <Assignment
                                sx={{
                                  fontSize: 24,
                                  color: colors.accent.green,
                                }}
                              />
                              <Typography
                                variant="h6"
                                sx={{
                                  fontWeight: 700,
                                  color: colors.text.primary,
                                }}
                              >
                                {t("selfAssessment.sections.generalTitle")}
                              </Typography>
                            </Box>
                            <Typography
                              variant="body2"
                              sx={{
                                color: colors.text.secondary,
                                fontSize: "0.875rem",
                              }}
                            >
                              {t("selfAssessment.sections.generalDescription")}
                            </Typography>
                          </Box>

                          {/* General Questions List */}
                          {isLoadingQuestions ? (
                            <Box
                              sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                minHeight: "200px",
                              }}
                            >
                              <CircularProgress />
                            </Box>
                          ) : isErrorQuestions ? (
                            <Alert severity="error">
                              {isErrorQuestions?.message ||
                                t("selfAssessment.failedToLoadQuestions")}
                            </Alert>
                          ) : (
                            <Box
                              sx={{
                                display: "flex",
                                flexDirection: "column",
                                gap: 2.5,
                              }}
                            >
                              {generalQuestions.map((question, index) => {
                                const options = parseOptions(question.options);
                                const userSelectedAnswer =
                                  answers[question.questionId];
                                const apiSelectedAnswer =
                                  shouldShowApiAnswer(question) &&
                                  question.selectedOptionId
                                    ? String(question.selectedOptionId)
                                    : null;
                                const selectedAnswer =
                                  userSelectedAnswer || apiSelectedAnswer;
                                const isExpanded =
                                  expandedQuestions[question.questionId] ??
                                  true;
                                const questionNumber = `${domainNumber}.${subdomainNumber}.${
                                  index + 1
                                }`;

                                return (
                                  <Card
                                    key={question.questionId}
                                    sx={{
                                      borderRadius: 2,
                                      border: "1px solid",
                                      borderColor: colors.neutral.gray200,
                                      transition: "all 0.2s ease",
                                      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
                                      overflow: "hidden",
                                      "&:hover": {
                                        boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                                      },
                                    }}
                                  >
                                    {/* Question Header - Always Visible */}
                                    <Box
                                      onClick={() =>
                                        toggleQuestionExpansion(
                                          question.questionId
                                        )
                                      }
                                      sx={{
                                        p: 2.5,
                                        cursor: "pointer",
                                        display: "flex",
                                        alignItems: "center",
                                        gap: 2,
                                        bgcolor: colors.background.primary,
                                        borderBottom: isExpanded
                                          ? `1px solid ${colors.neutral.gray200}`
                                          : "none",
                                        "&:hover": {
                                          bgcolor: colors.background.secondary,
                                        },
                                      }}
                                    >
                                      <Chip
                                        label={t("selfAssessment.criterionLabel")}
                                        size="small"
                                        sx={{
                                          bgcolor: colors.neutral.gray800,
                                          color: "white",
                                          fontWeight: 700,
                                          minWidth: "80px",
                                          height: "28px",
                                          fontSize: "0.75rem",
                                        }}
                                      />
                                      <Box sx={{ flex: 1 }}>
                                        <Typography
                                          variant="body2"
                                          sx={{
                                            fontWeight: 700,
                                            fontSize: "1rem",
                                            color: colors.text.primary,
                                            lineHeight: 1.5,
                                          }}
                                        >
                                          {getQuestionText(question)}
                                        </Typography>
                                      </Box>
                                      <Box
                                        sx={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: 2,
                                        }}
                                      >
                                        <IconButton
                                          size="small"
                                          sx={{
                                            color: colors.text.secondary,
                                          }}
                                        >
                                          {isExpanded ? (
                                            <ExpandLess />
                                          ) : (
                                            <ExpandMore />
                                          )}
                                        </IconButton>
                                      </Box>
                                    </Box>

                                    {/* Question Content - Expandable */}
                                    {isExpanded && (
                                      <CardContent sx={{ p: 3, pt: 2.5 }}>
                                        {options && options.length > 0 && (
                                          <FormControl
                                            component="fieldset"
                                            fullWidth
                                            sx={{ mb: 3 }}
                                          >
                                            <RadioGroup
                                              value={selectedAnswer || ""}
                                              onChange={(e) =>
                                                handleAnswerChange(
                                                  question.questionId,
                                                  e.target.value
                                                )
                                              }
                                            >
                                              {options.map(
                                                (option, optIndex) => (
                                                  <FormControlLabel
                                                    key={
                                                      option.optionId ||
                                                      optIndex
                                                    }
                                                    value={String(
                                                      option.optionId
                                                    )}
                                                    control={
                                                      <Radio
                                                        disabled={
                                                          !isPublished ||
                                                          isSubmitted
                                                        }
                                                        sx={{
                                                          color:
                                                            colors.primary.blue,
                                                          "&.Mui-checked": {
                                                            color:
                                                              colors.primary
                                                                .blue,
                                                          },
                                                        }}
                                                      />
                                                    }
                                                    label={renderOptionLabel(
                                                      option,
                                                      optIndex,
                                                      selectedAnswer === String(option.optionId)
                                                    )}
                                                    sx={{
                                                      mb: 1.5,
                                                      p: 2,
                                                      borderRadius: 2,
                                                      bgcolor:
                                                        selectedAnswer ===
                                                        String(option.optionId)
                                                          ? colors.primary
                                                              .lightest
                                                          : "transparent",
                                                      border: "1.5px solid",
                                                      borderColor:
                                                        selectedAnswer ===
                                                        String(option.optionId)
                                                          ? colors.primary.blue
                                                          : colors.neutral
                                                              .gray200,
                                                      transition:
                                                        "all 0.2s ease",
                                                      "&:hover": {
                                                        bgcolor:
                                                          colors.primary
                                                            .lightest + "80",
                                                        borderColor:
                                                          colors.primary.blue,
                                                      },
                                                    }}
                                                  />
                                                )
                                              )}
                                            </RadioGroup>
                                          </FormControl>
                                        )}

                                        <SubdomainEvidencePanel
                                          questionId={question.questionId}
                                          question={question}
                                          schoolId={schoolId}
                                          assessmentId={
                                            selectedAssessment?.assessmentId ??
                                            selectedAssessmentId ??
                                            null
                                          }
                                          selectedAssessment={selectedAssessment}
                                          readOnly={
                                            isSubmitted === 1 || isSubmitted === true
                                          }
                                          evidenceOptional={isEvidenceOptionalForSelectedOption(
                                            question,
                                            selectedAnswer,
                                            parseOptions,
                                          )}
                                          variant="question"
                                          className="verifier-subdomain-evidence"
                                          languageCode={(languageCode || "EN").toLowerCase()}
                                        />
                                      </CardContent>
                                    )}
                                  </Card>
                                );
                              })}
                            </Box>
                          )}
                        </Box>
                      )}
                    </Box>
                  )}

                {/* Submit Button */}
                {isPublished && !isSubmitted && (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "flex-end",
                      gap: 2,
                      mt: 4,
                      pt: 3.5,
                      borderTop: `1.5px solid ${colors.neutral.gray200}`,
                    }}
                  >
                    <Button
                      variant="outlined"
                      onClick={() => {
                        setSelectedDomain(null);
                        setSelectedSubdomain(null);
                        setAnswers({});
                      }}
                      sx={{
                        borderColor: colors.primary.blue,
                        color: colors.primary.blue,
                      }}
                    >
                      Cancel
                    </Button>
                    <Button
                      variant="contained"
                      onClick={handleSubmit}
                      disabled={
                        submitSubdomainWiseAnswersMutation.isPending ||
                        submitAssessmentMutation.isPending ||
                        !areAllQuestionsAnsweredForCurrentTab ||
                        // For class-based questions (classroom and subject), validate class and section
                        ((currentTab?.id === "classroom" ||
                          currentTab?.id === "subject") &&
                          (!selectedClass || !selectedSection)) ||
                        // For subject questions, also validate subject selection
                        (currentTab?.id === "subject" && !selectedSubject)
                      }
                      title={
                        !areAllQuestionsAnsweredForCurrentTab
                          ? `Please answer all ${
                              currentTab?.label || "questions"
                            } before saving`
                          : (currentTab?.id === "classroom" ||
                              currentTab?.id === "subject") &&
                            (!selectedClass || !selectedSection)
                          ? "Please select class and section before saving"
                          : currentTab?.id === "subject" && !selectedSubject
                          ? "Please select subject before saving"
                          : "Save assessment for this question type"
                      }
                      startIcon={
                        submitSubdomainWiseAnswersMutation.isPending ||
                        submitAssessmentMutation.isPending ? (
                          <CircularProgress
                            size={18}
                            thickness={5}
                            color="inherit"
                            aria-hidden
                          />
                        ) : null
                      }
                      sx={{
                        bgcolor: colors.accent.green,
                        minWidth: 168,
                        textTransform: "none",
                        fontWeight: 600,
                        "&:hover": { bgcolor: colors.accent.greenDark },
                        "&:disabled": {
                          bgcolor: colors.neutral.gray300,
                          color: colors.neutral.gray600,
                        },
                      }}
                    >
                      {submitSubdomainWiseAnswersMutation.isPending ||
                      submitAssessmentMutation.isPending
                        ? "Saving..."
                        : "Save Assessment"}
                    </Button>
                  </Box>
                )}
              </Box>
            </>
          </Paper>
        )}

        {/* Domain View - When Domain Selected but No Subdomain (desktop only) */}
        {!matchDownMD && selectedDomain && !selectedSubdomain && (
          <Paper
            elevation={2}
            sx={{
              flex: 1,
              borderRadius: 3,
              bgcolor: "white",
              display: "flex",
              flexDirection: "column",
              maxHeight: "calc(100vh - 300px)",
              overflow: "hidden",
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
                    {domains.findIndex(
                      (d) => d.domainId === selectedDomain.domainId
                    ) + 1}
                    . {getDomainName(selectedDomain)}
                  </Typography>
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ fontSize: "0.875rem" }}
                  >
                    Assessment of {getDomainName(selectedDomain).toLowerCase()}
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
                    Progress
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
                          getDomainProgress(selectedDomain)
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
                      {Math.round(getDomainProgress(selectedDomain))}%
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
                  {selectedDomain.subDomain.map((subdomain, index) => {
                    const subdomainId = subdomain.subDomainId || subdomain.id;
                    const subdomainProgress = getSubdomainProgress(subdomain);
                    const domainIdx = domains.findIndex(
                      (d) => d.domainId === selectedDomain.domainId
                    );
                    const subdomainNumber = `${domainIdx + 1}.${index + 1}`;

                    return (
                      <Card
                        key={subdomainId}
                        onClick={() => handleSubdomainSelect(subdomain)}
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
                            boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
                            borderColor: colors.primary.blue,
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
                                    color: getProgressColor(subdomainProgress),
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
                                    {Math.round(subdomainProgress)}%
                                  </Typography>
                                </Box>
                              </Box>
                            </Box>
                          </Box>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Box>
              ) : (
                <Box sx={{ textAlign: "center", py: 8 }}>
                  <Typography variant="body1" color="text.secondary">
                    No subdomains available for this domain
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        )}

        {/* Domains Overview - No Domain Selected (desktop only) */}
        {!matchDownMD && !selectedDomain && (
          <Paper
            elevation={2}
            sx={{
              flex: 1,
              borderRadius: 3,
              bgcolor: "white",
              display: "flex",
              flexDirection: "column",
              maxHeight: "calc(100vh - 300px)",
              overflow: "hidden",
              minWidth: 0,
              boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
            }}
          >
            {/* Header */}
            <Box
              sx={{
                p: 3,
                borderBottom: `2px solid ${colors.neutral.gray200}`,
                bgcolor: colors.background.secondary,
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                gap: 3,
                flexWrap: "wrap",
              }}
            >
              <Box sx={{ flex: 1, minWidth: 220 }}>
                <Typography
                  variant="h5"
                  sx={{
                    fontWeight: 700,
                    color: colors.text.primary,
                    mb: 0.5,
                  }}
                >
                  {t("selfAssessment.assessmentOverview")}
                </Typography>
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ fontSize: "0.875rem" }}
                >
                  {assessments.length > 1
                    ? "Review progress across assessments and domains"
                    : "Review progress across all domains"}
                </Typography>
              </Box>
              <AssessmentOverallProgress
                t={t}
                assessmentProgress={assessmentProgress}
                getProgressColor={getProgressColor}
                compact
              />
            </Box>

            {/* Bar Graph - Domains Progress */}
            <Box
              sx={{
                flex: 1,
                overflowY: "auto",
                p: { xs: 2.5, md: 3.5 },
                display: "flex",
                flexDirection: "column",
              }}
            >
              {currentChartData.length > 0 ? (
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                    height: "100%",
                  }}
                >
                  <Typography
                    variant="h6"
                    sx={{
                      fontWeight: 600,
                      color: colors.text.primary,
                      mb: 1,
                    }}
                  >
                    {assessments.length > 1 && !chartDrilldownAssessmentId
                      ? "Assessment Progress Overview"
                      : "Domain Progress Overview"}
                  </Typography>
                  {assessments.length > 1 && chartDrilldownAssessmentId && (
                    <Button
                      size="small"
                      variant="text"
                      onClick={() => setChartDrilldownAssessmentId(null)}
                      sx={{ alignSelf: "flex-start", textTransform: "none" }}
                    >
                      Back to Assessments
                    </Button>
                  )}
                  <Box
                    sx={{
                      flex: 1,
                      minHeight: "400px",
                      width: "100%",
                    }}
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={currentChartData}
                        layout="vertical"
                        margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                      >
                        <XAxis
                          type="number"
                          domain={[0, 100]}
                          tick={{ fill: colors.text.secondary, fontSize: 12 }}
                          stroke={colors.neutral.gray400}
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          width={200}
                          tick={{ fill: colors.text.primary, fontSize: 12 }}
                          stroke={colors.neutral.gray400}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: colors.background.primary,
                            border: `1px solid ${colors.neutral.gray300}`,
                            borderRadius: "8px",
                            padding: "8px 12px",
                          }}
                          formatter={(value) => [`${value}%`, "Progress"]}
                          labelStyle={{
                            color: colors.text.primary,
                            fontWeight: 600,
                            marginBottom: "4px",
                          }}
                        />
                        <Bar
                          dataKey="progress"
                          radius={[0, 8, 8, 0]}
                          onClick={(data) => {
                            if (assessments.length > 1 && !chartDrilldownAssessmentId) {
                              const assessment = assessments.find(
                                (a) => a.assessmentId === data.assessmentId
                              );
                              if (assessment) {
                                handleAssessmentSelect(assessment);
                                setChartDrilldownAssessmentId(
                                  assessment.assessmentId
                                );
                              }
                              return;
                            }

                            const sourceDomains = chartDrilldownAssessmentId
                              ? assessments.find(
                                  (a) =>
                                    a.assessmentId === chartDrilldownAssessmentId
                                )?.domains || []
                              : domains;
                            const domain = sourceDomains.find(
                              (d) => d.domainId === data.domainId
                            );
                            if (domain) {
                              handleDomainSelect(domain);
                            }
                          }}
                          cursor="pointer"
                        >
                          {currentChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </Box>
                </Box>
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
                    No Assessment Available
                  </Typography>
                  <Typography
                    variant="body1"
                    color="text.secondary"
                    sx={{ maxWidth: 400, mx: "auto" }}
                  >
                    The assessment has not been published or created yet. Please
                    contact your administrator to publish the assessment.
                  </Typography>
                </Box>
              )}
            </Box>
          </Paper>
        )}
      </Box>

      {/* Confirmation Modal for Final Submit */}
      <ConfirmationModal
        open={showSubmitConfirmation}
        onClose={() => setShowSubmitConfirmation(false)}
        onConfirm={handleConfirmSubmit}
        title="Submit Assessment"
        message="Are you sure you want to submit your assessment? You will not be able to edit your responses after submission."
        confirmText="Yes, Submit"
        cancelText="Cancel"
        isLoading={submitAssessmentMutation.isPending}
      />
    </Box>
  );
}
