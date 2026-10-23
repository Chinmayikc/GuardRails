import Link from "next/link";
import { FileText, ShieldCheck } from "lucide-react";
import DeepScanButton from "@/app/DeepScanButton";
import { publicAnalysisAction } from "@/lib/publicAnalysisAction";

type Props = {
  extensionId: string;
  version: string;
  scanned: boolean;
  fullAnalysisHref?: string;
  scanSupported?: boolean;
  scanSupportReason?: string;
};

export default function PublicAnalysisCallout({
  extensionId,
  version,
  scanned,
  fullAnalysisHref,
  scanSupported,
  scanSupportReason,
}: Props) {
  const action = publicAnalysisAction({
    extensionId,
    version,
    fullAnalysisHref,
    scanned,
  });

  return (
    <section className="summaryBody">
      <div>
        <span className="kicker">Decision context</span>
        <h1>
          {scanned
            ? "Use this completed analysis before you install."
            : "Read the published evidence before you install."}
        </h1>
        <p>
          {scanned
            ? "This completed report is public and tied to the exact extension version. Sign-in is only needed for workspace actions."
            : "Publisher documentation and release history are public. Request a Deep Scan when you need security evidence for this version."}
        </p>
      </div>
      <aside>
        {scanned ? (
          <Link className="button buttonDark" href={action.href}>
            {action.label}
            <ShieldCheck size={16} />
          </Link>
        ) : (
          <DeepScanButton
            extensionId={extensionId}
            version={version}
            scanSupported={scanSupported}
            scanSupportReason={scanSupportReason}
          />
        )}
        <Link
          className="button buttonQuiet"
          href={`/extensions/${encodeURIComponent(extensionId)}`}
        >
          Read README and releases <FileText size={16} />
        </Link>
      </aside>
    </section>
  );
}
