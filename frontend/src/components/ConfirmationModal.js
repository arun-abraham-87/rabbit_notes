import ReactDOM from 'react-dom';
import { useEffect, useState } from 'react';

function ConfirmationModal({ isOpen, onClose, onConfirm }) {
    const [isLoading, setIsLoading] = useState(false);

    console.log('[ConfirmationModal] Rendering - isOpen:', isOpen, 'onConfirm type:', typeof onConfirm);

    // Handle Escape key to close modal
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape' && !isLoading) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose, isLoading]);

    if (!isOpen) return null;

    // Close modal when clicking outside the modal content
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget && !isLoading) {
            onClose(); // Trigger the onClose function passed from parent
        }
    };

    // Handle delete confirmation with proper async handling
    const handleConfirm = async () => {
        console.log('[ConfirmationModal] Delete button clicked');
        setIsLoading(true);
        try {
            console.log('[ConfirmationModal] Calling onConfirm...');
            await onConfirm();
            console.log('[ConfirmationModal] onConfirm completed');
        } catch (error) {
            console.error('[ConfirmationModal] Error in onConfirm:', error);
            alert('Error: ' + error.message);
        } finally {
            setIsLoading(false);
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50" onClick={handleBackdropClick}>
            <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full">
                <h2 className="text-lg font-bold mb-4">Confirm Deletion</h2>
                <p className="mb-4">Are you sure you want to delete this note? This action cannot be undone.</p>
                <div className="flex justify-end gap-4">
                    <button
                        className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={onClose}
                        disabled={isLoading}
                    >
                        Cancel
                    </button>
                    <button
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        onClick={(e) => {
                            console.log('[ConfirmationModal] Button onClick fired');
                            e.stopPropagation();
                            handleConfirm();
                        }}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Deleting...' : 'Delete'}
                    </button>
                </div>
            </div>
        </div>,
        document.getElementById('modal-root') // Target the modal root
    );
}

export default ConfirmationModal;
