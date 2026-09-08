import React from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { StatCard, ChartCard, CustomTooltip, DonutCenter } from "../shared/chartPrimitives";

const ICONS = {
  schools: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  ),
  check: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  play: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  clock: (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export function SchoolSelfAssessmentStatusSection({
  c,
  heading = "School Self-Assessment Status",
  compact = false,
}) {
  const { districtId, selectedDistrict, selfAssessmentCounts } = c;

  const totalSchools = selfAssessmentCounts.totalEligibleSchools ?? 0;
  const requiredPerSchool = selfAssessmentCounts.requiredAssessmentsPerSchool ?? 0;
  const hasData = totalSchools > 0 || (selfAssessmentCounts.totalAssessmentSlots ?? 0) > 0;
  const chartData = selfAssessmentCounts.chartData || [];
  const scopeName = selectedDistrict?.name || (districtId ? "selected district" : "all school logins");
  const requiredLabel =
    requiredPerSchool > 0
      ? `each school against ${requiredPerSchool} published form${requiredPerSchool > 1 ? "s" : ""} for its school type`
      : "each school against published forms for its school type";

  return (
    <div className={compact ? "ado-self-assessment-embed" : ""}>
      <div className="ado-section-heading-row">
        <div>
          {!compact && <p className="ado-section-eyebrow">School forms</p>}
          <h2 className="ado-section-title">{heading}</h2>
          <p className="ado-section-desc">
            {districtId
              ? `Of ${totalSchools} schools in ${scopeName} · ${requiredLabel}`
              : `Of ${totalSchools} active schools · select a district for the full school list · ${requiredLabel}`}
          </p>
        </div>
        {hasData && (
          <span className="ado-section-badge">
            {selfAssessmentCounts.completedSchools ?? 0}/{totalSchools} schools completed
          </span>
        )}
      </div>

      <div className="ado-self-assessment-band">
        <div className="ado-stats-grid ado-stats-grid--self-assessment">
          <StatCard
            label="Total Schools"
            value={totalSchools}
            sub={
              districtId
                ? "Active schools in this district (in school_master)"
                : "Active schools statewide (in school_master)"
            }
            tone="indigo"
            icon={ICONS.schools}
          />
          <StatCard
            label="Completed"
            value={selfAssessmentCounts.completedSchools ?? 0}
            sub="Filled every required form"
            tone="green"
            progress={selfAssessmentCounts.completionRate}
            icon={ICONS.check}
          />
          <StatCard
            label="Started"
            value={selfAssessmentCounts.startedSchools ?? 0}
            sub="Began at least one required form"
            tone="blue"
            icon={ICONS.play}
          />
          <StatCard
            label="Pending"
            value={selfAssessmentCounts.notStartedSchools ?? 0}
            sub="Not started any required form"
            tone="amber"
            icon={ICONS.clock}
          />
        </div>

        {hasData && chartData.length > 0 && (
          <ChartCard
            title="School status"
            subtitle={`${totalSchools} schools · completed / started / pending`}
            className="ado-self-assessment-chart"
            accent="cyan"
            icon="📊"
          >
            <div className="ado-donut-wrap ado-self-assessment-chart-wrap">
              <ResponsiveContainer width="100%" height={compact ? 200 : 220}>
                <PieChart>
                  <Pie
                    data={chartData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={58}
                    outerRadius={82}
                    paddingAngle={3}
                  >
                    {chartData.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <DonutCenter total={totalSchools} label="Schools" />
            </div>
          </ChartCard>
        )}
      </div>
    </div>
  );
}

export function SelfAssessmentTab({ c }) {
  return (
    <div className="ado-tab-panel-inner">
      <SchoolSelfAssessmentStatusSection c={c} />
    </div>
  );
}
