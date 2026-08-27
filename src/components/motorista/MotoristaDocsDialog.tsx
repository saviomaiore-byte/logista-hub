import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MotoristaAnexos } from "@/components/motorista/MotoristaAnexos";
import { ContratoAnexos } from "@/components/contrato/ContratoAnexos";
import type { Motorista } from "./types";

type Props = {
  motorista: Motorista | null;
  onClose: () => void;
};

export function MotoristaDocsDialog({ motorista, onClose }: Props) {
  return (
    <Dialog open={!!motorista} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Documentos - {motorista?.nome}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="docs" className="w-full">
          <TabsList className="w-full">
            <TabsTrigger value="docs" className="flex-1">Dados</TabsTrigger>
            <TabsTrigger value="anexos" className="flex-1">Anexos</TabsTrigger>
            <TabsTrigger value="contratos" className="flex-1">Contratos</TabsTrigger>
          </TabsList>
          <TabsContent value="docs" className="mt-4 space-y-4">
            {[
              { label: "CNH", numero: motorista?.cnh_numero, vencimento: motorista?.cnh_vencimento },
              { label: "MOPP", numero: motorista?.mopp_vitalicio ? "Vitalício" : motorista?.mopp_numero, vencimento: motorista?.mopp_vitalicio ? null : motorista?.mopp_vencimento },
              { label: "ANTT", numero: motorista?.antt_numero ? "Sim" : "Não", vencimento: null },
              { label: "Alvará", numero: motorista?.alvara_numero ? "Sim" : "Não", vencimento: null },
              { label: "Certificado", numero: motorista?.certificado_numero ? "Sim" : "Não", vencimento: null },
            ].map((doc) => (
              <div key={doc.label} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-medium">{doc.label}</p>
                  <p className="text-xs text-muted-foreground">{doc.numero || "Não informado"}</p>
                </div>
                <div className="text-xs text-muted-foreground sm:text-right">
                  {doc.vencimento ? `Vence: ${new Date(doc.vencimento).toLocaleDateString("pt-BR")}` : "Sem vencimento"}
                </div>
              </div>
            ))}
          </TabsContent>
          <TabsContent value="anexos" className="mt-4">
            {motorista && <MotoristaAnexos motoristaId={motorista.id} motoristaNome={motorista.nome} />}
          </TabsContent>
          <TabsContent value="contratos" className="mt-4">
            {motorista && <ContratoAnexos motorista_id={motorista.id} nome={motorista.nome} />}
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
