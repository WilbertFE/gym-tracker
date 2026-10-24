"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { credentialsSchema, type Credentials } from "@/lib/validation/auth";

export function LoginForm() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Credentials>({ resolver: zodResolver(credentialsSchema) });

  async function onSubmit(values: Credentials) {
    const res = await fetch(`/api/auth/${mode}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const body = await res.json().catch(() => ({}));

    if (!res.ok) {
      toast.error(body.error ?? "Something went wrong");
      return;
    }
    if (body.needsConfirmation) {
      toast.success("Check your email to confirm your account");
      setMode("login");
      return;
    }
    router.replace("/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4" noValidate>
      <div className="flex flex-col gap-2">
        <Label htmlFor="email" className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Email
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          className="h-11"
          aria-invalid={!!errors.email}
          {...register("email")}
        />
        {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="password" className="text-[11px] uppercase tracking-widest text-muted-foreground">
          Password
        </Label>
        <Input
          id="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          className="h-11"
          aria-invalid={!!errors.password}
          {...register("password")}
        />
        {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
      </div>

      <Button type="submit" className="h-11" disabled={isSubmitting}>
        {isSubmitting ? "Working" : mode === "login" ? "Sign in" : "Create account"}
      </Button>

      <button
        type="button"
        onClick={() => setMode(mode === "login" ? "signup" : "login")}
        className="min-h-11 text-xs text-muted-foreground hover:text-foreground"
      >
        {mode === "login" ? "No account yet? Create one" : "Have an account? Sign in"}
      </button>
    </form>
  );
}
