"use client";

import { useState } from "react";
import { useActionState } from "react";
import { loginAction, signupAction } from "./actions";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export function LoginForm() {
  const [mode, setMode] = useState<"login" | "signup">("login");

  const [state, formAction, pending] = useActionState(
    async (_prev: { error?: string } | null, formData: FormData) => {
      const action = mode === "login" ? loginAction : signupAction;
      return (await action(formData)) ?? null;
    },
    null
  );

  return (
    <Card className="w-full border-border/60 px-2 py-2 shadow-lg shadow-primary/5 sm:px-4">
      <CardHeader className="items-center space-y-4 text-center">
        <Logo size="lg" centered />
        <div>
          <CardTitle className="text-xl">Scheduler</CardTitle>
          <CardDescription className="mt-1">
            {mode === "login"
              ? "Sign in to manage or view your classes."
              : "Create your account. The first user becomes admin."}
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        <div className="mx-auto w-full max-w-sm">
          <form action={formAction} className="space-y-4">
          {mode === "signup" ? (
            <div className="space-y-2">
              <Label htmlFor="full_name">Full name</Label>
              <Input
                id="full_name"
                name="full_name"
                autoComplete="name"
                required
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label htmlFor="email">
              {mode === "login" ? "Username or email" : "Email"}
            </Label>
            <Input
              id="email"
              name="email"
              type={mode === "login" ? "text" : "email"}
              autoComplete={mode === "login" ? "username" : "email"}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete={
                mode === "login" ? "current-password" : "new-password"
              }
              minLength={mode === "signup" ? 6 : undefined}
              required
            />
          </div>
          {state?.error ? (
            <p className="text-sm text-destructive">{state.error}</p>
          ) : null}
          <Button type="submit" className="w-full" disabled={pending}>
            {pending
              ? mode === "login"
                ? "Signing in..."
                : "Creating account..."
              : mode === "login"
                ? "Sign in"
                : "Create account"}
          </Button>
          </form>
          <p className="mt-4 text-center text-sm text-muted-foreground">
            {mode === "login" ? "No account yet?" : "Already have an account?"}{" "}
            <button
              type="button"
              className="font-medium text-primary underline-offset-4 transition-colors hover:underline"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
            >
              {mode === "login" ? "Create one" : "Sign in"}
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
