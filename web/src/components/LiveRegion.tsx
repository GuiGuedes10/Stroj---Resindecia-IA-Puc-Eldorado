/**
 * Região aria-live única da página: anuncia o carregamento e o resultado.
 * Invisível. Erros não passam por aqui — a própria mensagem de erro é um
 * role="alert", e anunciar duas vezes atrapalha.
 */

interface Props {
  message: string;
}

export function LiveRegion({ message }: Props) {
  return (
    <div className="sr-only" role="status" aria-live="polite" aria-atomic="true">
      {message}
    </div>
  );
}
