import { useMemo, useRef, useState } from "react";
import { enqueueSnackbar } from "notistack";
import {
  useGetAllDistrictsQuery,
  useGetDistrictWiseBlocksQuery,
} from "../../../services/masterService";
import {
  registerVerifier,
  uploadVerifierRegistrationDocument,
} from "../../../services/verifierRegistrationService";
import {
  EXCLUDED_DISTRICT_NAME_PATTERN,
  INITIAL_VERIFIER_FORM,
} from "../constants/verifierRegistrationOptions";
import {
  calculateAgeFromDob,
  getRelatedValidationFields,
  validateVerifierRegistrationField,
  validateVerifierRegistrationForm,
} from "../utils/verifierRegistrationValidation";

function normalizeDistrictOptions(list) {
  return (list || [])
    .map((district) => {
      const districtId = String(
        district.value ?? district.districtId ?? district.id ?? "",
      );
      const districtName =
        district.name || district.districtName || district.label || districtId;
      if (!districtId) return null;
      return {
        ...district,
        districtId,
        districtName,
        value: districtId,
        name: districtName,
      };
    })
    .filter(Boolean)
    .filter(
      (district) => !EXCLUDED_DISTRICT_NAME_PATTERN.test(district.districtName),
    );
}

function normalizeBlockOptions(list) {
  return (list || [])
    .map((block) => {
      const blockId = String(block.value ?? block.blockId ?? block.id ?? "");
      const blockName = block.name || block.blockName || block.label || blockId;
      if (!blockName) return null;
      return { ...block, blockId, blockName, value: blockId, name: blockName };
    })
    .filter(Boolean);
}

function useDistrictOptions() {
  const { data } = useGetAllDistrictsQuery();
  const apiDistricts = data?.data || data || [];

  return useMemo(
    () => normalizeDistrictOptions(apiDistricts),
    [apiDistricts],
  );
}

function resolveDistrictQueryId(districtId) {
  if (!districtId || districtId === "none") return undefined;
  return districtId;
}

function toDistrictPayload(value) {
  if (!value || value === "none") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function toTalukaPayload(districtValue, talukaValue) {
  if (!districtValue || districtValue === "none") return null;
  const list = Array.isArray(talukaValue)
    ? talukaValue
    : String(talukaValue || "")
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
  const joined = list
    .map((item) => String(item || "").trim())
    .filter(Boolean)
    .slice(0, 3)
    .join(", ");
  return joined || null;
}

function useTalukaOptions(districtId) {
  const queryId = resolveDistrictQueryId(districtId);
  const { data } = useGetDistrictWiseBlocksQuery(queryId);
  return useMemo(
    () => normalizeBlockOptions(data?.data || data || []),
    [data],
  );
}

function getAadhaarConfirmError(aadhaarNumber, confirmAadhaarNumber) {
  if (!confirmAadhaarNumber || !aadhaarNumber) return "";
  if (confirmAadhaarNumber === aadhaarNumber) return "";
  return "Aadhaar Numbers must match";
}

function applyFieldSideEffects(prev, field, value) {
  const next = { ...prev, [field]: value };

  if (field === "preferredDistrict1") next.preferredTaluka1 = [];
  if (field === "preferredDistrict2") next.preferredTaluka2 = [];
  if (field === "preferredDistrict3") next.preferredTaluka3 = [];

  if (field === "occupation") {
    if (value !== "employed") {
      next.organizationType = "";
    }
    if (value !== "employed" && value !== "nivruti") {
      next.currentSchoolLevel = "";
      next.currentSchoolLevelOther = "";
      next.currentDesignation = "";
    }
  }

  if (field === "currentSchoolLevel") {
    next.currentDesignation = "";
    if (value !== "other") next.currentSchoolLevelOther = "";
  }

  if (field === "specialEducationalAchievement" && value !== "yes") {
    next.specialEducationalAchievementDetails = "";
    next.specialEducationalAchievementFile = null;
  }

  if (field === "previousAccreditationWork" && value !== "yes") {
    next.previousAccreditationDuration = "";
  }

  if (field === "otherVerificationExperience" && value !== "yes") {
    next.otherVerificationDetails = "";
  }

  if (field === "hasVehicle" && value !== "yes") {
    next.vehicleType = "";
    next.hasDrivingLicense = "";
  }

  return next;
}

function toPayload(form, specialEducationalAchievementFileName = null) {
  const hasWorkDetails =
    form.occupation === "employed" || form.occupation === "nivruti";
  const professionalQualifications = form.professionalQualifications || [];
  const hasSpecialAchievement = form.specialEducationalAchievement === "yes";

  return {
    fullName: form.fullName.trim(),
    gender: form.gender,
    teacherCode: form.teacherCode.trim() || null,
    schoolDiseCode: form.schoolDiseCode.trim() || null,
    nativeDistrictId: toDistrictPayload(form.nativeDistrictId),
    jobDistrictId: toDistrictPayload(form.jobDistrictId),
    email: form.email.trim(),
    dateOfBirth: form.dateOfBirth,
    mobileNumber: form.mobileNumber.trim(),
    educationalQualification: form.educationalQualification,
    professionalQualifications,
    professionalQualificationOther: professionalQualifications.includes("other")
      ? form.professionalQualificationOther.trim()
      : null,
    computerKnowledge: form.computerKnowledge,
    languageSkills: form.languageSkills || [],
    occupation: form.occupation,
    organizationType:
      form.occupation === "employed" ? form.organizationType : null,
    currentSchoolLevel: hasWorkDetails ? form.currentSchoolLevel : null,
    currentSchoolLevelOther:
      hasWorkDetails && form.currentSchoolLevel === "other"
        ? form.currentSchoolLevelOther.trim()
        : null,
    currentDesignation: hasWorkDetails
      ? form.currentDesignation.trim()
      : null,
    experienceYears: Number(form.experienceYears),
    experienceMonths:
      form.experienceMonths === "" || form.experienceMonths == null
        ? 0
        : Number(form.experienceMonths),
    specialEducationalAchievement: form.specialEducationalAchievement || null,
    specialEducationalAchievementDetails: hasSpecialAchievement
      ? form.specialEducationalAchievementDetails.trim() || null
      : null,
    specialEducationalAchievementFileName: hasSpecialAchievement
      ? specialEducationalAchievementFileName
      : null,
    previousAccreditationWork: form.previousAccreditationWork,
    previousAccreditationDuration:
      form.previousAccreditationWork === "yes"
        ? form.previousAccreditationDuration.trim()
        : null,
    otherVerificationExperience: form.otherVerificationExperience,
    otherVerificationDetails:
      form.otherVerificationExperience === "yes"
        ? form.otherVerificationDetails.trim()
        : null,
    preferredDistrict1: toDistrictPayload(form.preferredDistrict1),
    preferredDistrict2: toDistrictPayload(form.preferredDistrict2),
    preferredDistrict3: toDistrictPayload(form.preferredDistrict3),
    preferredTaluka1: toTalukaPayload(
      form.preferredDistrict1,
      form.preferredTaluka1,
    ),
    preferredTaluka2: toTalukaPayload(
      form.preferredDistrict2,
      form.preferredTaluka2,
    ),
    preferredTaluka3: toTalukaPayload(
      form.preferredDistrict3,
      form.preferredTaluka3,
    ),
    hasVehicle: form.hasVehicle,
    vehicleType: form.hasVehicle === "yes" ? form.vehicleType : null,
    hasDrivingLicense:
      form.hasVehicle === "yes" ? form.hasDrivingLicense : null,
    workDuration: form.workDuration,
    aadhaarNumber: form.aadhaarNumber.trim(),
    confirmAadhaarNumber: form.confirmAadhaarNumber.trim(),
    aadhaarFileName: null,
    bankAccountName: form.bankAccountName.trim(),
    bankAccountNumber: form.bankAccountNumber.trim(),
    bankIfsc: form.bankIfsc.trim().toUpperCase(),
    bankBranch: form.bankBranch.trim(),
    bankName: form.bankName.trim(),
    bankAddress: form.bankAddress.trim(),
    nocFileName: null,
    selfDeclaration: Boolean(form.selfDeclaration),
    willingToJoin: Boolean(form.willingToJoin),
    selfDeclarationFileName: null,
  };
}

export function useVerifierRegistrationForm() {
  const [form, setForm] = useState(INITIAL_VERIFIER_FORM);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const formRef = useRef(form);
  formRef.current = form;

  const districts = useDistrictOptions();
  const talukaOptions1 = useTalukaOptions(form.preferredDistrict1);
  const talukaOptions2 = useTalukaOptions(form.preferredDistrict2);
  const talukaOptions3 = useTalukaOptions(form.preferredDistrict3);

  const age = useMemo(
    () => calculateAgeFromDob(form.dateOfBirth),
    [form.dateOfBirth],
  );

  const clearErrors = (fields) => {
    setErrors((prev) => {
      let changed = false;
      const nextErrors = { ...prev };
      fields.forEach((field) => {
        if (nextErrors[field]) {
          delete nextErrors[field];
          changed = true;
        }
      });
      return changed ? nextErrors : prev;
    });
  };

  const applyFieldErrors = (nextForm, fields) => {
    setErrors((prev) => {
      const nextErrors = { ...prev };

      fields.forEach((field) => {
        let message = validateVerifierRegistrationField(nextForm, field);

        if (field === "confirmAadhaarNumber") {
          const matchError = getAadhaarConfirmError(
            nextForm.aadhaarNumber,
            nextForm.confirmAadhaarNumber,
          );
          if (matchError) message = matchError;
        }

        if (message) nextErrors[field] = message;
        else delete nextErrors[field];
      });

      return nextErrors;
    });
  };

  const updateField = (field) => (event) => {
    let value =
      event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;

    if (
      field === "experienceYears" ||
      field === "previousAccreditationDuration"
    ) {
      value = String(value ?? "").replace(/\D/g, "").slice(0, 2);
    }

    if (field === "experienceMonths") {
      value = String(value ?? "").replace(/\D/g, "").slice(0, 2);
      if (value !== "" && Number(value) > 11) value = "11";
    }

    if (field === "teacherCode" || field === "schoolDiseCode") {
      value = String(value ?? "")
        .replace(/\D/g, "")
        .slice(0, field === "schoolDiseCode" ? 15 : 20);
    }

    if (field === "bankIfsc") {
      value = String(value ?? "")
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .slice(0, 11);
    }

    if (
      field === "mobileNumber" ||
      field === "aadhaarNumber" ||
      field === "confirmAadhaarNumber" ||
      field === "bankAccountNumber"
    ) {
      const maxLen =
        field === "mobileNumber"
          ? 10
          : field === "bankAccountNumber"
            ? 18
            : 12;
      value = String(value ?? "").replace(/\D/g, "").slice(0, maxLen);
    }

    setForm((prev) => {
      const nextForm = applyFieldSideEffects(prev, field, value);
      formRef.current = nextForm;
      return nextForm;
    });

    clearErrors(getRelatedValidationFields(field));
  };

  const setSpecialAchievementFile = (file) => {
    setForm((prev) => {
      const nextForm = {
        ...prev,
        specialEducationalAchievementFile: file || null,
      };
      formRef.current = nextForm;
      return nextForm;
    });
  };

  const blurField = (field) => () => {
    applyFieldErrors(formRef.current, [field]);
  };

  const toggleMultiValue = (field) => (value) => {
    setForm((prev) => {
      const current = prev[field] || [];
      const exists = current.includes(value);
      const nextValues = exists
        ? current.filter((item) => item !== value)
        : [...current, value];
      const nextForm = {
        ...prev,
        [field]: nextValues,
      };
      if (
        field === "professionalQualifications" &&
        !nextValues.includes("other")
      ) {
        nextForm.professionalQualificationOther = "";
      }
      formRef.current = nextForm;
      return nextForm;
    });
    clearErrors(getRelatedValidationFields(field));
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const currentForm = formRef.current;
    const validationErrors = validateVerifierRegistrationForm(currentForm);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      enqueueSnackbar("Please correct the highlighted fields.", {
        variant: "warning",
      });
      return;
    }

    setPreviewOpen(true);
  };

  const closePreview = () => {
    if (submitting) return;
    setPreviewOpen(false);
  };

  const handleConfirmSubmit = async () => {
    const currentForm = formRef.current;
    const validationErrors = validateVerifierRegistrationForm(currentForm);

    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      setPreviewOpen(false);
      enqueueSnackbar("Please correct the highlighted fields.", {
        variant: "warning",
      });
      return;
    }

    setSubmitting(true);

    try {
      let specialFileName = null;
      if (
        currentForm.specialEducationalAchievement === "yes" &&
        currentForm.specialEducationalAchievementFile
      ) {
        specialFileName = await uploadVerifierRegistrationDocument(
          currentForm.specialEducationalAchievementFile,
        );
      }

      const payload = toPayload(currentForm, specialFileName);
      await registerVerifier(payload);

      enqueueSnackbar(
        "અરજી કર્યાથી વેરિફાયર તરીકે પસંદગી કે કામગીરી માટેનો કોઈ હક કે દાવો કરી શકાશે નહીં. પસંદગીનો અંતિમ નિર્ણય GCERT-GSQAC નો રહેશે.",
        { variant: "success", autoHideDuration: 8000 },
      );
      setPreviewOpen(false);
      setForm(INITIAL_VERIFIER_FORM);
      formRef.current = INITIAL_VERIFIER_FORM;
      setErrors({});
    } catch (error) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Registration failed. Please try again.";
      enqueueSnackbar(message, { variant: "error" });
    } finally {
      setSubmitting(false);
    }
  };

  return {
    form,
    errors,
    age,
    submitting,
    previewOpen,
    districts,
    talukaOptions: {
      1: talukaOptions1,
      2: talukaOptions2,
      3: talukaOptions3,
    },
    updateField,
    blurField,
    toggleMultiValue,
    setSpecialAchievementFile,
    handleSubmit,
    closePreview,
    handleConfirmSubmit,
  };
}
