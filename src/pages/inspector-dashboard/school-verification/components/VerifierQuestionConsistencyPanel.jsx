import React, { useRef, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from "@mui/material";
import { CloudUpload as CloudUploadIcon } from "@mui/icons-material";
import { colors } from "../../../../constants/colors";
import { enqueueSnackbar } from "notistack";
import {
  uploadVerifierSchoolVerificationAadhaar,
  useUpsertVerifierQuestionConsistencyMutation,
  useVerifierQuestionConsistencyQuery,
} from "../../../../services/verifierService";

const CONSISTENCY_QUESTION_GU =
  "સ્વ મૂલ્યાંકન માં આપવામાં આવેલ ગુણ અને તેના આધારો સુસંગત છે?";

export function VerifierQuestionConsistencyPanel({
  questionId,
  subDomainId,
  schoolId,
  assessmentId,
  readOnly = false,
  compact = true,
}) {
  const inputRef = useRef(null);
  const [isUploadingAadhaar, setIsUploadingAadhaar] = useState(false);

  const { data, isLoading } = useVerifierQuestionConsistencyQuery({
    schoolId,
    questionId,
    enabled: Boolean(schoolId && questionId),
  });

  const saveMutation = useUpsertVerifierQuestionConsistencyMutation();

  const isConsistent = data?.isConsistent ?? null;
  const aadhaarFileName = data?.aadhaarFileName ?? null;
  const isSaving = saveMutation.isPending;

  const handleConsistencyChange = async (_event, value) => {
    if (!value || readOnly || isSaving) return;
    await saveMutation.mutateAsync({
      schoolId,
      questionId,
      subDomainId: subDomainId ?? null,
      assessmentId: assessmentId ?? null,
      isConsistent: value,
      aadhaarFileName: value === "yes" ? aadhaarFileName : null,
    });
  };

  const handleAadhaarSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file || readOnly || isConsistent !== "yes") return;

    try {
      setIsUploadingAadhaar(true);
      const fileName = await uploadVerifierSchoolVerificationAadhaar(file);
      await saveMutation.mutateAsync({
        schoolId,
        questionId,
        subDomainId: subDomainId ?? null,
        assessmentId: assessmentId ?? null,
        isConsistent: "yes",
        aadhaarFileName: fileName,
      });
    } catch (error) {
      if (!error?.response) {
        enqueueSnackbar(error?.message || "Aadhaar upload failed", { variant: "error" });
      }
    } finally {
      setIsUploadingAadhaar(false);
    }
  };

  return (
    <Box
      className="sa-verifier-question-consistency"
      sx={{
        display: "flex",
        flexDirection: compact ? { xs: "column", md: "row" } : "column",
        alignItems: compact ? { xs: "stretch", md: "center" } : "stretch",
        gap: compact ? { xs: 0.75, md: 1.25 } : 1,
        flexShrink: 0,
        maxWidth: compact ? { xs: "100%", md: "52%" } : "100%",
      }}
    >
      <Typography
        variant="caption"
        sx={{
          fontWeight: 700,
          color: colors.text.secondary,
          lineHeight: 1.4,
          flex: compact ? { md: "1 1 auto" } : undefined,
        }}
        lang="gu"
      >
        {CONSISTENCY_QUESTION_GU}
      </Typography>

      <Box
        sx={{
          display: "flex",
          flexDirection: compact ? { xs: "column", sm: "row" } : "column",
          alignItems: compact ? { xs: "stretch", sm: "center" } : "stretch",
          gap: 0.75,
          flexShrink: 0,
        }}
      >
        {isLoading ? (
          <CircularProgress size={18} sx={{ alignSelf: "center" }} />
        ) : (
          <ToggleButtonGroup
            exclusive
            value={isConsistent}
            onChange={handleConsistencyChange}
            disabled={readOnly || isSaving}
            size="small"
            sx={{
              "& .MuiToggleButton-root": {
                px: 1.75,
                py: 0.35,
                fontWeight: 700,
                textTransform: "none",
                fontSize: "0.8125rem",
              },
            }}
          >
            <ToggleButton value="yes" lang="gu">
              હા
            </ToggleButton>
            <ToggleButton value="no" lang="gu">
              ના
            </ToggleButton>
          </ToggleButtonGroup>
        )}

        {isConsistent === "yes" && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
            <input
              ref={inputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
              hidden
              onChange={handleAadhaarSelect}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={
                isUploadingAadhaar ? <CircularProgress size={14} /> : <CloudUploadIcon />
              }
              disabled={readOnly || isUploadingAadhaar || isSaving}
              onClick={() => inputRef.current?.click()}
              sx={{ textTransform: "none", fontWeight: 600, py: 0.35 }}
            >
              {aadhaarFileName ? "Replace Aadhaar" : "Upload Aadhaar"}
            </Button>
            {aadhaarFileName ? (
              <Typography variant="caption" color="success.main" sx={{ fontWeight: 600 }}>
                {aadhaarFileName}
              </Typography>
            ) : null}
          </Box>
        )}
      </Box>
    </Box>
  );
}
