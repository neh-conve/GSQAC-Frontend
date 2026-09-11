import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CircularProgress } from "@mui/material";
import {
  ArrowForward,
  ArrowBack,
  PersonOutline,
  PhoneOutlined,
  LockOutlined,
  SchoolOutlined,
  VerifiedUserOutlined,
  AdminPanelSettingsOutlined,
  AccountTreeOutlined,
  LocationCityOutlined,
  CheckCircle,
  Star as StarIcon,
  EmojiEvents as EmojiEventsIcon,
  Shield as ShieldIcon,
  KeyboardArrowDown as ArrowDownIcon,
  Visibility,
  VisibilityOff,
} from "@mui/icons-material";
import { enqueueSnackbar } from "notistack";
import { roles, getRoleId, DASHBOARD_ROUTES } from "../../constants/roles";
import {
  useSendOtpMutation,
  useSendSchoolOtpMutation,
  useVerifySchoolOtpMutation,
  useSchoolResetPasswordMutation,
} from "../../services/authService";
import useAuthStore from "../../store/useAuthStore";
import { resolveLoginErrorMessage } from "../../utils/loginMessages";
import "./login.css";

const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [selectedRole, setSelectedRole] = useState("");
  const [userId, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isResetPasswordMode, setIsResetPasswordMode] = useState(false);
  const [mobileNumber, setMobileNumber] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [schoolResetId, setSchoolResetId] = useState(null);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [isOtpVerified, setIsOtpVerified] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState({ role: "", userId: "", password: "" });
  const [resetErrors, setResetErrors] = useState({
    userId: "",
    mobileNumber: "",
    otpCode: "",
    newPassword: "",
    confirmPassword: "",
    form: "",
  });
  const [inputFocused, setInputFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [mobileFocused, setMobileFocused] = useState(false);
  const [otpFocused, setOtpFocused] = useState(false);
  const [newPasswordFocused, setNewPasswordFocused] = useState(false);
  const [confirmPasswordFocused, setConfirmPasswordFocused] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { setUserData } = useAuthStore();

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const roleParam = searchParams.get("role");
    if (roleParam && roles.some((r) => r.value === roleParam)) {
      setSelectedRole(roleParam);
    }
  }, [searchParams]);

  const schoolResetPasswordMutation = useSchoolResetPasswordMutation({
    onSuccess: (data) => {
      enqueueSnackbar(
        data?.data?.message || data?.message || "Password reset successfully",
        { variant: "success" },
      );
      clearResetPasswordState();
      setPassword("");
    },
    onError: (error) => {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to reset password. Please try again.";
      setResetErrors((prev) => ({ ...prev, form: errorMessage }));
    },
  });

  const sendSchoolOtpMutation = useSendSchoolOtpMutation({
    onSuccess: (data) => {
      const otpId =
        data?.data?.id ??
        data?.data?.otpId ??
        data?.id ??
        data?.otpId ??
        null;
      setSchoolResetId(otpId);
      setIsOtpSent(true);
      setIsOtpVerified(false);
      setOtpCode("");
      enqueueSnackbar("OTP sent to your mobile number", { variant: "success" });
    },
    onError: (error) => {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Failed to send OTP. Please try again.";
      setIsOtpSent(false);
      setSchoolResetId(null);
      setResetErrors((prev) => ({ ...prev, form: errorMessage }));
    },
  });

  const verifySchoolOtpMutation = useVerifySchoolOtpMutation({
    onSuccess: () => {
      setIsOtpVerified(true);
      setResetErrors((prev) => ({ ...prev, otpCode: "", form: "" }));
      enqueueSnackbar("OTP verified successfully", { variant: "success" });
    },
    onError: (error) => {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        "Invalid or expired OTP";
      setIsOtpVerified(false);
      setResetErrors((prev) => ({
        ...prev,
        otpCode: errorMessage,
        form: "",
      }));
    },
  });

  const sendOtpMutation = useSendOtpMutation({
    onSuccess: (data) => {
      const firstItem = Array.isArray(data?.data) ? data.data[0] : null;
      const apiUserId =
        data?.userId ||
        data?.data?.userId ||
        firstItem?.userId ||
        firstItem?.id ||
        firstItem?.user?.id ||
        data?.data?.data?.userId;

      const token =
        firstItem?.token ||
        data?.token ||
        data?.accessToken ||
        data?.data?.token ||
        data?.data?.accessToken;

      const apiUserName =
        firstItem?.userName ||
        data?.userName ||
        data?.data?.userName ||
        userId.trim();

      if (!apiUserId || !token) {
        console.error(
          "Missing login details in response. Full response:",
          data,
        );
        setErrors({
          ...errors,
          userId: "Login response is incomplete. Please try again.",
        });
        return;
      }

      const dashboardRoute = DASHBOARD_ROUTES[selectedRole] || "/";
      const normalizedUserId =
        typeof apiUserId === "string" && !Number.isNaN(Number(apiUserId))
          ? Number(apiUserId)
          : apiUserId;

      const rawDistrictId =
        firstItem?.districtId ??
        data?.data?.districtId ??
        data?.districtId ??
        firstItem?.entityId ??
        null;
      const parsedDistrictId = Number(rawDistrictId);
      const apiDistrictId =
        Number.isFinite(parsedDistrictId) && parsedDistrictId > 0
          ? parsedDistrictId
          : null;

      setUserData(
        {
          id: normalizedUserId,
          role: selectedRole,
          name: apiUserName,
          userName: apiUserName,
          districtId: apiDistrictId,
        },
        token,
        selectedRole,
        normalizedUserId,
        apiUserName,
        apiDistrictId,
      );

      navigate(dashboardRoute, { replace: true });
    },
    onError: (error) => {
      console.error("Send OTP Error:", error);
      const rawMessage =
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        "Failed to send OTP. Please try again.";
      const errorMessage = resolveLoginErrorMessage(selectedRole, rawMessage);
      setErrors({ ...errors, userId: errorMessage });
    },
  });

  const getRoleIcon = (roleValue) => {
    const iconMap = {
      school: <SchoolOutlined fontSize="small" />,
      parent: <PersonOutline fontSize="small" />,
      inspector: <VerifiedUserOutlined fontSize="small" />,
      admin: <AdminPanelSettingsOutlined fontSize="small" />,
      nodal: <LocationCityOutlined fontSize="small" />,
      crc: <AccountTreeOutlined fontSize="small" />,
    };
    return iconMap[roleValue] || <PersonOutline fontSize="small" />;
  };

  const clearResetPasswordState = () => {
    setIsResetPasswordMode(false);
    setMobileNumber("");
    setOtpCode("");
    setSchoolResetId(null);
    setIsOtpSent(false);
    setIsOtpVerified(false);
    setNewPassword("");
    setConfirmPassword("");
    setResetErrors({
      userId: "",
      mobileNumber: "",
      otpCode: "",
      newPassword: "",
      confirmPassword: "",
      form: "",
    });
  };

  const sanitizeMobileNumber = (value) => value.replace(/\D/g, "").slice(0, 10);

  const handleRoleSelect = (roleValue) => {
    setSelectedRole(roleValue);
    setErrors({ ...errors, role: "" });
    setUserId("");
    setPassword("");
    setShowPassword(false);
    clearResetPasswordState();
  };

  const handleUserIdChange = (e) => {
    setUserId(e.target.value);
    setErrors({ ...errors, userId: "" });
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    setErrors({ ...errors, password: "" });
  };

  const resetRoleId = getRoleId(selectedRole === "nodal" ? "nodal" : "school");
  const resetUserLabel =
    selectedRole === "nodal" ? "User Name" : "UDISE Code";
  const resetUserPlaceholder =
    selectedRole === "nodal"
      ? "Enter your user name"
      : "Enter your UDISE Code";

  const handleSendSchoolOtp = () => {
    const nextErrors = {
      userId: "",
      mobileNumber: "",
      otpCode: "",
      newPassword: "",
      confirmPassword: "",
      form: "",
    };

    if (!userId.trim()) {
      nextErrors.userId = `Please enter your ${resetUserLabel}`;
      setResetErrors(nextErrors);
      return;
    }

    if (!mobileNumber.trim()) {
      nextErrors.mobileNumber = "Please enter your mobile number";
      setResetErrors(nextErrors);
      return;
    }

    if (mobileNumber.trim().length !== 10) {
      nextErrors.mobileNumber = "Mobile number must be exactly 10 digits";
      setResetErrors(nextErrors);
      return;
    }

    if (!/^[6-9]/.test(mobileNumber.trim())) {
      nextErrors.mobileNumber = "Mobile number must start with 6, 7, 8, or 9";
      setResetErrors(nextErrors);
      return;
    }

    setResetErrors(nextErrors);
    sendSchoolOtpMutation.mutate({
      userName: userId.trim(),
      roleId: resetRoleId,
      mobileNo: mobileNumber.trim(),
    });
  };

  const handleVerifyResetOtp = () => {
    const enteredOtp = otpCode.trim();
    if (!enteredOtp) {
      setResetErrors((prev) => ({
        ...prev,
        otpCode: "Please enter the OTP",
        form: "",
      }));
      return;
    }

    if (enteredOtp.length !== 6) {
      setResetErrors((prev) => ({
        ...prev,
        otpCode: "OTP must be 6 digits",
        form: "",
      }));
      return;
    }

    if (!schoolResetId) {
      setResetErrors((prev) => ({
        ...prev,
        form: "Please send OTP first",
      }));
      return;
    }

    verifySchoolOtpMutation.mutate({
      id: schoolResetId,
      userName: userId.trim(),
      otpCode: enteredOtp,
      roleId: resetRoleId,
    });
  };

  const handleSchoolResetPassword = () => {
    const nextErrors = {
      userId: "",
      mobileNumber: "",
      otpCode: "",
      newPassword: "",
      confirmPassword: "",
      form: "",
    };
    let hasError = false;

    if (!userId.trim()) {
      nextErrors.userId = `Please enter your ${resetUserLabel}`;
      hasError = true;
    }
    if (!isOtpVerified || !schoolResetId) {
      nextErrors.otpCode = "Please verify OTP first";
      hasError = true;
    }
    if (!newPassword.trim()) {
      nextErrors.newPassword = "Please enter a new password";
      hasError = true;
    }
    if (!confirmPassword.trim()) {
      nextErrors.confirmPassword = "Please confirm your new password";
      hasError = true;
    }
    if (
      newPassword.trim() &&
      confirmPassword.trim() &&
      newPassword.trim() !== confirmPassword.trim()
    ) {
      nextErrors.confirmPassword = "Passwords do not match";
      hasError = true;
    }

    if (hasError) {
      setResetErrors(nextErrors);
      return;
    }

    schoolResetPasswordMutation.mutate({
      id: schoolResetId,
      otpCode: otpCode.trim(),
      userName: userId.trim(),
      password: newPassword.trim(),
      roleId: resetRoleId,
    });
  };

  const handleContinue = () => {
    const newErrors = { role: "", userId: "", password: "" };
    let hasError = false;

    if (!selectedRole) {
      newErrors.role = "Please select a role to continue";
      hasError = true;
    }
    if (!userId.trim()) {
      newErrors.userId = "Please enter your User ID";
      hasError = true;
    }
    if (!password.trim()) {
      newErrors.password = "Please enter your password";
      hasError = true;
    }

    if (hasError) {
      setErrors(newErrors);
      return;
    }

    const roleId = getRoleId(selectedRole);
    sendOtpMutation.mutate({
      userName: userId.trim(),
      password: password.trim(),
      roleId,
    });
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleContinue();
  };

  const selectedRoleData = roles.find((r) => r.value === selectedRole);

  return (
    <div className="lp-container">
      {/* ── Left: Branding Panel ── */}
      <div className="lp-visual">
        <div className="lp-visual-pattern" />

        {/* Hero copy — mirrors dashboard ગુણાંકન - 2026 section */}
        <div className="lp-hero-copy">
          {/* <p className="lp-drive-pill">
            <StarIcon
              className="lp-drive-star"
              fontSize="small"
              aria-hidden="true"
            />
            Gujarat&apos;s school quality drive
          </p> */}

          <h1 className="lp-hero-title" lang="gu">
            <span className="lp-hero-title-gu">ગુણાંકન</span>
            <span className="lp-hero-title-sep" aria-hidden>
              {" "}
              -{" "}
            </span>
            <span className="lp-hero-accent">2026</span>
          </h1>

          {/* <div className="lp-mini-cards">
            <article
              className="lp-mini-card lp-mini-card--gold"
              aria-label="GSQAC"
            >
              <EmojiEventsIcon
                className="lp-mini-icon lp-mini-icon--gold"
                aria-hidden="true"
              />
              <p className="lp-mini-kicker">Accreditation council</p>
              <h2 className="lp-mini-acronym">GSQAC</h2>
              <p className="lp-mini-desc">
                Gujarat State Quality Accreditation Council
              </p>
            </article>

            <article
              className="lp-mini-card lp-mini-card--blue"
              aria-label="SQAAF"
            >
              <ShieldIcon
                className="lp-mini-icon lp-mini-icon--blue"
                aria-hidden="true"
              />
              <h2 className="lp-mini-acronym">SQAAF</h2>
              <p className="lp-mini-desc">
                School Quality Assessment and Assurance Framework
              </p>
            </article>
          </div> */}
        </div>

        {/* Bottom accent bar — same orange/green as dashboard separator */}
        <div className="lp-sep">
          <div className="lp-sep-orange" />
          <div className="lp-sep-green" />
        </div>
      </div>

      {/* ── Right: Form Panel ── */}
      <div className="lp-form-panel">
        <div className="lp-form-inner">
          {/* Back to home */}
          <button className="lp-back-btn" onClick={() => navigate("/")}>
            <ArrowBack sx={{ fontSize: 16 }} />
            Back to Home
          </button>

          {/* ── Login card ── */}
          <div className={`lp-card${isResetPasswordMode ? " lp-card--reset" : ""}`}>
            <div className="lp-form-header">
              <h2 className="lp-form-title">
                {isResetPasswordMode ? "Reset Password" : "Welcome Back"}
              </h2>
              <p className="lp-form-subtitle">
                {isResetPasswordMode
                  ? selectedRole === "nodal"
                    ? "Update your district nodal officer password"
                    : "Update your school account password"
                  : "Select your role and sign in to continue"}
              </p>
            </div>

            {/* Role dropdown */}
            {!isResetPasswordMode && (
              <div className="lp-section">
                <span className="lp-section-label">Select your role</span>
                <div
                  className={`lp-dropdown${dropdownOpen ? " lp-dropdown--open" : ""}${errors.role ? " lp-dropdown--error" : ""}`}
                  ref={dropdownRef}
                >
                  {/* Trigger */}
                  <button
                    type="button"
                    className="lp-dropdown-trigger"
                    onClick={() => setDropdownOpen((o) => !o)}
                    aria-haspopup="listbox"
                    aria-expanded={dropdownOpen}
                  >
                    {selectedRole ? (
                      <>
                        <span
                          className="lp-dd-icon"
                          style={{
                            background: `${selectedRoleData.color}18`,
                            color: selectedRoleData.color,
                          }}
                        >
                          {getRoleIcon(selectedRole)}
                        </span>
                        <span className="lp-dd-selected">
                          <span className="lp-dd-name">
                            {selectedRoleData.label}
                          </span>
                          <span className="lp-dd-desc">
                            {selectedRoleData.description}
                          </span>
                        </span>
                      </>
                    ) : (
                      <span className="lp-dd-placeholder">
                        Choose your role…
                      </span>
                    )}
                    <ArrowDownIcon
                      className="lp-dd-arrow"
                      sx={{
                        fontSize: 20,
                        transition: "transform 0.2s",
                        transform: dropdownOpen
                          ? "rotate(180deg)"
                          : "rotate(0deg)",
                      }}
                    />
                  </button>

                  {/* Options menu */}
                  {dropdownOpen && (
                    <div className="lp-dropdown-menu" role="listbox">
                      {roles.map((role) => (
                        <button
                          key={role.value}
                          type="button"
                          role="option"
                          aria-selected={selectedRole === role.value}
                          className={`lp-dd-option${selectedRole === role.value ? " lp-dd-option--active" : ""}`}
                          style={{ "--rc": role.color }}
                          onClick={() => {
                            handleRoleSelect(role.value);
                            setDropdownOpen(false);
                          }}
                        >
                          <span
                            className="lp-dd-icon"
                            style={{
                              background: `${role.color}18`,
                              color: role.color,
                            }}
                          >
                            {getRoleIcon(role.value)}
                          </span>
                          <span className="lp-dd-option-text">
                            <span className="lp-dd-name">{role.label}</span>
                            <span className="lp-dd-desc">
                              {role.description}
                            </span>
                          </span>
                          {selectedRole === role.value && (
                            <CheckCircle
                              sx={{
                                fontSize: 16,
                                color: role.color,
                                flexShrink: 0,
                              }}
                            />
                          )}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                {errors.role && <span className="lp-error">{errors.role}</span>}
              </div>
            )}

            {/* User ID / reset password fields */}
            <div
              className={`lp-input-section${
                selectedRole || isResetPasswordMode ? " lp-input-visible" : ""
              }${isResetPasswordMode ? " lp-input-visible--reset" : ""}${
                isResetPasswordMode && isOtpVerified
                  ? " lp-input-visible--reset-passwords"
                  : ""
              }`}
            >
              {isResetPasswordMode ? (
                <>
                  <span className="lp-section-label">{resetUserLabel}</span>
                  <div
                    className={`lp-input-wrap${inputFocused ? " lp-input-focused" : ""}${resetErrors.userId ? " lp-input-error" : ""}`}
                  >
                    <PersonOutline className="lp-input-adorn" />
                    <input
                      className="lp-input"
                      type="text"
                      placeholder={resetUserPlaceholder}
                      value={userId}
                      onChange={(e) => {
                        handleUserIdChange(e);
                        setResetErrors((prev) => ({ ...prev, userId: "" }));
                        if (isOtpSent) {
                          setIsOtpSent(false);
                          setIsOtpVerified(false);
                          setSchoolResetId(null);
                          setOtpCode("");
                        }
                      }}
                      onFocus={() => setInputFocused(true)}
                      onBlur={() => setInputFocused(false)}
                      autoFocus
                    />
                  </div>
                  {resetErrors.userId && (
                    <span className="lp-error">{resetErrors.userId}</span>
                  )}
                  <div className="lp-field-gap" />
                  <span className="lp-section-label">Mobile Number</span>
                  <div
                    className={`lp-input-wrap${mobileFocused ? " lp-input-focused" : ""}${resetErrors.mobileNumber ? " lp-input-error" : ""}`}
                  >
                    <PhoneOutlined className="lp-input-adorn" />
                    <input
                      className="lp-input"
                      type="tel"
                      inputMode="numeric"
                      placeholder="Enter your registered mobile number"
                      value={mobileNumber}
                      onChange={(e) => {
                        setMobileNumber(sanitizeMobileNumber(e.target.value));
                        setResetErrors((prev) => ({
                          ...prev,
                          mobileNumber: "",
                          form: "",
                        }));
                        if (isOtpSent) {
                          setIsOtpSent(false);
                          setIsOtpVerified(false);
                          setSchoolResetId(null);
                          setOtpCode("");
                        }
                      }}
                      onFocus={() => setMobileFocused(true)}
                      onBlur={() => setMobileFocused(false)}
                    />
                  </div>
                  {resetErrors.mobileNumber && (
                    <span className="lp-error">{resetErrors.mobileNumber}</span>
                  )}
                  <button
                    type="button"
                    className="lp-send-otp-btn"
                    onClick={handleSendSchoolOtp}
                    disabled={
                      !userId.trim() ||
                      !mobileNumber.trim() ||
                      sendSchoolOtpMutation.isPending
                    }
                  >
                    {sendSchoolOtpMutation.isPending ? (
                      <span>Sending OTP…</span>
                    ) : (
                      <span>{isOtpSent ? "Resend OTP" : "Send OTP"}</span>
                    )}
                  </button>
                  {isOtpSent && (
                    <>
                      <div className="lp-field-gap" />
                      <span className="lp-section-label">OTP</span>
                      <div
                        className={`lp-input-wrap${otpFocused ? " lp-input-focused" : ""}${resetErrors.otpCode ? " lp-input-error" : ""}`}
                      >
                        <LockOutlined className="lp-input-adorn" />
                        <input
                          className="lp-input"
                          type="text"
                          inputMode="numeric"
                          placeholder="Enter 6-digit OTP"
                          value={otpCode}
                          disabled={isOtpVerified}
                          onChange={(e) => {
                            setOtpCode(
                              e.target.value.replace(/\D/g, "").slice(0, 6),
                            );
                            setIsOtpVerified(false);
                            setResetErrors((prev) => ({
                              ...prev,
                              otpCode: "",
                            }));
                          }}
                          onFocus={() => setOtpFocused(true)}
                          onBlur={() => setOtpFocused(false)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleVerifyResetOtp();
                          }}
                        />
                      </div>
                      {resetErrors.otpCode && (
                        <span className="lp-error">{resetErrors.otpCode}</span>
                      )}
                      {!isOtpVerified && (
                        <button
                          type="button"
                          className="lp-send-otp-btn"
                          onClick={handleVerifyResetOtp}
                          disabled={
                            !otpCode.trim() ||
                            verifySchoolOtpMutation.isPending
                          }
                        >
                          {verifySchoolOtpMutation.isPending ? (
                            <span>Verifying…</span>
                          ) : (
                            <span>Verify OTP</span>
                          )}
                        </button>
                      )}
                      {isOtpVerified && (
                        <span className="lp-otp-verified">OTP verified</span>
                      )}
                      {isOtpVerified && (
                        <>
                          <div className="lp-field-gap" />
                          <span className="lp-section-label">New Password</span>
                          <div
                            className={`lp-input-wrap${newPasswordFocused ? " lp-input-focused" : ""}${resetErrors.newPassword ? " lp-input-error" : ""}`}
                          >
                            <LockOutlined className="lp-input-adorn" />
                            <input
                              className="lp-input"
                              type="password"
                              placeholder="Enter your new password"
                              value={newPassword}
                              onChange={(e) => {
                                setNewPassword(e.target.value);
                                setResetErrors((prev) => ({
                                  ...prev,
                                  newPassword: "",
                                }));
                              }}
                              onFocus={() => setNewPasswordFocused(true)}
                              onBlur={() => setNewPasswordFocused(false)}
                            />
                          </div>
                          {resetErrors.newPassword && (
                            <span className="lp-error">
                              {resetErrors.newPassword}
                            </span>
                          )}
                          <div className="lp-field-gap" />
                          <span className="lp-section-label">
                            Confirm Password
                          </span>
                          <div
                            className={`lp-input-wrap${confirmPasswordFocused ? " lp-input-focused" : ""}${resetErrors.confirmPassword ? " lp-input-error" : ""}`}
                          >
                            <LockOutlined className="lp-input-adorn" />
                            <input
                              className="lp-input"
                              type="password"
                              placeholder="Confirm your new password"
                              value={confirmPassword}
                              onChange={(e) => {
                                setConfirmPassword(e.target.value);
                                setResetErrors((prev) => ({
                                  ...prev,
                                  confirmPassword: "",
                                }));
                              }}
                              onFocus={() => setConfirmPasswordFocused(true)}
                              onBlur={() => setConfirmPasswordFocused(false)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSchoolResetPassword();
                              }}
                            />
                          </div>
                          {resetErrors.confirmPassword && (
                            <span className="lp-error">
                              {resetErrors.confirmPassword}
                            </span>
                          )}
                        </>
                      )}
                    </>
                  )}
                  {resetErrors.form && (
                    <span className="lp-error lp-error--form">
                      {resetErrors.form}
                    </span>
                  )}
                </>
              ) : selectedRole ? (
                <>
                  <span className="lp-section-label">
                    {selectedRoleData?.authMethod || "User ID"}
                  </span>
                  <div
                    className={`lp-input-wrap${inputFocused ? " lp-input-focused" : ""}${errors.userId ? " lp-input-error" : ""}`}
                  >
                    <PersonOutline className="lp-input-adorn" />
                    <input
                      className="lp-input"
                      type="text"
                      placeholder={`Enter your ${selectedRoleData?.authMethod || "User ID"}`}
                      value={userId}
                      onChange={handleUserIdChange}
                      onFocus={() => setInputFocused(true)}
                      onBlur={() => setInputFocused(false)}
                      onKeyDown={handleKeyDown}
                      autoFocus={!!selectedRole}
                    />
                  </div>
                  {errors.userId && (
                    <span className="lp-error">{errors.userId}</span>
                  )}

                  <div className="lp-field-gap" />

                  <span className="lp-section-label">Password</span>
                  <div
                    className={`lp-input-wrap${passwordFocused ? " lp-input-focused" : ""}${errors.password ? " lp-input-error" : ""}`}
                  >
                    <LockOutlined className="lp-input-adorn" />
                    <input
                      className="lp-input"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password"
                      value={password}
                      onChange={handlePasswordChange}
                      onFocus={() => setPasswordFocused(true)}
                      onBlur={() => setPasswordFocused(false)}
                      onKeyDown={handleKeyDown}
                    />
                    <button
                      type="button"
                      className="lp-password-toggle"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <VisibilityOff sx={{ fontSize: 20 }} />
                      ) : (
                        <Visibility sx={{ fontSize: 20 }} />
                      )}
                    </button>
                  </div>
                  {errors.password && (
                    <span className="lp-error">{errors.password}</span>
                  )}

                  {(selectedRole === "school" || selectedRole === "nodal") && (
                    <button
                      type="button"
                      className="lp-reset-link"
                      onClick={() => {
                        setIsResetPasswordMode(true);
                        setErrors({ role: "", userId: "", password: "" });
                      }}
                    >
                      Reset password?
                    </button>
                  )}
                </>
              ) : null}
            </div>

            {isResetPasswordMode ? (
              <div className="lp-reset-actions">
                {isOtpVerified && (
                  <button
                    type="button"
                    className="lp-continue-btn"
                    onClick={handleSchoolResetPassword}
                    disabled={
                      !userId.trim() ||
                      !newPassword.trim() ||
                      !confirmPassword.trim() ||
                      schoolResetPasswordMutation.isPending
                    }
                    style={{ "--btn-c": "#1e3a8a" }}
                  >
                    {schoolResetPasswordMutation.isPending ? (
                      <>
                        <CircularProgress size={18} color="inherit" />
                        <span>Resetting password…</span>
                      </>
                    ) : (
                      <>
                        <span>Reset Password</span>
                        <ArrowForward sx={{ fontSize: 18 }} />
                      </>
                    )}
                  </button>
                )}
                <button
                  type="button"
                  className="lp-back-login-btn"
                  onClick={clearResetPasswordState}
                  disabled={schoolResetPasswordMutation.isPending}
                >
                  Back to login
                </button>
              </div>
            ) : (
              <button
                className="lp-continue-btn"
                onClick={handleContinue}
                disabled={
                  !selectedRole ||
                  !userId.trim() ||
                  !password.trim() ||
                  sendOtpMutation.isPending
                }
                style={{ "--btn-c": selectedRoleData?.color || "#1e3a8a" }}
              >
                {sendOtpMutation.isPending ? (
                  <>
                    <CircularProgress size={18} color="inherit" />
                    <span>Sending OTP…</span>
                  </>
                ) : (
                  <>
                    <span>Continue Securely</span>
                    <ArrowForward sx={{ fontSize: 18 }} />
                  </>
                )}
              </button>
            )}

            {/* {!isResetPasswordMode && (
            <div className="lp-footer">
              <svg
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
              Secured with OTP verification
            </div>
            )} */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
