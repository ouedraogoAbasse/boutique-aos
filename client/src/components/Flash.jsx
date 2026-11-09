/** Alerte Bootstrap dismissible : <Flash flash={{type:'success'|'danger', text}} onClose={...} /> */
export default function Flash({ flash, onClose }) {
  if (!flash?.text) return null;
  return (
    <div className={`alert alert-${flash.type || 'info'} alert-dismissible fade show`} role="alert">
      {flash.text}
      {onClose && <button type="button" className="btn-close" aria-label="Fermer" onClick={onClose}></button>}
    </div>
  );
}
