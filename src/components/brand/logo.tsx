import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  showText?: boolean;
  size?: "sm" | "md" | "lg";
  href?: string;
  className?: string;
};

const sizes = {
  sm: { icon: 28, text: "text-sm" },
  md: { icon: 36, text: "text-base" },
  lg: { icon: 48, text: "text-lg" },
};

export function Logo({
  showText = true,
  size = "md",
  href,
  className,
}: LogoProps) {
  const content = (
    <div className={cn("flex items-center gap-2.5", className)}>
      <Image
        src="/logo.jpeg"
        alt="Linguigo"
        width={sizes[size].icon}
        height={sizes[size].icon}
        className="rounded-lg"
        priority
      />
      {showText ? (
        <span
          className={cn(
            "font-semibold tracking-tight text-foreground",
            sizes[size].text
          )}
        >
          LINGUIGO
        </span>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="transition-opacity hover:opacity-80">
        {content}
      </Link>
    );
  }

  return content;
}
