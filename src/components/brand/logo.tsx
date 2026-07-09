import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

type LogoProps = {
  size?: "sm" | "md" | "lg";
  href?: string;
  centered?: boolean;
  className?: string;
};

const heights = {
  sm: "h-10",
  md: "h-14",
  lg: "h-20",
};

export function Logo({
  size = "md",
  href,
  centered = false,
  className,
}: LogoProps) {
  const content = (
    <div
      className={cn(
        "inline-flex items-center",
        centered && "w-full justify-center",
        className
      )}
    >
      <Image
        src="/logo.jpeg"
        alt="Linguigo"
        width={200}
        height={300}
        className={cn("w-auto object-contain", heights[size])}
        priority={size === "lg"}
      />
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
