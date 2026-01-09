interface Props {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'danger' | 'warning';
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    isOpen,
    title,
    message,
    confirmText = 'Confirmar',
    cancelText = 'Cancelar',
    variant = 'danger',
    onConfirm,
    onCancel
}: Props) {
    if (!isOpen) return null;

    const variantStyles = {
        danger: 'bg-red-600 hover:bg-red-500',
        warning: 'bg-amber-600 hover:bg-amber-500'
    };

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="p-6 border-b border-gray-800">
                    <h2 className="text-xl font-bold text-white flex items-center gap-3">
                        <span className="text-2xl">{variant === 'danger' ? '⚠️' : '❓'}</span>
                        {title}
                    </h2>
                </div>

                {/* Content */}
                <div className="p-6">
                    <p className="text-gray-300">{message}</p>
                </div>

                {/* Actions */}
                <div className="flex gap-3 p-6 border-t border-gray-800">
                    <button
                        onClick={onCancel}
                        className="flex-1 py-3 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg font-medium transition-colors"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className={`flex-1 py-3 ${variantStyles[variant]} text-white rounded-lg font-bold transition-colors`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}
