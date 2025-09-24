import { getJobsFromYaml } from "@/utils/jobUtils";
import { WorkTimelineClient } from "./WorkTimelineClient";

export default function WorkPage() {
  const jobs = getJobsFromYaml();
  return <WorkTimelineClient jobs={jobs} />;
}