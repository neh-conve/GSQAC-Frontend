import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Alert,
  RadioGroup,
  FormControlLabel,
  Radio,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  TextField,
  LinearProgress,
  Stack,
} from "@mui/material";
import {
  ArrowForward,
  ArrowBack,
  ChevronRight,
  AccountTree,
  Save,
} from "@mui/icons-material";
import { colors } from "../../../../constants/colors";
import { SelectedKakshaBanner } from "../../../../components/SelectedKakshaBanner/SelectedKakshaBanner";
import { SubdomainEvidencePanel } from "../../../../components/SubdomainEvidencePanel/SubdomainEvidencePanel";
import { ErrorBoundary } from "../../../../components/ErrorBoundary/ErrorBoundary";
import {
  getSubdomainEvidenceProgress,
  isEvidenceOptionalForSelectedOption,
  questionRequiresEvidence,
  subdomainHasMandatoryEvidence,
  zeroMandatoryEvidenceProgress,
} from "../../../../services/evidenceService";
import { renderAssessmentOptionLabel } from "../../../../utils/assessmentOptionLabel";
import {
  getKakshaLevelFromQuestion,
} from "../../../../utils/assessmentMeta";

function ClassroomSubjectFilters({ c, tabId }) {
  const {
    selectedClassGroup,
    setSelectedClassGroup,
    selectedClass,
    setSelectedClass,
    selectedSection,
    setSelectedSection,
    selectedSubject,
    setSelectedSubject,
    selectedSubdomain,
    setClassWiseAnswers,
    setClassWiseTextAnswers,
    answers,
    textAnswers,
    isLoadingSchoolData,
    filteredClassOptions,
    isLoadingSections,
    sections,
    isLoadingSubjects,
    subjects,
    isReadOnly,
    getGroupFlagColor,
    getFlagColorValue,
    hasSubjectWiseQuestions,
  } = c;

  const isClassroom = tabId === "classroom";
  const isSubject = tabId === "subject";

  if (!isClassroom && !isSubject) return null;

  return (
    <Box className="sa-wizard-filters">
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1.5 }}>
        {isSubject
          ? "Select class group, class, section and subject"
          : "Select class group, class and section"}
      </Typography>
      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 150 } }}>
          <InputLabel>Class Group</InputLabel>
          <Select
            value={selectedClassGroup || ""}
            onChange={(e) => setSelectedClassGroup(e.target.value)}
            label="Class Group"
          >
            {["1-2", "3-5", "6-8"]
              .filter((groupRange) => {
                const flag = getGroupFlagColor(isClassroom ? 2 : 3, groupRange);
                return flag !== null && flag !== undefined && flag !== "gray";
              })
              .map((groupRange) => {
                const flag = getGroupFlagColor(isClassroom ? 2 : 3, groupRange);
                const flagColor = flag ? getFlagColorValue(flag) : null;
                return (
                  <MenuItem key={groupRange} value={groupRange}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      {flagColor ? (
                        <Box
                          sx={{
                            width: 10,
                            height: 10,
                            borderRadius: "50%",
                            bgcolor: flagColor,
                          }}
                        />
                      ) : null}
                      Class {groupRange}
                    </Box>
                  </MenuItem>
                );
              })}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 180 } }}>
          <InputLabel>Select Class</InputLabel>
          <Select
            value={selectedClass || ""}
            onChange={(e) => {
              if (selectedSubdomain && selectedClass) {
                const subdomainId =
                  selectedSubdomain.subDomainId || selectedSubdomain.id;
                const storageKey = `${subdomainId}_${String(selectedClass)}`;
                setClassWiseAnswers((prev) => ({
                  ...prev,
                  [storageKey]: { ...answers },
                }));
                setClassWiseTextAnswers((prev) => ({
                  ...prev,
                  [storageKey]: { ...textAnswers },
                }));
              }
              setSelectedClass(e.target.value);
              setSelectedSection(null);
            }}
            label="Select Class"
            disabled={
              isLoadingSchoolData ||
              filteredClassOptions.length === 0 ||
              (!isPublished && !isReadOnly)
            }
          >
            {filteredClassOptions.map((cls) => (
              <MenuItem key={cls} value={cls}>
                Class {cls}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 160 } }}>
          <InputLabel>Section</InputLabel>
          <Select
            value={selectedSection || ""}
            onChange={(e) => setSelectedSection(e.target.value)}
            label="Section"
            disabled={!selectedClass || isLoadingSections || !isPublished}
          >
            {sections.map((section) => (
              <MenuItem key={section} value={section}>
                {section}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {isSubject && hasSubjectWiseQuestions ? (
          <FormControl size="small" sx={{ minWidth: { xs: "100%", sm: 200 } }}>
            <InputLabel>Subject</InputLabel>
            <Select
              value={selectedSubject || ""}
              onChange={(e) => setSelectedSubject(e.target.value)}
              label="Subject"
              disabled={!selectedSection || isLoadingSubjects || !isPublished}
            >
              {subjects.map((subject) => (
                <MenuItem
                  key={subject.subjectId || subject.id}
                  value={subject.subjectId || subject.id}
                >
                  {subject.subjectName || subject.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        ) : null}
      </Stack>
    </Box>
  );
}

function McqQuestionBody({
  question,
  c,
  questionNumber,
  isMobile = false,
  onEvidenceProgressChange,
}) {
  if (!question) return null;

  const {
    answers,
    handleAnswerChange,
    parseOptions,
    getQuestionText,
    shouldShowApiAnswer,
    isPublished,
    isReadOnly,
    t,
    getOptionText,
    assessmentTheme,
    userName,
    schoolId,
    selectedAssessmentId,
    selectedAssessment,
    languageCode,
    renderQuestionEvidencePanel,
  } = c;

  const at = assessmentTheme || {
    primary: colors.primary.blue,
    dark: colors.primary.dark,
    lightest: colors.primary.lightest,
  };

  const options = parseOptions(question.options);
  const userSelectedAnswer = answers[question.questionId];
  const apiSelectedAnswer =
    shouldShowApiAnswer(question) && question.selectedOptionId
      ? String(question.selectedOptionId)
      : null;
  const selectedAnswer = userSelectedAnswer || apiSelectedAnswer;
  const evidenceOptional = isEvidenceOptionalForSelectedOption(
    question,
    selectedAnswer,
    parseOptions,
  );
  const showEvidence = questionRequiresEvidence(question);

  return (
    <Card className="sa-wizard-question-card" elevation={0}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 2 }}>
          <Chip
            label={t("selfAssessment.criterionLabel")}
            size="small"
            sx={{
              bgcolor: at.dark,
              color: "white",
              fontWeight: 700,
              flexShrink: 0,
            }}
          />
          <Typography
            variant="body1"
            sx={{ fontWeight: 600, lineHeight: 1.55, color: colors.text.primary }}
          >
            {getQuestionText(question)}
          </Typography>
        </Box>

        {question.observationCount ? (
          <Chip
            label={`Observation count: ${question.observationCount}`}
            size="small"
            sx={{ mb: 2, fontWeight: 600 }}
          />
        ) : null}

        {options.length > 0 ? (
          <FormControl component="fieldset" fullWidth>
            <RadioGroup
              value={selectedAnswer || ""}
              onChange={(e) =>
                handleAnswerChange(question.questionId, e.target.value)
              }
            >
              {options.map((option, optIndex) => (
                <FormControlLabel
                  key={option.optionId || optIndex}
                  className="sa-mcq-option"
                  value={String(option.optionId)}
                  disabled={!isPublished || isReadOnly}
                  control={
                    <Radio
                      sx={{
                        color: at.primary,
                        "&.Mui-checked": { color: at.primary },
                        alignSelf: "flex-start",
                        mt: 0.25,
                      }}
                    />
                  }
                  label={renderAssessmentOptionLabel(
                    t,
                    getOptionText,
                    option,
                    optIndex,
                    {
                      assessmentTheme,
                      isMobile,
                      isSelected: selectedAnswer === String(option.optionId),
                    },
                  )}
                  sx={{
                    mb: 1.25,
                    mx: 0,
                    p: 1.5,
                    borderRadius: 2,
                    alignItems: "flex-start",
                    border: "1.5px solid",
                    borderColor:
                      selectedAnswer === String(option.optionId)
                        ? at.primary
                        : colors.neutral.gray200,
                    bgcolor:
                      selectedAnswer === String(option.optionId)
                        ? at.lightest
                        : "transparent",
                  }}
                />
              ))}
            </RadioGroup>
          </FormControl>
        ) : null}

        <SelectedKakshaBanner
          level={getKakshaLevelFromQuestion(
            { ...question, options },
            selectedAnswer,
          )}
          accent={at.primary}
        />

        {showEvidence ? (
          <ErrorBoundary
            compact
            logLabel="SubdomainEvidencePanel"
            message="Evidence could not be loaded. You can continue answering."
          >
            {typeof renderQuestionEvidencePanel === "function" ? (
              renderQuestionEvidencePanel({
                question,
                selectedAnswer,
                evidenceOptional,
                readOnly: isReadOnly,
                onEvidenceProgressChange,
              })
            ) : (
              <SubdomainEvidencePanel
                questionId={question?.questionId}
                question={question}
                schoolId={schoolId || userName}
                assessmentId={
                  selectedAssessment?.assessmentId ?? selectedAssessmentId ?? null
                }
                selectedAssessment={selectedAssessment}
                assessmentTheme={assessmentTheme}
                readOnly={isReadOnly}
                evidenceOptional={evidenceOptional}
                variant="question"
                className="sa-question-evidence"
                languageCode={(languageCode || "EN").toLowerCase()}
                onProgressChange={onEvidenceProgressChange}
              />
            )}
          </ErrorBoundary>
        ) : null}
      </CardContent>
    </Card>
  );
}

function FlnQuestionBody({ question, c, questionNumber }) {
  const {
    textAnswers,
    handleTextAnswerChange,
    getQuestionText,
    gradesCounts,
    isPublished,
    isReadOnly,
    t,
  } = c;

  if (!question) return null;

  const textAnswer = textAnswers[question.questionId] || "";
  let flnData = {};
  try {
    flnData = textAnswer ? JSON.parse(textAnswer) : {};
  } catch {
    flnData = {};
  }

  return (
    <Card className="sa-wizard-question-card" elevation={0}>
      <CardContent sx={{ p: { xs: 2, sm: 2.5 } }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 1.5, mb: 2 }}>
          <Chip
            label={t("selfAssessment.criterionLabel")}
            size="small"
            sx={{
              bgcolor: colors.semantic.warning,
              color: "white",
              fontWeight: 700,
              flexShrink: 0,
            }}
          />
          <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.55 }}>
            {getQuestionText(question)}
          </Typography>
        </Box>

        <Stack spacing={2}>
          {[2, 3].map((classNum) => {
            const classData = flnData[classNum] || {
              obtainedMarks: "",
              answerId: null,
            };
            const totalStudents = gradesCounts[classNum] || 0;
            const maxMarks = totalStudents * 10;

            return (
              <Box key={classNum} className="sa-fln-row">
                <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
                  Class {classNum} · Total students: {totalStudents}
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
                  <TextField
                    size="small"
                    type="number"
                    label="Obtained marks"
                    disabled={!isPublished || isReadOnly}
                    value={classData.obtainedMarks || ""}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (
                        value === "" ||
                        (Number(value) >= 0 && Number(value) <= maxMarks)
                      ) {
                        const newData = {
                          ...flnData,
                          [classNum]: {
                            obtainedMarks: value,
                            answerId: classData.answerId || null,
                          },
                        };
                        handleTextAnswerChange(
                          question.questionId,
                          JSON.stringify(newData),
                        );
                      }
                    }}
                    onKeyDown={(e) => {
                      if (["-", "+", "e", "E"].includes(e.key)) e.preventDefault();
                    }}
                    inputProps={{ min: 0, max: maxMarks }}
                    sx={{ width: { xs: "100%", sm: 180 } }}
                  />
                  <Typography variant="caption" sx={{ color: colors.text.secondary }}>
                    Max: {maxMarks}
                  </Typography>
                </Box>
              </Box>
            );
          })}
        </Stack>
      </CardContent>
    </Card>
  );
}

export function SubdomainQuestionFlow({
  c,
  matchDownMD,
  setMobileStep,
  scrollMobileToTop,
}) {
  const {
    t,
    selectedDomain,
    selectedSubdomain,
    setSelectedDomain,
    setSelectedSubdomain,
    setAnswers,
    domainNumber,
    subdomainNumber,
    getDomainName,
    getSubdomainName,
    isLoadingQuestions,
    isErrorQuestions,
    allQuestions,
    flattenedQuestions,
    currentQuestionEntry,
    currentQuestionIndex,
    isFirstQuestionInSubdomain,
    isLastQuestionInSubdomain,
    nextSubdomainInfo,
    handleNextQuestion,
    handlePreviousQuestion,
    handleGoToNextSubdomain,
    handleSubmit,
    isSaveAssessmentDisabled,
    submitSubdomainWiseAnswersMutation,
    isPublished,
    isReadOnly,
    assessmentTheme,
    selectedClass,
    selectedSection,
    selectedSubject,
    handleSubdomainEvidenceProgressChange,
    renderSubdomainHeaderExtra,
    renderQuestionHeaderExtra,
  } = c;

  const [subdomainEvidenceProgress, setSubdomainEvidenceProgress] = useState(
    () =>
      selectedSubdomain
        ? getSubdomainEvidenceProgress(selectedSubdomain)
        : zeroMandatoryEvidenceProgress(),
  );

  useEffect(() => {
    if (!selectedSubdomain) {
      setSubdomainEvidenceProgress(zeroMandatoryEvidenceProgress());
      return;
    }
    setSubdomainEvidenceProgress(getSubdomainEvidenceProgress(selectedSubdomain));
  }, [selectedSubdomain]);

  const handleEvidenceProgressChange = useCallback(
    (progress) => {
      handleSubdomainEvidenceProgressChange?.(progress);

      if (!selectedSubdomain || progress?.questionId == null) return;

      const questionKey = String(progress.questionId);
      const prevAdjustments = selectedSubdomain.evidenceAnswerAdjustments || {};
      const nextAdjustments = { ...prevAdjustments };
      if (progress.exempt) {
        nextAdjustments[questionKey] = {
          exempt: true,
          slotTotal: Number(progress.slotTotal ?? progress.rawTotal) || 0,
          slotUploaded:
            Number(progress.slotUploaded ?? progress.rawUploaded) || 0,
        };
      } else {
        delete nextAdjustments[questionKey];
      }

      setSubdomainEvidenceProgress(
        getSubdomainEvidenceProgress({
          ...selectedSubdomain,
          evidenceAnswerAdjustments: nextAdjustments,
        }),
      );
    },
    [handleSubdomainEvidenceProgressChange, selectedSubdomain],
  );

  useEffect(() => {
    if (!selectedSubdomain) return;
    setSubdomainEvidenceProgress(getSubdomainEvidenceProgress(selectedSubdomain));
  }, [
    selectedSubdomain,
    selectedSubdomain?.mandatoryEvidenceTotal,
    selectedSubdomain?.mandatoryEvidenceUploaded,
    selectedSubdomain?.evidenceAnswerAdjustments,
  ]);

  const at = assessmentTheme || {
    primary: colors.primary.blue,
    dark: colors.primary.dark,
    lightest: colors.primary.lightest,
  };

  const needsClassFilters =
    currentQuestionEntry?.tabId === "classroom" ||
    currentQuestionEntry?.tabId === "subject";
  const filtersReady =
    !needsClassFilters ||
    (selectedClass &&
      selectedSection &&
      (currentQuestionEntry?.tabId !== "subject" || selectedSubject));

  const questionNumber = currentQuestionEntry
    ? `${domainNumber}.${subdomainNumber}.${currentQuestionEntry.questionIndexInTab + 1}`
    : "";

  const progressValue =
    flattenedQuestions.length > 0
      ? ((currentQuestionIndex + 1) / flattenedQuestions.length) * 100
      : 0;

  const questionScrollRef = useRef(null);

  useEffect(() => {
    if (questionScrollRef.current) {
      questionScrollRef.current.scrollTop = 0;
    }
  }, [currentQuestionIndex, selectedSubdomain?.subDomainId, selectedSubdomain?.id]);

  const handleCancel = () => {
    setSelectedDomain(null);
    setSelectedSubdomain(null);
    setAnswers({});
    if (matchDownMD) {
      setMobileStep(0);
      scrollMobileToTop?.();
    }
  };

  if (isLoadingQuestions) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!currentQuestionEntry) {
    return null;
  }

  const { question, tabId, tabLabel, tabColor } = currentQuestionEntry;

  return (
    <Box
      className="sa-question-wizard"
      sx={{
        flex: "1 1 0",
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      {typeof renderSubdomainHeaderExtra === "function"
        ? renderSubdomainHeaderExtra()
        : null}

      {/* Domain / subdomain context */}
      <Box
        className={`sa-wizard-context${
          matchDownMD ? " sa-wizard-context--compact" : ""
        }`}
      >
        {!matchDownMD ? (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
            <AccountTree sx={{ fontSize: 18, color: at.primary }} />
            <Typography variant="caption" sx={{ fontWeight: 700, color: colors.text.secondary }}>
              {getDomainName(selectedDomain)}
              <ChevronRight sx={{ fontSize: 14, mx: 0.25, verticalAlign: "middle" }} />
              {getSubdomainName(selectedSubdomain)}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75 }}>
            <AccountTree sx={{ fontSize: 16, color: at.primary, flexShrink: 0 }} />
            <Typography
              variant="caption"
              sx={{
                fontWeight: 700,
                color: colors.text.secondary,
                fontSize: "0.6875rem",
                lineHeight: 1.35,
              }}
            >
              {getDomainName(selectedDomain)}
              <ChevronRight sx={{ fontSize: 12, mx: 0.2, verticalAlign: "middle" }} />
              {getSubdomainName(selectedSubdomain)}
            </Typography>
          </Box>
        )}
        <Box
          className="sa-wizard-context__main-row"
          sx={{
            display: "flex",
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
            gap: { xs: 0.75, sm: 1.5 },
            flexDirection: { xs: "column", sm: "row" },
          }}
        >
          <Box
            className="sa-wizard-context__title-block"
            sx={{
              minWidth: 0,
              flex: 1,
              display: "flex",
              alignItems: { xs: "flex-start", sm: "center" },
              justifyContent: "space-between",
              gap: 1,
            }}
          >
            <Box sx={{ minWidth: 0, flex: 1 }}>
              <Typography
                variant="h6"
                className="sa-wizard-context-title"
                sx={{
                  fontWeight: 800,
                  lineHeight: 1.25,
                  fontSize: { xs: "1rem", sm: "1.25rem" },
                }}
              >
                {getSubdomainName(selectedSubdomain)}
              </Typography>
              <Box
                sx={{
                  display: "flex",
                  flexDirection: { xs: "column", md: "row" },
                  alignItems: { xs: "stretch", md: "center" },
                  justifyContent: "space-between",
                  gap: { xs: 0.75, md: 1.5 },
                  mt: 0.25,
                }}
              >
                <Typography
                  variant="body2"
                  color="text.secondary"
                  sx={{ flexShrink: 0, fontWeight: 600 }}
                >
                  {t("selfAssessment.criterionProgress", {
                    current: currentQuestionIndex + 1,
                    total: flattenedQuestions.length,
                  })}
                </Typography>
                {typeof renderQuestionHeaderExtra === "function"
                  ? renderQuestionHeaderExtra({
                      question,
                      questionNumber: currentQuestionIndex + 1,
                    })
                  : null}
              </Box>
            </Box>
            {matchDownMD ? (
              <Chip
                label={tabLabel}
                size="small"
                sx={{
                  fontWeight: 700,
                  bgcolor: `${tabColor}18`,
                  color: tabColor,
                  border: `1px solid ${tabColor}40`,
                  flexShrink: 0,
                  mt: 0.25,
                }}
              />
            ) : null}
          </Box>
          <Box
            className="sa-wizard-context__meta-row"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              flexShrink: 0,
              width: { xs: "100%", sm: "auto" },
              maxWidth: { sm: "100%", md: "none" },
              justifyContent: { xs: "stretch", sm: "flex-end" },
            }}
          >
            {!matchDownMD ? (
              <Chip
                label={tabLabel}
                size="small"
                sx={{
                  fontWeight: 700,
                  bgcolor: `${tabColor}18`,
                  color: tabColor,
                  border: `1px solid ${tabColor}40`,
                  flexShrink: 0,
                }}
              />
            ) : null}
          </Box>
        </Box>
        <LinearProgress
          variant="determinate"
          value={progressValue}
          sx={{
            mt: { xs: 1, sm: 1.5 },
            height: { xs: 6, sm: 8 },
            borderRadius: 99,
            bgcolor: colors.neutral.gray200,
            "& .MuiLinearProgress-bar": {
              borderRadius: 99,
              bgcolor: tabColor || at.primary,
            },
          }}
        />
        {subdomainHasMandatoryEvidence(selectedSubdomain) ? (
          <Box sx={{ mt: 1 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 0.5,
              }}
            >
              <Typography variant="caption" fontWeight={700} color="text.secondary">
                {t("selfAssessment.evidence.progressLabel", {
                  uploaded: subdomainEvidenceProgress.uploaded,
                  total: subdomainEvidenceProgress.total,
                })}
              </Typography>
              <Typography variant="caption" fontWeight={800} color="primary">
                {subdomainEvidenceProgress.total === 0
                  ? t("selfAssessment.evidence.optionalComplete", {
                      defaultValue: "Not required",
                    })
                  : subdomainEvidenceProgress.remaining > 0
                    ? t("selfAssessment.evidence.remaining", {
                        count: subdomainEvidenceProgress.remaining,
                      })
                    : t("selfAssessment.evidence.complete")}
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={subdomainEvidenceProgress.percentage}
              sx={{
                height: { xs: 6, sm: 8 },
                borderRadius: 99,
                bgcolor: colors.neutral.gray200,
                "& .MuiLinearProgress-bar": {
                  borderRadius: 99,
                  bgcolor:
                    subdomainEvidenceProgress.percentage === 100
                      ? colors.accent.green
                      : at.primary,
                },
              }}
            />
          </Box>
        ) : null}
      </Box>

      <Box
        ref={questionScrollRef}
        className="sa-wizard-question-scroll"
        sx={{
          flex: "1 1 0",
          minHeight: 0,
          overflowY: "auto",
          overflowX: "hidden",
          WebkitOverflowScrolling: "touch",
        }}
      >
        <ClassroomSubjectFilters c={c} tabId={tabId} />

        {isErrorQuestions ? (
          <Alert severity="error" sx={{ mb: 2 }}>
            {isErrorQuestions?.message || t("selfAssessment.failedToLoadQuestions")}
          </Alert>
        ) : null}

        {needsClassFilters && !filtersReady && !isReadOnly ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            Please select the required class filters above to view this question.
          </Alert>
        ) : (
          <>
            {tabId === "fln" ? (
              <FlnQuestionBody
                question={question}
                c={c}
                questionNumber={questionNumber}
              />
            ) : (
              <McqQuestionBody
                question={question}
                c={c}
                questionNumber={questionNumber}
                isMobile={matchDownMD}
                onEvidenceProgressChange={handleEvidenceProgressChange}
              />
            )}
          </>
        )}
      </Box>

      {/* Navigation footer — show prev/next in read-only too */}
      {isPublished ? (
        <Box className="sa-wizard-footer">
          <Box
            className={`sa-wizard-footer-actions${
              matchDownMD ? " sa-wizard-footer-actions--mobile" : ""
            }${isReadOnly ? " sa-wizard-footer-actions--readonly" : ""}`}
          >
            {matchDownMD ? (
              <>
                {!isFirstQuestionInSubdomain ? (
                  <Button
                    variant="outlined"
                    className="sa-wizard-footer-btn sa-wizard-footer-btn--prev"
                    onClick={() => {
                      handlePreviousQuestion();
                      scrollMobileToTop?.();
                    }}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                    <span className="sa-wizard-btn-inline">
                      <ArrowBack sx={{ fontSize: 15 }} />
                      <span>Previous</span>
                    </span>
                  </Button>
                ) : null}

                {!isReadOnly ? (
                  <Button
                    variant="outlined"
                    color="success"
                    className="sa-wizard-footer-btn sa-wizard-footer-btn--save"
                    onClick={handleSubmit}
                    disabled={isSaveAssessmentDisabled()}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                    {submitSubdomainWiseAnswersMutation.isPending ? (
                      <CircularProgress size={14} color="inherit" />
                    ) : (
                      <span className="sa-wizard-btn-inline">
                        <Save sx={{ fontSize: 15 }} />
                        <span>Save</span>
                      </span>
                    )}
                  </Button>
                ) : null}

                {!isLastQuestionInSubdomain ? (
                  <Button
                    variant="contained"
                    className="sa-wizard-footer-btn sa-wizard-footer-btn--next"
                    onClick={() => {
                      handleNextQuestion();
                      scrollMobileToTop?.();
                    }}
                    disabled={!isReadOnly && needsClassFilters && !filtersReady}
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                      bgcolor: at.primary,
                      "&:hover": { bgcolor: at.dark },
                    }}
                  >
                    <span className="sa-wizard-btn-inline">
                      <span>Next</span>
                      <ArrowForward sx={{ fontSize: 15 }} />
                    </span>
                  </Button>
                ) : nextSubdomainInfo ? (
                  <Button
                    variant="contained"
                    className="sa-wizard-footer-btn sa-wizard-footer-btn--next"
                    onClick={() => {
                      handleGoToNextSubdomain();
                      scrollMobileToTop?.();
                    }}
                    sx={{
                      textTransform: "none",
                      fontWeight: 600,
                      bgcolor: at.primary,
                      "&:hover": { bgcolor: at.dark },
                    }}
                  >
                    <span className="sa-wizard-btn-inline">
                      <span>Next</span>
                      <ArrowForward sx={{ fontSize: 15 }} />
                    </span>
                  </Button>
                ) : null}

                {!isReadOnly ? (
                  <Button
                    variant="outlined"
                    className="sa-wizard-footer-btn sa-wizard-footer-btn--cancel"
                    onClick={handleCancel}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                    Cancel
                  </Button>
                ) : null}
              </>
            ) : (
              <>
                {!isReadOnly ? (
                  <Button
                    variant="outlined"
                    onClick={handleCancel}
                    sx={{ textTransform: "none", fontWeight: 600 }}
                  >
                    Cancel
                  </Button>
                ) : (
                  <Box />
                )}

                <Stack direction="row" spacing={1.5}>
                  {!isFirstQuestionInSubdomain ? (
                    <Button
                      variant="outlined"
                      startIcon={<ArrowBack />}
                      onClick={() => {
                        handlePreviousQuestion();
                        scrollMobileToTop?.();
                      }}
                      sx={{ textTransform: "none", fontWeight: 600 }}
                    >
                      Previous
                    </Button>
                  ) : null}

                  {!isLastQuestionInSubdomain ? (
                    <Button
                      variant="contained"
                      endIcon={<ArrowForward />}
                      onClick={() => {
                        handleNextQuestion();
                        scrollMobileToTop?.();
                      }}
                      disabled={!isReadOnly && needsClassFilters && !filtersReady}
                      sx={{
                        textTransform: "none",
                        fontWeight: 600,
                        bgcolor: at.primary,
                        "&:hover": { bgcolor: at.dark },
                      }}
                    >
                      Next question
                    </Button>
                  ) : (
                    <>
                      {nextSubdomainInfo ? (
                        <Button
                          variant="outlined"
                          endIcon={<ArrowForward />}
                          onClick={() => {
                            handleGoToNextSubdomain();
                            scrollMobileToTop?.();
                          }}
                          sx={{ textTransform: "none", fontWeight: 600 }}
                        >
                          Next subdomain
                        </Button>
                      ) : null}
                      {!isReadOnly ? (
                        <Button
                          variant="contained"
                          onClick={handleSubmit}
                          disabled={isSaveAssessmentDisabled()}
                          startIcon={
                            submitSubdomainWiseAnswersMutation.isPending ? (
                              <CircularProgress size={18} color="inherit" />
                            ) : null
                          }
                          sx={{
                            textTransform: "none",
                            fontWeight: 600,
                            bgcolor: colors.accent.green,
                            "&:hover": { bgcolor: colors.accent.greenDark },
                          }}
                        >
                          {submitSubdomainWiseAnswersMutation.isPending
                            ? "Saving..."
                            : "Save assessment"}
                        </Button>
                      ) : null}
                    </>
                  )}
                </Stack>
              </>
            )}
          </Box>
        </Box>
      ) : null}
    </Box>
  );
}
