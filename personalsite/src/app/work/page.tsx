import { getJobsFromYaml } from "@/utils/jobUtils";
import { WorkTimelineClient } from "./WorkTimelineClient";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Work",
  description: "Karthik Thyagarajan's work experience, roles, and professional timeline.",
};

export default function WorkPage() {
  const jobs = getJobsFromYaml();
  return <WorkTimelineClient jobs={jobs} />;
}
