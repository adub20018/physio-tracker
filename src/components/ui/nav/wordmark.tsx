// Logo + "PhysiMate" text, linking home. Shared by the auth pages' header
// and the mobile nav drawer's title — the only two places that pair the
// logo with the text wordmark rather than showing the logo alone (the
// authenticated app's top bar) or the text alone.
import Image from "next/image";
import Link from "next/link";

export function Wordmark() {
  return (
    <Link href="/" className="wordmark">
      {/* Decorative: the adjacent text already says "PhysiMate", so a real
          alt here would have screen readers announce it twice. */}
      <Image src="/PhysiMate-logo.svg" alt="" width={22} height={30} priority />
      <div>
        Physi<em>Mate</em>
      </div>
    </Link>
  );
}
