import React, { useMemo } from "react";
import { Button } from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { SelfAssessmentLayout } from "../../../school-dashboard/self-assessment/components/SelfAssessmentLayout";
import ConfirmationModal from "../../../../components/ConfirmationModal/ConfirmationModal";
import { VerifierEvidenceApprovalPanel } from "../../../../components/VerifierEvidenceApprovalPanel/VerifierEvidenceApprovalPanel";
import { VerifierQuestionConsistencyPanel } from "./VerifierQuestionConsistencyPanel";
import { SchoolVerificationInfoPanel } from "./SchoolVerificationInfoPanel";
import { questionRequiresEvidence } from "../../../../services/evidenceService";
import { INSPECTOR_ALLOCATED_SCHOOLS_URL } from "../../../../routes/routeUrls";

export function SchoolVerificationPageView({ c }) {
  const { t } = useTranslation();
  const {
    schoolId,
    schoolFromState,
    schoolData,
    selectedAssessment,
    selectedAssessmentId,
    selectedSubdomain,
    assessmentTheme,
    languageCode,
    isReadOnly,
    showSubmitConfirmation,
    setShowSubmitConfirmation,
    handleConfirmSubmit,
    submitAssessmentMutation,
    navigate,
  } = c;

  const enhanced = useMemo(
    () => ({
      ...c,
      layoutMode: "verifier",
      pageTitle: t("schoolVerification.title", "School verification"),
      pageSubtitle: t("schoolVerification.subtitle", "Verify and assess school quality standards"),
      onNavigateBack: () => navigate(INSPECTOR_ALLOCATED_SCHOOLS_URL),
      renderPageHeaderExtra: () => (
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(INSPECTOR_ALLOCATED_SCHOOLS_URL)}
          sx={{
            mb: 1,
            textTransform: "none",
            fontWeight: 700,
            color: assessmentTheme?.primary || "primary.main",
          }}
        >
          {t("schoolVerification.backToSchools", "Back to allocated schools")}
        </Button>
      ),
      renderDomainsPanelExtra: () => (
        <SchoolVerificationInfoPanel
          variant="strip"
          schoolFromState={schoolFromState}
          schoolData={schoolData}
          schoolId={schoolId}
          assessmentTheme={assessmentTheme}
        />
      ),
      renderQuestionHeaderExtra: ({ question }) =>
        question?.questionId ? (
          <VerifierQuestionConsistencyPanel
            questionId={question.questionId}
            subDomainId={
              selectedSubdomain?.subDomainId || selectedSubdomain?.id || null
            }
            schoolId={schoolId}
            assessmentId={
              selectedAssessment?.assessmentId ?? selectedAssessmentId ?? null
            }
            readOnly={isReadOnly}
            compact
          />
        ) : null,
      renderQuestionEvidencePanel: ({ question }) =>
        questionRequiresEvidence(question) ? (
          <VerifierEvidenceApprovalPanel
            questionId={question.questionId}
            question={question}
            schoolId={schoolId}
            assessmentId={
              selectedAssessment?.assessmentId ?? selectedAssessmentId ?? null
            }
            selectedAssessment={selectedAssessment}
            readOnly={isReadOnly}
            languageCode={(languageCode || "EN").toLowerCase()}
          />
        ) : null,
    }),
    [
      c,
      t,
      navigate,
      schoolFromState,
      schoolData,
      schoolId,
      assessmentTheme,
      selectedSubdomain,
      selectedAssessment,
      selectedAssessmentId,
      languageCode,
      isReadOnly,
    ],
  );

  return (
    <>
      <SelfAssessmentLayout c={enhanced} />
      <ConfirmationModal
        open={showSubmitConfirmation}
        onClose={() => setShowSubmitConfirmation(false)}
        onConfirm={handleConfirmSubmit}
        title={t("schoolVerification.submitTitle", "Submit verification")}
        message={t(
          "schoolVerification.submitMessage",
          "Are you sure you want to submit this school verification? You will not be able to edit your answers after submission.",
        )}
        confirmText={t("schoolVerification.submitConfirm", "Submit verification")}
        cancelText={t("common.cancel", "Cancel")}
        isLoading={submitAssessmentMutation.isPending}
        variant="warning"
      />
    </>
  );
}
