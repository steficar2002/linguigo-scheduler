import { LoginForm } from "./login-form";
import { FadeIn } from "@/components/ui/fade-in";

export default function LoginPage() {
  return (
    <div className="relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-br from-white via-[#faf8fd] to-[#f0ebf7] p-6">
      <div className="pointer-events-none absolute -top-24 -right-24 size-64 rounded-full bg-primary/5 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 size-64 rounded-full bg-primary/10 blur-3xl" />
      <FadeIn className="w-full max-w-3xl px-4">
        <LoginForm />
      </FadeIn>
    </div>
  );
}
