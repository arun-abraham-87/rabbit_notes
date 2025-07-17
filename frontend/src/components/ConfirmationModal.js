import ReactDOM from 'react-dom';
import { useEffect } from 'react';

function ConfirmationModal({ isOpen, onClose, onConfirm }) {
    // Handle Escape key to close modal
    useEffect(() => {
        if (!isOpen) return;
        
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    // Close modal when clicking outside the modal content
    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            console.log('Backdrop clicked, closing modal'); // Debugging
            onClose(); // Trigger the onClose function passed from parent
        }
    };

    return ReactDOM.createPortal(
        <div className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50" onClick={handleBackdropClick}>
            <div className="bg-white p-6 rounded shadow-lg max-w-sm w-full">
                <h2 className="text-lg font-bold mb-4">Confirm Deletion</h2>
                <p className="mb-4">Are you sure you want to delete this note? This action cannot be undone.</p>
                <div className="flex justify-end gap-4">
                    <button
                        className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400"
                        onClick={() => {
                            console.log('Cancel clicked, closing modal'); // Debugging
                            onClose(); // Trigger the onClose function to close modal
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        className="px-4 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                        onClick={() => {
                            console.log('Cancel clicked, closing modal'); // Debugging
                            onConfirm(); // Trigger the onClose function to close modal
                        }}
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>,
        document.getElementById('modal-root') // Target the modal root
    );
}

export default ConfirmationModal;
