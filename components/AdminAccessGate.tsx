import React, { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import {
  EyeIcon,
  EyeOffIcon,
  LoaderCircleIcon,
  LogOutIcon,
  ShieldCheckIcon,
} from "lucide-react";

import { adminSupabase } from "@/adminSupabaseClient";
import AdminPanelPage from "@/components/AdminPanelPage";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldContent,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const formatAuthError = (error: unknown) => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
      ? error
      : String(error ?? "");

  const normalized = message.toLowerCase();

  if (
    normalized.includes("invalid login credentials") ||
    normalized.includes("invalid_grant")
  ) {
    return "Email atau password belum cocok.";
  }

  if (normalized.includes("email not confirmed")) {
    return "Akun ini belum siap digunakan.";
  }

  if (normalized.includes("failed to fetch")) {
    return "Tidak bisa terhubung. Coba beberapa saat lagi.";
  }

  if (
    normalized.includes("get_admin_access_status") ||
    normalized.includes("function public.get_admin_access_status") ||
    normalized.includes("pgrst202")
  ) {
    return "Sistem login admin sedang belum siap. Coba lagi sebentar lagi.";
  }

  if (
    normalized.includes("akun ini bukan admin utama yang diizinkan") ||
    normalized.includes("bukan admin utama")
  ) {
    return "Akun ini tidak punya akses ke panel admin.";
  }

  if (
    normalized.includes("admin utama belum dikonfigurasi") ||
    normalized.includes("belum dikonfigurasi di database")
  ) {
    return "Akses admin belum siap digunakan.";
  }

  if (
    normalized.includes("pemeriksaan akses admin terlalu lama") ||
    normalized.includes("terlalu lama")
  ) {
    return "Proses masuk sedang lebih lambat dari biasanya. Coba refresh lagi.";
  }

  return message || "Terjadi kendala saat login admin.";
};

const checkAdminAccess = async (session: Session | null) => {
  if (!session) {
    return {
      configured: false,
      allowed: false,
    };
  }

  const timeoutPromise = new Promise<never>((_, reject) => {
    window.setTimeout(() => {
      reject(new Error("Pemeriksaan akses admin terlalu lama. Coba refresh lagi."));
    }, 12000);
  });

  const rpcPromise = adminSupabase.rpc("get_admin_access_status");
  const { data, error } = await Promise.race([rpcPromise, timeoutPromise]);

  if (error) throw error;

  return {
    configured: Boolean(data?.configured),
    allowed: Boolean(data?.allowed),
  };
};

const AdminAccessGate: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [checkingSession, setCheckingSession] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const { data, error } = await adminSupabase.auth.getSession();

        if (!active) return;

        if (error) {
          setErrorText(formatAuthError(error));
          return;
        }

        const access = await checkAdminAccess(data.session);

        if (!active) return;

        if (data.session && !access.configured) {
          await adminSupabase.auth.signOut();
          setSession(null);
          setErrorText("Akses admin belum siap digunakan.");
        } else if (data.session && !access.allowed) {
          await adminSupabase.auth.signOut();
          setSession(null);
          setErrorText("Akun ini tidak punya akses ke panel admin.");
        } else {
          setSession(data.session);
        }
      } catch (error) {
        if (!active) return;
        setSession(null);
        setErrorText(formatAuthError(error));
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = adminSupabase.auth.onAuthStateChange(async (_event, nextSession) => {
      if (!active) return;

      try {
        if (nextSession) {
          const access = await checkAdminAccess(nextSession);

          if (!active) return;

          if (!access.configured) {
            await adminSupabase.auth.signOut();
            setSession(null);
            setErrorText("Akses admin belum siap digunakan.");
            return;
          }

          if (!access.allowed) {
            await adminSupabase.auth.signOut();
            setSession(null);
            setErrorText("Akun ini tidak punya akses ke panel admin.");
            return;
          }
        }

        setSession(nextSession);
      } catch (error) {
        if (!active) return;
        setSession(null);
        setErrorText(formatAuthError(error));
      } finally {
        if (active) {
          setCheckingSession(false);
        }
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    document.documentElement.classList.add("dark");
    document.body.classList.add("dark");

    return () => {
      document.documentElement.classList.remove("dark");
      document.body.classList.remove("dark");
    };
  }, []);

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setErrorText("Isi email dan password admin dulu.");
      return;
    }

    setSubmitting(true);
    setErrorText(null);

    try {
      const { data, error } = await adminSupabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) throw error;

      const access = await checkAdminAccess(data.session);

      if (!access.configured) {
        await adminSupabase.auth.signOut();
        throw new Error("Admin utama belum dikonfigurasi.");
      }

      if (!access.allowed) {
        await adminSupabase.auth.signOut();
        throw new Error("Akun ini tidak punya akses ke panel admin.");
      }

      setPassword("");
    } catch (error) {
      setErrorText(formatAuthError(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    setSubmitting(true);
    setErrorText(null);

    try {
      const { error } = await adminSupabase.auth.signOut();
      if (error) throw error;
      setPassword("");
    } catch (error) {
      setErrorText(formatAuthError(error));
    } finally {
      setSubmitting(false);
    }
  };

  if (checkingSession) {
    return (
      <div className="dark bg-background text-foreground flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center">
            <LoaderCircleIcon className="animate-spin" />
            <div className="flex flex-col gap-1">
              <p className="font-medium">Membuka halaman admin</p>
              <p className="text-muted-foreground text-sm">
                Tunggu sebentar ya.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (session) {
    return (
      <AdminPanelPage
        adminEmail={session.user.email ?? null}
        onRequestSignOut={handleSignOut}
      />
    );
  }

  return (
    <div className="dark bg-background text-foreground flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="text-left">
          <div className="mb-2 flex items-center gap-3">
            <div className="bg-primary/10 text-primary flex size-11 items-center justify-center rounded-2xl">
              <ShieldCheckIcon />
            </div>
            <div className="flex flex-col">
              <CardTitle>Login Admin</CardTitle>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor="admin-email">Email</FieldLabel>
              <FieldContent>
                <Input
                  id="admin-email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="admin@email.com"
                />
              </FieldContent>
            </Field>
            <Field>
              <FieldLabel htmlFor="admin-password">Password</FieldLabel>
              <FieldContent>
                <div className="relative">
                  <Input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Masukkan password admin"
                    className="pr-12"
                    onKeyDown={(event) => {
                      if (event.key === "Enter") {
                        event.preventDefault();
                        void handleLogin();
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute top-1/2 right-1 size-9 -translate-y-1/2 rounded-lg"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </Button>
                </div>
              </FieldContent>
            </Field>
          </FieldGroup>

          {errorText && (
            <Alert variant="destructive" className="mt-4">
              <AlertTitle>Login gagal</AlertTitle>
              <AlertDescription>{errorText}</AlertDescription>
            </Alert>
          )}
        </CardContent>
        <CardFooter>
          <div className="flex w-full items-center justify-end gap-3">
            <Button onClick={() => void handleLogin()} disabled={submitting}>
              {submitting ? (
                <LoaderCircleIcon data-icon="inline-start" className="animate-spin" />
              ) : (
                <LogOutIcon data-icon="inline-start" className="rotate-180" />
              )}
              Masuk
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default AdminAccessGate;
