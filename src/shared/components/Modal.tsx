import type { ReactNode, MouseEvent } from "react";

type ModalProps = {
  titleId: string;
  eyebrow: string;
  title: string;
  className?: string;
  onClose: () => void;
  children: ReactNode;
};

function Modal({ titleId, eyebrow, title, className = "", onClose, children }: ModalProps) {
  function closeFromBackdrop(event: MouseEvent<HTMLDivElement>) {
    if (event.target === event.currentTarget) onClose();
  }

  return (
    <div className="modal-backdrop" onMouseDown={closeFromBackdrop}>
      <section className={`guest-modal ${className}`.trim()} role="dialog" aria-modal="true" aria-labelledby={titleId}>
        <div className="modal-heading">
          <div>
            <div className="eyebrow">{eyebrow}</div>
            <h2 id={titleId}>{title}</h2>
          </div>
          <button type="button" className="close-button" onClick={onClose} aria-label="Cerrar">×</button>
        </div>
        {children}
      </section>
    </div>
  );
}

export default Modal;
