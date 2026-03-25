import { useState, useEffect } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAdmin } from "@/hooks/useAdmin";
import { Navigate } from "react-router-dom";
import { Shield, ShieldCheck, ShieldOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MfaEnroll } from "@/components/auth/MfaEnroll";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function Seguranca() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [mfaEnabled, setMfaEnabled] = useState(false);
  const [showEnroll, setShowEnroll] = useState(false);
  const [showUnenroll, setShowUnenroll] = useState(false);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const checkMfaStatus = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    const verifiedTotp = data?.totp?.filter((f) => f.status === "verified") || [];
    setMfaEnabled(verifiedTotp.length > 0);
    setFactorId(verifiedTotp[0]?.id || null);
    setLoading(false);
  };

  useEffect(() => {
    checkMfaStatus();
  }, []);

  const handleUnenroll = async () => {
    if (!factorId) return;
    try {
      const { error } = await supabase.auth.mfa.unenroll({ factorId });
      if (error) throw error;
      toast.success("MFA desativado com sucesso.");
      setMfaEnabled(false);
      setFactorId(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao desativar MFA");
    }
    setShowUnenroll(false);
  };

  if (adminLoading || loading) {
    return (
      <MainLayout>
        <div className="flex items-center justify-center h-64">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </MainLayout>
    );
  }

  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6" />
            Segurança
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie as configurações de segurança da sua conta</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {mfaEnabled ? (
                <ShieldCheck className="h-5 w-5 text-green-600" />
              ) : (
                <ShieldOff className="h-5 w-5 text-muted-foreground" />
              )}
              Autenticação Multifator (MFA)
            </CardTitle>
            <CardDescription>
              Adicione uma camada extra de segurança à sua conta usando um app autenticador.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {mfaEnabled ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-green-600">Ativo</Badge>
                    <span className="text-sm text-muted-foreground">MFA está habilitado na sua conta</span>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => setShowUnenroll(true)}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Desativar
                  </Button>
                </div>
              </div>
            ) : showEnroll ? (
              <MfaEnroll
                onComplete={() => {
                  setShowEnroll(false);
                  checkMfaStatus();
                }}
                onSkip={() => setShowEnroll(false)}
              />
            ) : (
              <Button onClick={() => setShowEnroll(true)}>
                <Shield className="h-4 w-4 mr-2" />
                Configurar MFA
              </Button>
            )}
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showUnenroll} onOpenChange={setShowUnenroll}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Desativar MFA?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso removerá a autenticação multifator da sua conta. Sua conta ficará menos segura.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleUnenroll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Desativar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
