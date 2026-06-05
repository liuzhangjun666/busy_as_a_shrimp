import { describe, expect, it } from "vitest";

import {
  filterCampusOpportunities,
  LOCKED_ROW_START_INDEX,
  type CampusOpportunity,
  isOpportunityLocked
} from "./campus-recruitment-section";

const mockOpportunities: CampusOpportunity[] = [
  {
    companyName: "字节跳动",
    industry: "互联网",
    companyIndustry: "互联网",
    logoGradient: "from-indigo-500 to-blue-500",
    recruitmentType: "日常实习",
    location: "北京",
    startDate: "2026-03-18",
    endDate: "2026-05-15",
    noWrittenTest: true,
    position: "前端开发工程师",
    announcementUrl: "https://jobs.bytedance.com/campus/position/frontend-2026",
    applyUrl: "https://jobs.bytedance.com/campus/apply/frontend-2026"
  },
  {
    companyName: "腾讯",
    industry: "互联网",
    companyIndustry: "互联网",
    logoGradient: "from-blue-500 to-teal-400",
    recruitmentType: "暑期实习",
    location: "深圳",
    startDate: "2026-03-20",
    endDate: "2026-05-30",
    noWrittenTest: false,
    position: "产品经理",
    announcementUrl: "https://join.qq.com/post/detail?jobId=summer-pm-2026",
    applyUrl: "https://join.qq.com/apply/summer-pm-2026"
  },
  {
    companyName: "小米",
    industry: "智能硬件",
    companyIndustry: "智能硬件",
    logoGradient: "from-orange-500 to-amber-400",
    recruitmentType: "秋招提前批",
    location: "武汉",
    startDate: "2026-04-10",
    endDate: "2026-07-05",
    noWrittenTest: true,
    position: "嵌入式开发工程师",
    announcementUrl: "https://hr.xiaomi.com/campus/notice/embedded-2026",
    applyUrl: "https://hr.xiaomi.com/campus/apply/embedded-2026"
  }
];

describe("campus recruitment section helpers", () => {
  it("locks rows from the sixth item onward when current user is locked", () => {
    expect(LOCKED_ROW_START_INDEX).toBe(5);
    expect(isOpportunityLocked(4, false)).toBe(false);
    expect(isOpportunityLocked(5, true)).toBe(true);
    expect(isOpportunityLocked(8, false)).toBe(false);
  });

  it("filters only by industry, position, or location with case-insensitive fuzzy matching", () => {
    expect(filterCampusOpportunities("", mockOpportunities)).toHaveLength(mockOpportunities.length);

    const byIndustry = filterCampusOpportunities("互联网", mockOpportunities);
    expect(byIndustry.length).toBeGreaterThan(0);
    expect(byIndustry.every((item) => (item.companyIndustry ?? "").includes("互联网"))).toBe(true);

    const byPosition = filterCampusOpportunities("产品经理", mockOpportunities);
    expect(byPosition).toHaveLength(1);
    expect(byPosition[0]?.position).toContain("产品经理");

    const byLocation = filterCampusOpportunities("北京", mockOpportunities);
    expect(byLocation.length).toBeGreaterThan(0);
    expect(byLocation.every((item) => item.location === "北京")).toBe(true);

    const shouldNotMatchRecruitmentType = filterCampusOpportunities("暑期实习", mockOpportunities);
    expect(shouldNotMatchRecruitmentType).toHaveLength(0);

    const syntheticData = [
      {
        ...mockOpportunities[0],
        companyIndustry: "Internet",
        position: "Frontend Engineer",
        location: "Shanghai"
      }
    ];
    expect(filterCampusOpportunities("frontEND", syntheticData)).toHaveLength(1);
  });
});
