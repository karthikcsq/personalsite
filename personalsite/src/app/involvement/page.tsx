import { getInvolvementsFromYaml } from "@/utils/involvementUtils";
import { InvolvementClient } from "./InvolvementClient";
import { HashScroller } from "@/app/components/HashScroller";

export default function InvolvementPage() {
  const involvements = getInvolvementsFromYaml();
  return (
    <>
      <HashScroller />
      <InvolvementClient involvements={involvements} />
    </>
  );
}
