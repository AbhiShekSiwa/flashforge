export default function ConfirmModal({ isOpen, message, confirmLabel = 'Delete', onConfirm, onCancel }) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="bg-zinc-800 border border-zinc-700 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
        <p className="text-zinc-100 text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 h-10 rounded-lg bg-zinc-700 text-zinc-300 hover:bg-zinc-600 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 h-10 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors font-medium"
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
