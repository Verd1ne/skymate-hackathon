import React from 'react';
import { useToast } from './ToastContainer';

const ToastDemo: React.FC = () => {
  const { showSuccess, showError, showWarning, showInfo } = useToast();

  return (
    <div className="fixed bottom-4 left-4 z-50 space-y-2">
      <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 space-y-2">
        <h3 className="text-white font-semibold text-sm">Toast Demo</h3>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => showSuccess("Success!", "Operation completed successfully")}
            className="px-3 py-2 bg-green-500 text-white rounded text-xs hover:bg-green-600"
          >
            Success
          </button>
          <button
            onClick={() => showError("Error!", "Something went wrong")}
            className="px-3 py-2 bg-red-500 text-white rounded text-xs hover:bg-red-600"
          >
            Error
          </button>
          <button
            onClick={() => showWarning("Warning!", "Please check your input")}
            className="px-3 py-2 bg-yellow-500 text-white rounded text-xs hover:bg-yellow-600"
          >
            Warning
          </button>
          <button
            onClick={() => showInfo("Info", "Here's some information")}
            className="px-3 py-2 bg-blue-500 text-white rounded text-xs hover:bg-blue-600"
          >
            Info
          </button>
        </div>
      </div>
    </div>
  );
};

export default ToastDemo;
