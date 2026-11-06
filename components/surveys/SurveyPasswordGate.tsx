"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const storageKey = (surveyId: string) => `visualquery-survey-unlock:${surveyId}`;

export function SurveyPasswordGate({
  surveyId,
  accessPassword,
  title,
  children,
}: {
  surveyId: string;
  accessPassword: string | null;
  title: string;
  children: ReactNode;
}) {
  const required = Boolean(accessPassword?.trim());
  const [ready, setReady] = useState(!required);
  const [unlocked, setUnlocked] = useState(!required);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!required) {
      setReady(true);
      setUnlocked(true);
      return;
    }
    try {
      setUnlocked(sessionStorage.getItem(storageKey(surveyId)) === "1");
    } catch {
      setUnlocked(false);
    }
    setReady(true);
  }, [required, surveyId]);

  if (!required) return <>{children}</>;
  if (!ready) {
    return (
      <main className="flex min-h-svh items-center justify-center p-6 text-sm text-muted-foreground">
        Cargando…
      </main>
    );
  }
  if (unlocked) return <>{children}</>;

  return (
    <main className="flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
          <p className="text-sm text-muted-foreground">
            Esta encuesta está protegida con contraseña.
          </p>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (password.trim() !== accessPassword?.trim()) {
                setError("Contraseña incorrecta");
                return;
              }
              try {
                sessionStorage.setItem(storageKey(surveyId), "1");
              } catch {
                // ignore
              }
              setError(null);
              setUnlocked(true);
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="survey-password">Contraseña</Label>
              <Input
                id="survey-password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
              />
            </div>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            <Button type="submit">Continuar</Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
