import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Shield, Copy, Check } from "lucide-react";

interface MfaEnrollProps {
  onComplete: () => void;
  onSkip?: () => void;
}

export function MfaEnroll({ onComplete, onSkip }: MfaEnrollProps) {
  const [qrCode, setQrCode] = useState("");
  const [secret, setSecret] = useState("");
  const [factorId, setFactorId] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    enrollMfa();
  }, []);

  const enrollMfa = async () => {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: "Autenticador",
    });
    if (error) {
      toast.error("Erro ao configurar MFA: " + error.message);
      return;
    }
    if (data) {
      setQrCode(data.totp.qr_code);
      setSecret(data.totp.secret);
      setFactorId(data.id);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const challenge = await supabase.auth.mfa.challenge({ factorId });
      if (challenge.error) throw challenge.error;

      const verify = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.data.id,
        code,
      });
      if (verify.error) throw verify.error;

      toast.success("MFA ativado com sucesso!");
      onComplete();
    } catch (err: any) {
      toast.error(err.message || "Código inválido");
    } finally {
      setLoading(false);
    }
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-3">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Configurar MFA</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Escaneie o QR code com seu app autenticador (Google Authenticator, Authy, etc.)
        </p>
      </div>

      {qrCode && (
        <div className="flex flex-col items-center gap-4">
          <img src={qrCode} alt="QR Code MFA" className="w-48 h-48 rounded-lg border" />
          
          <div className="w-full">
            <Label className="text-xs text-muted-foreground">Chave manual:</Label>
            <div className="flex items-center gap-2 mt-1">
              <code className="flex-1 text-xs bg-muted p-2 rounded font-mono break-all">
                {secret}
              </code>
              <Button variant="ghost" size="sm" onClick={copySecret}>
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
        </div>
      )}

      <form onSubmit={handleVerify} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="mfaCode">Código de 6 dígitos</Label>
          <Input
            id="mfaCode"
            type="text"
            inputMode="numeric"
            pattern="[0-9]{6}"
            maxLength={6}
            placeholder="000000"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            className="text-center text-lg tracking-widest"
            required
          />
        </div>
        <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
          {loading ? "Verificando..." : "Ativar MFA"}
        </Button>
      </form>

      {onSkip && (
        <button
          type="button"
          onClick={onSkip}
          className="w-full text-sm text-muted-foreground hover:text-foreground"
        >
          Configurar depois
        </button>
      )}
    </div>
  );
}
