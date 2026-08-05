// Logo + "PhysiMate" text, linking home. Shared by the auth header and the
// mobile nav drawer title — elsewhere the logo or text appears alone.
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
