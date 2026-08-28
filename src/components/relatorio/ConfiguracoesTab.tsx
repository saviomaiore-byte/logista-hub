import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Plus, X, Paperclip } from "lucide-react";
import { DIAS_SEMANA } from "./types";

interface ConfiguracoesTabProps {
  destinatarios: string[];
  novoEmail: string;
  setNovoEmail: (v: string) => void;
  assunto: string;
  setAssunto: (v: string) => void;
  corpo: string;
  setCorpo: (v: string) => void;
  diaEnvio: string;
  setDiaEnvio: (v: string) => void;
  horarioEnvio: string;
  setHorarioEnvio: (v: string) => void;
  envioAutomatico: boolean;
  setEnvioAutomatico: (v: boolean) => void;
  addDestinatario: () => void;
  removeDestinatario: (email: string) => void;
  saveConfig: () => void;
}

export function ConfiguracoesTab({
  destinatarios,
  novoEmail,
  setNovoEmail,
  assunto,
  setAssunto,
  corpo,
  setCorpo,
  diaEnvio,
  setDiaEnvio,
  horarioEnvio,
  setHorarioEnvio,
  envioAutomatico,
  setEnvioAutomatico,
  addDestinatario,
  removeDestinatario,
  saveConfig,
}: ConfiguracoesTabProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Configurações de Envio</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Attachments info */}
        <div className="border rounded-lg p-4 bg-muted/50">
          <div className="flex items-center gap-2 mb-2">
            <Paperclip className="h-4 w-4 text-muted-foreground" />
            <p className="font-medium text-sm">Anexos do E-mail</p>
          </div>
          <p className="text-xs text-muted-foreground">
            O relatório será enviado com dois anexos: um arquivo PDF e uma planilha Excel contendo todos os dados dos motoristas organizados por transportadora.
          </p>
        </div>

        {/* Destinatários */}
        <div className="space-y-3">
          <Label className="text-sm font-medium">Destinatários</Label>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="email@exemplo.com"
              value={novoEmail}
              onChange={(e) => setNovoEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addDestinatario())}
            />
            <Button variant="outline" size="icon" onClick={addDestinatario}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {destinatarios.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {destinatarios.map((email) => (
                <Badge key={email} variant="secondary" className="gap-1 pr-1">
                  {email}
                  <button onClick={() => removeDestinatario(email)} className="ml-1 hover:text-destructive">
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}
        </div>

        {/* Assunto e Corpo */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Assunto do E-mail</Label>
          <Input value={assunto} onChange={(e) => setAssunto(e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label className="text-sm font-medium">Corpo do E-mail</Label>
          <Textarea rows={4} value={corpo} onChange={(e) => setCorpo(e.target.value)} />
        </div>

        {/* Envio Automático */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-sm">Envio Automático</p>
              <p className="text-xs text-muted-foreground">
                O relatório será enviado automaticamente no dia e horário configurados
              </p>
            </div>
            <Switch checked={envioAutomatico} onCheckedChange={setEnvioAutomatico} />
          </div>

          {envioAutomatico && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm">Dia da Semana</Label>
                <Select value={diaEnvio} onValueChange={setDiaEnvio}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIAS_SEMANA.map((d) => (
                      <SelectItem key={d.value} value={d.value}>
                        {d.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm">Horário</Label>
                <Input type="time" value={horarioEnvio} onChange={(e) => setHorarioEnvio(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        <Button onClick={saveConfig} className="w-full sm:w-auto">
          Salvar Configurações
        </Button>
      </CardContent>
    </Card>
  );
}
