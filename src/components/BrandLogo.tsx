import Image from "next/image";

type BrandLogoProps = {
  inverse?: boolean;
  compact?: boolean;
  className?: string;
};

export default function BrandLogo({
  inverse = false,
  compact = false,
  className = "",
}: BrandLogoProps) {
  const width = compact ? 132 : 184;
  const height = compact ? 48 : 58;

  return (
    <div className={`flex items-center ${className}`} aria-label="Siesie">
      <Image
        src={inverse ? "/logo-white.png" : "/logo-green.png"}
        alt="Siesie"
        width={width}
        height={height}
        priority={inverse}
        className={`${compact ? "h-12 w-[132px]" : "h-auto w-auto"} max-w-full object-contain`}
      />
    </div>
  );
}