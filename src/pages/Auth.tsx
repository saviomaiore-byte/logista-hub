import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Truck, Mail, Lock, User, ArrowLeft, ShieldAlert } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { validatePassword } from "@/lib/passwordPolicy";
import { isLockedOut, recordFailedAttempt, resetAttempts } from "@/lib/rateLimiter";
import { MfaVerify } from "@/components/auth/MfaVerify";

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState(() => localStorage.getItem("rememberEmail") || "");
  const [password, setPassword] = useState("");
  const [nome, setNome] = useState("");
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem("rememberEmail") !== null);
  const [forgotPassword, setForgotPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const ALLOWED_DOMAIN = "@maiore.com.br";

  // Password validation state
  const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
  const [showPasswordErrors, setShowPasswordErrors] = useState(false);

  // Rate limiting state
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  // MFA state
  const [showMfaVerify, setShowMfaVerify] = useState(false);

  // Check lockout on mount
  useEffect(() => {
    const { locked, remainingSeconds } = isLockedOut();
    if (locked) setLockoutSeconds(remainingSeconds);
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const timer = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [lockoutSeconds]);

  // Validate password on change (only for signup)
  useEffect(() => {
    if (!isLogin && password) {
      const result = validatePassword(password);
      setPasswordErrors(result.errors);
    } else {
      setPasswordErrors([]);
    }
  }, [password, isLogin]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
      toast.error(`Apenas emails com domínio ${ALLOWED_DOMAIN} são permitidos.`);
      return;
    }
    setResetLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Email de redefinição enviado! Verifique sua caixa de entrada.");
        setForgotPassword(false);
        setResetEmail("");
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check rate limiting
    const lockStatus = isLockedOut();
    if (lockStatus.locked) {
      setLockoutSeconds(lockStatus.remainingSeconds);
      toast.error(`Muitas tentativas. Aguarde ${Math.ceil(lockStatus.remainingSeconds / 60)} minutos.`);
      return;
    }

    // Validate password on signup
    if (!isLogin) {
      const validation = validatePassword(password);
      if (!validation.isValid) {
        setShowPasswordErrors(true);
        toast.error("A senha não atende aos requisitos mínimos.");
        return;
      }
    }

    setLoading(true);

    try {
      if (!isLogin && !email.toLowerCase().endsWith(ALLOWED_DOMAIN)) {
        toast.error(`Apenas emails com domínio ${ALLOWED_DOMAIN} podem se cadastrar.`);
        return;
      }

      if (isLogin) {
        const { error } = await signIn(email, password);
        if (error) {
          const result = recordFailedAttempt();
          if (result.locked) {
            setLockoutSeconds(300);
            toast.error("Conta bloqueada por 5 minutos devido a muitas tentativas.");
          } else if (error.message === "Email not confirmed") {
            toast.error("Email não confirmado. Verifique sua caixa de entrada.");
          } else {
            toast.error(`${error.message} (${result.remainingAttempts} tentativa(s) restante(s))`);
          }
        } else {
          resetAttempts();

          // Check if user has MFA factors
          const { data: factors } = await supabase.auth.mfa.listFactors();
          const hasTotp = factors?.totp && factors.totp.length > 0;

          if (hasTotp) {
            // Check AAL level
            const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
            if (aalData?.currentLevel === "aal1" && aalData?.nextLevel === "aal2") {
              setShowMfaVerify(true);
              return;
            }
          }

          if (rememberMe) {
            localStorage.setItem("rememberEmail", email);
          } else {
            localStorage.removeItem("rememberEmail");
          }
          toast.success("Login realizado com sucesso!");
          navigate("/");
        }
      } else {
        const { error } = await signUp(email, password, nome);
        if (error) {
          toast.error(error.message);
        } else {
          toast.success("Cadastro realizado! Verifique seu email para confirmar a conta.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (showMfaVerify) {
    return (
      <MfaVerify
        onVerified={() => {
          toast.success("Login realizado com sucesso!");
          navigate("/");
        }}
      />
    );
  }

  if (forgotPassword) {
    return (
      <div className="min-h-screen bg-sidebar flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div className="bg-card rounded-2xl shadow-xl p-8 animate-fade-in">
            <div className="text-center mb-8">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-4">
                <Truck className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="text-2xl font-bold text-foreground">Esqueci minha senha</h1>
            </div>

            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="resetEmail">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="resetEmail"
                    type="email"
                    placeholder="seu@maiore.com.br"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    className="pl-10"
                    required
                  />
                </div>
                <p className="text-xs text-muted-foreground">Apenas emails @maiore.com.br são permitidos.</p>
              </div>

              <Button type="submit" className="w-full" disabled={resetLoading}>
                {resetLoading ? "Enviando..." : "Enviar link de redefinição"}
              </Button>
            </form>

            <div className="mt-6 text-center">
              <button
                type="button"
                onClick={() => { setForgotPassword(false); setResetEmail(""); }}
                className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
              >
                <ArrowLeft className="h-3 w-3" />
                Voltar ao login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-sidebar flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-2xl shadow-xl p-8 animate-fade-in">
          <div className="text-center mb-8">
            <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-primary mb-4">
              <Truck className="h-8 w-8 text-primary-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Pactum Logística</h1>
            <p className="text-muted-foreground mt-1">
              {isLogin ? "Entre na sua conta" : "Crie sua conta"}
            </p>
          </div>

          {lockoutSeconds > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5 text-destructive shrink-0" />
              <p className="text-sm text-destructive">
                Conta bloqueada. Tente novamente em {Math.floor(lockoutSeconds / 60)}:{String(lockoutSeconds % 60).padStart(2, "0")}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="nome">Nome</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="nome"
                    type="text"
                    placeholder="Seu nome completo"
                    value={nome}
                    onChange={(e) => setNome(e.target.value)}
                    className="pl-10"
                    required={!isLogin}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="seu@maiore.com.br"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  required
                />
              </div>
              {!isLogin && (
                <p className="text-xs text-muted-foreground">Apenas emails @maiore.com.br são permitidos.</p>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Senha</Label>
                {isLogin && (
                  <button
                    type="button"
                    onClick={() => setForgotPassword(true)}
                    className="text-xs text-primary hover:underline"
                  >
                    Esqueci minha senha
                  </button>
                )}
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => !isLogin && setShowPasswordErrors(true)}
                  className="pl-10"
                  required
                  minLength={8}
                />
              </div>

              {!isLogin && showPasswordErrors && passwordErrors.length > 0 && (
                <ul className="text-xs space-y-1 mt-1">
                  {passwordErrors.map((err) => (
                    <li key={err} className="text-destructive flex items-center gap-1">
                      <span className="w-1 h-1 rounded-full bg-destructive inline-block" />
                      {err}
                    </li>
                  ))}
                </ul>
              )}

              {!isLogin && showPasswordErrors && passwordErrors.length === 0 && password && (
                <p className="text-xs text-green-600 mt-1">✓ Senha atende aos requisitos</p>
              )}
            </div>

            {isLogin && (
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                />
                <Label htmlFor="rememberMe" className="text-sm font-normal text-muted-foreground cursor-pointer">
                  Lembrar meu email
                </Label>
              </div>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || lockoutSeconds > 0}
            >
              {loading ? "Carregando..." : isLogin ? "Entrar" : "Cadastrar"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <button
              type="button"
              onClick={() => setIsLogin(!isLogin)}
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              {isLogin ? "Não tem uma conta? Cadastre-se" : "Já tem uma conta? Entre"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
