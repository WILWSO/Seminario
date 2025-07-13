import { useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle } from 'lucide-react';

interface WithdrawModalDesistirProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  courseName: string;
  isWithdrawing: boolean;
}

const WithdrawModalDesistir = ({ isOpen, onClose, onConfirm, courseName, isWithdrawing }: WithdrawModalDesistirProps) => {
  const [withdrawReason, setWithdrawReason] = useState('');

  const wordCount = withdrawReason.trim().split(' ').filter(word => word.length > 0).length;
  const minWords = 3;
  const isValidReason = wordCount >= minWords;

  const handleConfirm = () => {
    if (isValidReason) {
      onConfirm(withdrawReason);
      setWithdrawReason(''); // Reset after confirm
    }
  };

  const handleClose = () => {
    setWithdrawReason('');
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-lg max-w-md w-full p-6">
        <div className="flex items-center text-red-600 dark:text-red-400 mb-4">
          <AlertTriangle className="w-6 h-6 mr-2" />
          <h3 className="text-lg font-semibold">¿Desistir del curso? ¡Oh, no!</h3>
        </div>
        
        <p className="text-slate-600 dark:text-slate-400 mb-4">
          Estás a punto de desistir del curso <strong>{courseName}</strong>. Esta acción quedará registrada en tu historial académico.
        </p>
        
        <div className="mb-4">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
            Motivo de la desistencia
          </label>
          <textarea
            value={withdrawReason}
            onChange={(e) => setWithdrawReason(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md focus:outline-none focus:ring-2 focus:ring-sky-500 dark:bg-slate-700 dark:text-white"
            placeholder="Por favor, explica brevemente por qué desistes del curso..."
          />
          <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {wordCount < minWords
              ? `Necesitas al menos ${minWords} palabras (actual: ${wordCount})`
              : `${wordCount} palabras`
            }
          </div>
        </div>
        
        <div className="flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-md text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={isWithdrawing || !isValidReason}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition disabled:opacity-50"
          >
            {isWithdrawing ? 'Procesando...' : 'Confirmar desistencia'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default WithdrawModalDesistir;
