// Sem conexão e sem nada guardado para mostrar.
export default function Offline() {
  return (
    <div className="auth">
      <div className="auth-brand">
        <img className="brand-mark" src="/my-wardrobe-mark.svg" alt="" />
        <span className="brand-name">My Wardrobe</span>
      </div>

      <div className="auth-panel offline" role="alert">
        <h1>Sem conexão</h1>
        <p>Não deu para abrir seu guarda-roupa agora. Confira o Wi-Fi ou os dados do celular e tente de novo.</p>
        <button className="btn btn-primary btn-block" onClick={() => window.location.reload()}>
          Tentar de novo
        </button>
      </div>
    </div>
  )
}
