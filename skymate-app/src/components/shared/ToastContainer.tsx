/**
 * Toast Notification System
 *
 * Provides toast notifications for success, error, and warning messages
 */

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

interface Toast {
	id: string;
	type: "success" | "error" | "warning" | "info";
	title: string;
	message?: string;
	duration?: number;
}

interface ToastContextType {
	showSuccess: (title: string, message?: string, duration?: number) => void;
	showError: (title: string, message?: string, duration?: number) => void;
	showWarning: (title: string, message?: string, duration?: number) => void;
	showInfo: (title: string, message?: string, duration?: number) => void;
	removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
	const context = useContext(ToastContext);
	if (!context) {
		throw new Error("useToast must be used within a ToastProvider");
	}
	return context;
}

interface ToastProviderProps {
	children: React.ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
	const [toasts, setToasts] = useState<Toast[]>([]);

	const removeToast = useCallback((id: string) => {
		setToasts((prev) => prev.filter((toast) => toast.id !== id));
	}, []);

	const addToast = useCallback(
		(type: Toast["type"], title: string, message?: string, duration: number = 3000) => {
			const id = `${Date.now()}-${Math.random()}`;
			const newToast: Toast = { id, type, title, message, duration };

			setToasts((prev) => [...prev, newToast]);

			// Auto-remove after duration
			if (duration > 0) {
				setTimeout(() => {
					removeToast(id);
				}, duration);
			}
		},
		[removeToast]
	);

	const showSuccess = useCallback(
		(title: string, message?: string, duration?: number) => {
			addToast("success", title, message, duration);
		},
		[addToast]
	);

	const showError = useCallback(
		(title: string, message?: string, duration?: number) => {
			addToast("error", title, message, duration);
		},
		[addToast]
	);

	const showWarning = useCallback(
		(title: string, message?: string, duration?: number) => {
			addToast("warning", title, message, duration);
		},
		[addToast]
	);

	const showInfo = useCallback(
		(title: string, message?: string, duration?: number) => {
			addToast("info", title, message, duration);
		},
		[addToast]
	);

	return (
		<ToastContext.Provider
			value={{ showSuccess, showError, showWarning, showInfo, removeToast }}
		>
			{children}
			<ToastContainer toasts={toasts} onRemove={removeToast} />
		</ToastContext.Provider>
	);
}

interface ToastContainerProps {
	toasts: Toast[];
	onRemove: (id: string) => void;
}

function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
	if (toasts.length === 0) return null;

	return (
		<div className="fixed top-20 right-4 z-[9999] space-y-2 pointer-events-none">
			{toasts.map((toast) => (
				<ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
			))}
		</div>
	);
}

interface ToastItemProps {
	toast: Toast;
	onRemove: (id: string) => void;
}

function ToastItem({ toast, onRemove }: ToastItemProps) {
	const getIcon = () => {
		switch (toast.type) {
			case "success":
				return <CheckCircle className="w-5 h-5" />;
			case "error":
				return <XCircle className="w-5 h-5" />;
			case "warning":
				return <AlertTriangle className="w-5 h-5" />;
			case "info":
				return <Info className="w-5 h-5" />;
		}
	};

	const getStyles = () => {
		switch (toast.type) {
			case "success":
				return "bg-green-500 text-white";
			case "error":
				return "bg-red-500 text-white";
			case "warning":
				return "bg-yellow-500 text-white";
			case "info":
				return "bg-blue-500 text-white";
		}
	};

	return (
		<div
			className={`${getStyles()} px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[300px] max-w-[500px] pointer-events-auto animate-slide-in`}
		>
			<div className="flex-shrink-0">{getIcon()}</div>
			<div className="flex-1">
				<div className="text-sm font-bold">{toast.title}</div>
				{toast.message && (
					<div className="text-xs mt-1 opacity-90">{toast.message}</div>
				)}
			</div>
			<button
				onClick={() => onRemove(toast.id)}
				className="flex-shrink-0 hover:opacity-70 transition-opacity"
				aria-label="Close"
			>
				<X className="w-4 h-4" />
			</button>
		</div>
	);
}

export default ToastProvider;
