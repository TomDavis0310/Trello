import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import Button from './Button'

// === Modal (UI) ===
// Component modal chung, dùng createPortal để render vào document.body.
// Tính năng:
//   - Overlay click hoặc phím Escape để đóng
//   - Dừng propagation khi click vào nội dung modal
//   - Props: isOpen, onClose, title, children
export default function Modal({ isOpen, onClose, title, children }) {
  useEffect(() => {
    if (!isOpen) return
    // Lắng nghe phím Escape để đóng modal
    const handler = (e) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [isOpen, onClose])

  if (!isOpen) return null

  return createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{title}</h2>
          <Button variant="ghost" onClick={onClose}>
            &times;
          </Button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>,
    document.body
  )
}
