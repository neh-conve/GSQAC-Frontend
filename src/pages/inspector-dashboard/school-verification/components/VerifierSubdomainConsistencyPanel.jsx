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
import { SubdomainEvidencePanel } from "../../../../components/SubdomainEvidencePanel/SubdomainEvidencePanel";
import { enqueueSnackbar } from "notistack";
import {
  uploadVerifierSchoolVerificationAadhaar,
  useUpsertVerifierSubdomainConsistencyMutation,
  useVerifierSubdomainConsistencyQuery,
} from "../../../../services/verifierService";

const CONSISTENCY_QUESTION_GU =
  "સ્વ મૂલ્યાંકન માં આપવામાં આવેલ ગુણ અને તેના આધારો સુસંગત છે?";

export function VerifierSubdomainConsistencyPanel({
  subDomainId,
  schoolId,
  assessmentId,
  selectedAssessment,
  selectedSubdomain,
  selectedDomain,
  languageCode,
  readOnly = false,
}) {
  const inputRef = useRef(null);
  const [isUploadingAadhaar, setIsUploadingAadhaar] = useState(false);

  const { data, isLoading } = useVerifierSubdomainConsistencyQuery({
    schoolId,
    subDomainId,
    enabled: Boolean(schoolId && subDomainId),
  });

  const saveMutation = useUpsertVerifierSubdomainConsistencyMutation();

  const isConsistent = data?.isConsistent ?? null;
  const aadhaarFileName = data?.aadhaarFileName ?? null;
  const isSaving = saveMutation.isPending;

  const handleConsistencyChange = async (_event, value) => {
    if (!value || readOnly || isSaving) return;
    await saveMutation.mutateAsync({
      schoolId,
      subDomainId,
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
        subDomainId,
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
      sx={{
        minWidth: { xs: "100%", sm: 320 },
        maxWidth: { xs: "100%", md: 420 },
        p: 2,
        borderRadius: 2,
        border: `1.5px solid ${colors.neutral.gray200}`,
        bgcolor: "white",
      }}
    >
      <Typography
        variant="body2"
        sx={{
          fontWeight: 700,
          color: colors.text.primary,
          mb: 1.5,
          lineHeight: 1.5,
        }}
        lang="gu"
      >
        {CONSISTENCY_QUESTION_GU}
      </Typography>

      {isLoading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 1 }}>
          <CircularProgress size={22} />
        </Box>
      ) : (
        <ToggleButtonGroup
          exclusive
          value={isConsistent}
          onChange={handleConsistencyChange}
          disabled={readOnly || isSaving}
          size="small"
          sx={{
            mb: 1.5,
            "& .MuiToggleButton-root": {
              px: 2.5,
              fontWeight: 700,
              textTransform: "none",
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
        <Box sx={{ mt: 1 }}>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
            નવું આધાર કાર્ડ અપલોડ કરો / Upload new Aadhaar
          </Typography>
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
              isUploadingAadhaar ? <CircularProgress size={16} /> : <CloudUploadIcon />
            }
            disabled={readOnly || isUploadingAadhaar || isSaving}
            onClick={() => inputRef.current?.click()}
            sx={{ textTransform: "none", fontWeight: 600 }}
          >
            {aadhaarFileName ? "Replace Aadhaar" : "Upload Aadhaar"}
          </Button>
          {aadhaarFileName ? (
            <Typography variant="caption" color="success.main" display="block" sx={{ mt: 0.75 }}>
              Uploaded: {aadhaarFileName}
            </Typography>
          ) : null}
        </Box>
      )}

      <Box sx={{ mt: 2, pt: 2, borderTop: `1px solid ${colors.neutral.gray200}` }}>
        <SubdomainEvidencePanel
          subDomainId={subDomainId}
          schoolId={schoolId}
          assessmentId={assessmentId ?? null}
          selectedAssessment={selectedAssessment}
          subdomain={selectedSubdomain}
          domainName={selectedDomain ? selectedDomain.domainName : ""}
          readOnly={readOnly}
          variant="compact"
          languageCode={(languageCode || "EN").toLowerCase()}
          className="verifier-subdomain-evidence-header"
        />
      </Box>
    </Box>
  );
}
