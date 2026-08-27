type Props = {
  total: number;
};

export function TransportadoresHeader({ total }: Props) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Transportadores</h1>
        <p className="text-muted-foreground">
          {total} transportador{total !== 1 ? "es" : ""} cadastrado{total !== 1 ? "s" : ""} • Gestão de transportadores, veículos e vínculos
        </p>
      </div>
    </div>
  );
}
