// Aviso flutuante acima da barra de abas. Fica sempre montado para o leitor de tela anunciar.
export default function Toast({ message }) {
  return (
    <div className="toast" role="status" aria-live="polite">
      {message && <span className="toast-msg">{message}</span>}
    </div>
  )
}
