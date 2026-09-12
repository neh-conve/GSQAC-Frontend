import React from "react";
import { Box, Chip, Paper, Typography } from "@mui/material";
import { LocationOn as LocationIcon, School as SchoolIcon } from "@mui/icons-material";
import { useTranslation } from "react-i18next";
import { colors } from "../../../../constants/colors";
import "./SchoolVerificationInfoPanel.css";

function InfoChip({ label, value, theme }) {
  if (!value && value !== 0) return null;
  return (
    <Chip
      size="small"
      label={
        <Box component="span" sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
          <Box component="span" sx={{ fontWeight: 700, opacity: 0.85 }}>
            {label}:
          </Box>
          <Box component="span">{value}</Box>
        </Box>
      }
      sx={{
        height: "auto",
        py: 0.35,
        bgcolor: `${theme.primary}10`,
        color: colors.text.primary,
        border: `1px solid ${theme.primary}22`,
        "& .MuiChip-label": { px: 1, whiteSpace: "normal" },
      }}
    />
  );
}

export function SchoolVerificationInfoPanel({
  schoolFromState,
  schoolData,
  schoolId,
  assessmentTheme,
  variant = "card",
}) {
  const { t } = useTranslation();
  const at = assessmentTheme || {
    primary: colors.primary.blue,
    dark: colors.primary.dark,
    label: "Academic",
  };

  const schoolName =
    schoolFromState?.schoolName ||
    schoolData?.schoolName ||
    t("schoolVerification.schoolNameFallback");
  const displaySchoolId = schoolId || schoolFromState?.schoolId || t("common.na", "N/A");

  const districtName =
    schoolData?.districtName || schoolFromState?.districtName || null;
  const blockName = schoolData?.blockName || schoolFromState?.blockName || null;
  const clusterName = schoolData?.clusterName || schoolFromState?.clusterName || null;
  const villageName = schoolData?.villageName || schoolFromState?.villageName || null;

  if (variant === "strip") {
    return (
      <Box
        className={`sv-info-strip sv-info-panel--${at.kind || "academic"}`}
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 1,
          flexWrap: "wrap",
          mt: 1,
          pt: 1,
          borderTop: `1px solid ${at.primary}18`,
        }}
      >
        <SchoolIcon sx={{ fontSize: 18, color: at.primary, flexShrink: 0 }} />
        <Typography
          variant="caption"
          sx={{ fontWeight: 800, color: colors.text.primary, lineHeight: 1.35 }}
          noWrap
        >
          {schoolName}
        </Typography>
        <InfoChip label={t("schoolVerification.schoolId")} value={displaySchoolId} theme={at} />
        {districtName ? (
          <InfoChip label={t("schoolVerification.district")} value={districtName} theme={at} />
        ) : null}
        {blockName ? (
          <InfoChip label={t("schoolVerification.block")} value={blockName} theme={at} />
        ) : null}
      </Box>
    );
  }

  return (
    <Box className={`sv-info-panel sv-info-panel--${at.kind || "academic"}`} sx={{ mb: 1.5 }}>
      <Paper
        elevation={0}
        className="sv-info-school-card"
        sx={{
          p: { xs: 2, md: 2.5 },
          mb: 2,
          borderRadius: 2.5,
          border: `1px solid ${at.primary}28`,
          background: at.panelGradient,
          boxShadow: `0 6px 24px ${at.primary}12`,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "flex-start", gap: 2, flexWrap: "wrap" }}>
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 2.5,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: at.gradient,
              color: "#fff",
              boxShadow: `0 6px 18px ${at.primary}35`,
              flexShrink: 0,
            }}
          >
            <SchoolIcon />
          </Box>
          <Box sx={{ flex: 1, minWidth: 220 }}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap", mb: 0.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, color: colors.text.primary }}>
                {schoolName}
              </Typography>
              {at.label ? (
                <Chip
                  size="small"
                  label={at.label}
                  sx={{
                    fontWeight: 800,
                    fontSize: "0.625rem",
                    letterSpacing: 0.4,
                    textTransform: "uppercase",
                    bgcolor: `${at.primary}12`,
                    color: at.primary,
                    border: `1px solid ${at.primary}30`,
                  }}
                />
              ) : null}
            </Box>
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
              <InfoChip
                label={t("schoolVerification.schoolId")}
                value={displaySchoolId}
                theme={at}
              />
              {schoolFromState?.schoolCode ? (
                <InfoChip
                  label={t("schoolVerification.schoolCode")}
                  value={schoolFromState.schoolCode}
                  theme={at}
                />
              ) : null}
              {districtName ? (
                <InfoChip label={t("schoolVerification.district")} value={districtName} theme={at} />
              ) : null}
              {blockName ? (
                <InfoChip label={t("schoolVerification.block")} value={blockName} theme={at} />
              ) : null}
              {clusterName ? (
                <InfoChip
                  label={t("schoolVerification.cluster", "Cluster")}
                  value={clusterName}
                  theme={at}
                />
              ) : null}
              {villageName ? (
                <InfoChip
                  label={t("schoolVerification.village", "Village")}
                  value={villageName}
                  theme={at}
                />
              ) : null}
            </Box>
            {(districtName || blockName) && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5, mt: 1.25 }}>
                <LocationIcon sx={{ fontSize: 16, color: at.primary }} />
                <Typography variant="caption" color="text.secondary" fontWeight={600}>
                  {[districtName, blockName, clusterName].filter(Boolean).join(" · ")}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Paper>
    </Box>
  );
}
