import React, { useRef, useState } from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import {
  CheckCircle as CheckCircleIcon,
  Close as CloseIcon,
  CloudUpload as CloudUploadIcon,
  Description as DescriptionIcon,
  Gavel as GavelIcon,
  OpenInNew as OpenInNewIcon,
  Visibility as VisibilityIcon,
} from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { enqueueSnackbar } from "notistack";
import { getAssessmentTheme } from "../../utils/assessmentTheme";
import {
  getEvidenceSlotName,
  questionRequiresEvidence,
} from "../../services/evidenceService";
import {
  uploadVerifierEvidenceRejectionProof,
  useSchoolQuestionEvidenceForVerifierQuery,
  useUpsertEvidenceReviewMutation,
} from "../../services/verifierService";
import "./VerifierEvidenceApprovalPanel.css";

const DEFAULT_THEME = getAssessmentTheme(null);

function getThemeVars(theme) {
  const at = theme || DEFAULT_THEME;
  return {
    "--evidence-primary": at.primary,
    "--evidence-dark": at.dark,
    "--evidence-lightest": at.lightest,
    "--evidence-border": `${at.primary}40`,
    "--evidence-icon-bg": `${at.primary}1a`,
    "--evidence-shadow": `${at.primary}14`,
    "--evidence-gradient": at.panelGradient,
  };
}

function formatFileSize(bytes) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function EvidencePreviewDialog({ open, onClose, title, fileName, viewUrl, isPdf, isMobile }) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      fullScreen={isMobile}
    >
      <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Box>
          <Typography variant="subtitle1" fontWeight={800}>
            {title}
          </Typography>
          {fileName ? (
            <Typography variant="caption" color="text.secondary">
              {fileName}
            </Typography>
          ) : null}
        </Box>
        <IconButton size="small" onClick={onClose} aria-label="Close">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        {viewUrl && isPdf ? (
          <Box sx={{ height: { xs: "70vh", md: "65vh" } }}>
            <iframe title="Evidence preview" src={viewUrl} style={{ width: "100%", height: "100%", border: 0 }} />
          </Box>
        ) : viewUrl ? (
          <Box sx={{ textAlign: "center" }}>
            <img src={viewUrl} alt="Evidence" style={{ maxWidth: "100%", maxHeight: "70vh", borderRadius: 8 }} />
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: "center" }}>
            Preview not available. Open in a new tab.
          </Typography>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} sx={{ textTransform: "none" }}>
          Close
        </Button>
        {viewUrl ? (
          <Button
            variant="contained"
            startIcon={<OpenInNewIcon />}
            onClick={() => window.open(viewUrl, "_blank", "noopener,noreferrer")}
            sx={{ textTransform: "none", fontWeight: 700 }}
          >
            Open in new tab
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  );
}

function SlotReviewActions({
  slot,
  schoolId,
  questionId,
  assessmentId,
  readOnly,
  assessmentTheme,
  onSaved,
}) {
  const { t, i18n } = useTranslation();
  const inputRef = useRef(null);
  const [rejectReason, setRejectReason] = useState(slot.review?.rejectReason || "");
  const [pendingStatus, setPendingStatus] = useState(slot.review?.status || "pending");
  const [proofFileName, setProofFileName] = useState(slot.review?.verifierProofFileName || null);
  const [isUploading, setIsUploading] = useState(false);
  const [preview, setPreview] = useState(null);

  const reviewMutation = useUpsertEvidenceReviewMutation({
    onSuccess: () => onSaved?.(),
  });

  const status = slot.review?.status || "pending";
  const isSaving = reviewMutation.isPending;
  const at = assessmentTheme || DEFAULT_THEME;

  const handleStatusChange = async (_event, value) => {
    if (!value || readOnly || isSaving) return;
    setPendingStatus(value);

    if (value === "approved") {
      await reviewMutation.mutateAsync({
        schoolId,
        questionId,
        evidenceSlotId: slot.evidenceSlotId,
        status: "approved",
        assessmentId,
      });
      setProofFileName(null);
      return;
    }

    if (value === "rejected" && !proofFileName) {
      enqueueSnackbar(
        t("schoolVerification.evidence.proofRequired", "Upload rejection proof before rejecting"),
        { variant: "warning" },
      );
    }
  };

  const handleProofSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || readOnly) return;

    try {
      setIsUploading(true);
      const fileName = await uploadVerifierEvidenceRejectionProof(file);
      setProofFileName(fileName);
      await reviewMutation.mutateAsync({
        schoolId,
        questionId,
        evidenceSlotId: slot.evidenceSlotId,
        status: "rejected",
        rejectReason: rejectReason.trim() || null,
        verifierProofFileName: fileName,
        assessmentId,
      });
    } catch (error) {
      if (!error?.response) {
        enqueueSnackbar(error?.message || "Proof upload failed", { variant: "error" });
      }
    } finally {
      setIsUploading(false);
    }
  };

  const handleRejectReasonBlur = async () => {
    if (readOnly || pendingStatus !== "rejected" || !proofFileName) return;
    if (rejectReason.trim() === (slot.review?.rejectReason || "")) return;
    await reviewMutation.mutateAsync({
      schoolId,
      questionId,
      evidenceSlotId: slot.evidenceSlotId,
      status: "rejected",
      rejectReason: rejectReason.trim() || null,
      verifierProofFileName: proofFileName,
      assessmentId,
    });
  };

  const statusChipMap = {
    pending: { label: t("schoolVerification.evidence.pending", "Pending"), color: "default" },
    approved: { label: t("schoolVerification.evidence.approved", "Approved"), color: "success" },
    rejected: { label: t("schoolVerification.evidence.rejected", "Rejected"), color: "error" },
  };
  const statusChip = statusChipMap[status] || statusChipMap.pending;

  return (
    <>
      <Box className="verifier-evidence-slot__review-row">
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Typography className="verifier-evidence-slot__label">
            {t("schoolVerification.evidence.yourReview", "Your review")}
          </Typography>
          <Chip size="small" label={statusChip.label} color={statusChip.color} variant="outlined" />
        </Box>

        <ToggleButtonGroup
          exclusive
          size="small"
          value={pendingStatus === "pending" ? null : pendingStatus}
          onChange={handleStatusChange}
          disabled={readOnly || isSaving || isUploading}
          sx={{ alignSelf: "flex-start" }}
        >
          <ToggleButton value="approved" sx={{ textTransform: "none", fontWeight: 700, px: 2 }}>
            {t("schoolVerification.evidence.approve", "Approve")}
          </ToggleButton>
          <ToggleButton value="rejected" sx={{ textTransform: "none", fontWeight: 700, px: 2 }}>
            {t("schoolVerification.evidence.reject", "Reject")}
          </ToggleButton>
        </ToggleButtonGroup>

        {(pendingStatus === "rejected" || status === "rejected") && (
          <Box className="verifier-evidence-slot__proof">
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,application/pdf"
              hidden
              onChange={handleProofSelect}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={isUploading ? <CircularProgress size={16} /> : <CloudUploadIcon />}
              onClick={() => inputRef.current?.click()}
              disabled={readOnly || isUploading || isSaving}
              sx={{
                textTransform: "none",
                fontWeight: 700,
                borderColor: at.primary,
                color: at.primary,
              }}
            >
              {proofFileName
                ? t("schoolVerification.evidence.replaceProof", "Replace proof")
                : t("schoolVerification.evidence.uploadProof", "Upload proof")}
            </Button>
            {proofFileName ? (
              <Chip
                size="small"
                icon={<CheckCircleIcon />}
                label={proofFileName}
                sx={{ maxWidth: "100%" }}
              />
            ) : null}
            {slot.review?.verifierProof?.previewUrl ? (
              <Tooltip title={t("schoolVerification.evidence.viewProof", "View proof")}>
                <IconButton
                  size="small"
                  onClick={() =>
                    setPreview({
                      title: t("schoolVerification.evidence.proofPreview", "Rejection proof"),
                      fileName: slot.review.verifierProofFileName,
                      viewUrl: slot.review.verifierProof.previewUrl,
                      isPdf: /\.pdf$/i.test(slot.review.verifierProofFileName || ""),
                    })
                  }
                >
                  <VisibilityIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ) : null}
          </Box>
        )}

        {(pendingStatus === "rejected" || status === "rejected") && (
          <TextField
            size="small"
            fullWidth
            multiline
            minRows={2}
            label={t("schoolVerification.evidence.rejectReason", "Reason (optional)")}
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            onBlur={handleRejectReasonBlur}
            disabled={readOnly || !proofFileName}
          />
        )}
      </Box>

      <EvidencePreviewDialog
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.title}
        fileName={preview?.fileName}
        viewUrl={preview?.viewUrl}
        isPdf={preview?.isPdf}
      />
    </>
  );
}

export function VerifierEvidenceApprovalPanel({
  questionId,
  question,
  schoolId,
  assessmentId,
  selectedAssessment,
  languageCode = "en",
  readOnly = false,
}) {
  const { t, i18n } = useTranslation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [preview, setPreview] = useState(null);

  const assessmentTheme = selectedAssessment
    ? getAssessmentTheme(selectedAssessment)
    : DEFAULT_THEME;

  const lang = (languageCode || i18n.language || "en").slice(0, 2).toLowerCase();
  const apiLang = lang === "gu" ? "GU" : lang === "hi" ? "HI" : "EN";

  const { data, isLoading, refetch } = useSchoolQuestionEvidenceForVerifierQuery({
    schoolId,
    questionId,
    languageCode: apiLang,
    enabled: Boolean(schoolId && questionId && questionRequiresEvidence(question)),
  });

  if (!questionRequiresEvidence(question)) return null;

  if (data?.evidenceOptional) return null;

  const slots = data?.slots || [];

  if (isLoading) {
    return (
      <Box className="verifier-evidence-panel" style={getThemeVars(assessmentTheme)}>
        <Box className="verifier-evidence-panel__loading">
          <CircularProgress size={22} />
          <Typography variant="body2">
            {t("schoolVerification.evidence.loading", "Loading school evidence…")}
          </Typography>
        </Box>
      </Box>
    );
  }

  if (slots.length === 0) {
    return (
      <Box className="verifier-evidence-panel" style={getThemeVars(assessmentTheme)}>
        <Box className="verifier-evidence-panel__empty">
          <DescriptionIcon color="disabled" />
          <Typography variant="body2" color="text.secondary">
            {t("schoolVerification.evidence.noSlots", "No evidence configured for this question.")}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Box className="verifier-evidence-panel" style={getThemeVars(assessmentTheme)}>
      <Box className="verifier-evidence-panel__header">
        <Box className="verifier-evidence-panel__title">
          <GavelIcon sx={{ color: assessmentTheme.primary, fontSize: 22 }} />
          <Box>
            <Typography variant="subtitle2" fontWeight={800}>
              {t("schoolVerification.evidence.title", "Evidence verification")}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t(
                "schoolVerification.evidence.subtitle",
                "Review school documents — school answers are hidden",
              )}
            </Typography>
          </Box>
        </Box>
        <Chip
          size="small"
          label={`${data?.summary?.mandatoryUploaded ?? 0}/${data?.summary?.mandatoryTotal ?? 0} ${t("schoolVerification.evidence.uploaded", "uploaded")}`}
          sx={{ fontWeight: 700, bgcolor: `${assessmentTheme.primary}12`, color: assessmentTheme.primary }}
        />
      </Box>

      <Box className="verifier-evidence-panel__body">
        {slots.map((slot) => {
          const hasFile = Boolean(slot.evidence?.evidenceId);
          const reviewStatus = slot.review?.status || "pending";
          const slotClass =
            reviewStatus === "approved"
              ? "verifier-evidence-slot verifier-evidence-slot--approved"
              : reviewStatus === "rejected"
                ? "verifier-evidence-slot verifier-evidence-slot--rejected"
                : "verifier-evidence-slot";

          return (
            <Box key={slot.evidenceSlotId} className={slotClass}>
              <Box className="verifier-evidence-slot__col">
                <Typography className="verifier-evidence-slot__label">
                  {t("schoolVerification.evidence.schoolDocument", "School document")}
                </Typography>
                <Box
                  className={`verifier-evidence-slot__doc${
                    hasFile ? " verifier-evidence-slot__doc--filled" : ""
                  }`}
                >
                  <Box className="verifier-evidence-slot__doc-icon">
                    <DescriptionIcon sx={{ color: assessmentTheme.primary }} />
                  </Box>
                  <Box className="verifier-evidence-slot__doc-info">
                    <Typography className="verifier-evidence-slot__doc-name">
                      {getEvidenceSlotName(slot, lang)}
                    </Typography>
                    <Typography className="verifier-evidence-slot__doc-meta">
                      {hasFile
                        ? slot.evidence.fileName +
                          (slot.evidence.fileSizeBytes
                            ? ` · ${formatFileSize(slot.evidence.fileSizeBytes)}`
                            : "")
                        : t("schoolVerification.evidence.notUploaded", "Not uploaded by school")}
                    </Typography>
                  </Box>
                  {hasFile && slot.evidence?.previewUrl ? (
                    <Box className="verifier-evidence-slot__actions">
                      <Tooltip title={t("schoolVerification.evidence.view", "View")}>
                        <IconButton
                          size="small"
                          onClick={() =>
                            setPreview({
                              title: getEvidenceSlotName(slot, lang),
                              fileName: slot.evidence.fileName,
                              viewUrl: slot.evidence.previewUrl,
                              isPdf: /\.pdf$/i.test(slot.evidence.fileName || ""),
                            })
                          }
                        >
                          <VisibilityIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t("schoolVerification.evidence.open", "Open")}>
                        <IconButton
                          size="small"
                          onClick={() =>
                            window.open(slot.evidence.previewUrl, "_blank", "noopener,noreferrer")
                          }
                        >
                          <OpenInNewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  ) : null}
                </Box>
              </Box>

              <Box className="verifier-evidence-slot__col">
                <SlotReviewActions
                  slot={slot}
                  schoolId={schoolId}
                  questionId={questionId}
                  assessmentId={assessmentId}
                  readOnly={readOnly}
                  assessmentTheme={assessmentTheme}
                  onSaved={() => refetch()}
                />
              </Box>
            </Box>
          );
        })}
      </Box>

      <EvidencePreviewDialog
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title={preview?.title}
        fileName={preview?.fileName}
        viewUrl={preview?.viewUrl}
        isPdf={preview?.isPdf}
        isMobile={isMobile}
      />
    </Box>
  );
}
