import { useState, useEffect } from "react";
import {
  Package,
  CheckCircle,
  AlertTriangle,
  TruckIcon,
  Edit3,
  Undo2,
  X,
  Database,
} from "lucide-react";
import { useInventory } from "../../hooks/useInventory";
import type { InventoryItem } from "../../hooks/useInventory";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "../shared/ToastContainer";
import { migrateInventoryGalleys } from "../../utils/migrateInventoryGalleys";

interface UndoAction {
  itemName: string;
  previousQuantity: number;
  timestamp: number;
}

function InventoryPanelFirebase() {
  const { showError, showSuccess } = useToast();
  const {
    mainInventory,
    loading,
    error,
    initializeInventory,
    updateInventoryQuantity,
  } = useInventory();

  const [showRequestStock, setShowRequestStock] = useState(false);
  const [showUpdateCounts, setShowUpdateCounts] = useState(false);
  const [undoAction, setUndoAction] = useState<UndoAction | null>(null);
  const [showUndoNotification, setShowUndoNotification] = useState(false);
  const [highlightedItem, setHighlightedItem] = useState<string | null>(null);
  const [isMigrating, setIsMigrating] = useState(false);

  // Helper function to get galley name
  const getGalleyName = (galley: number): string => {
    const galleyNames: Record<number, string> = {
      1: "Beverages",
      2: "Food",
      3: "Towels & Amenities",
    };
    return galleyNames[galley] || `Galley ${galley}`;
  };

  // Handle galley migration
  const handleMigration = async () => {
    setIsMigrating(true);
    try {
      const result = await migrateInventoryGalleys();
      showSuccess(
        `Migration complete! Updated ${result?.updatedCount || 0} items.`
      );
    } catch (error: any) {
      showError(`Migration failed: ${error.message}`);
    } finally {
      setIsMigrating(false);
    }
  };

  // Group items by galley
  const itemsByGalley = mainInventory.reduce((acc, item) => {
    const galley = item.galley || 2; // Default to Food galley
    if (!acc[galley]) acc[galley] = [];
    acc[galley].push(item);
    return acc;
  }, {} as Record<number, typeof mainInventory>);

  // Auto-initialize inventory if empty
  useEffect(() => {
    if (!loading && !error && mainInventory.length === 0) {
      console.log("📦 Auto-initializing inventory...");
      initializeInventory().catch((err) => {
        console.error("Failed to auto-initialize:", err);
      });
    }
  }, [loading, error, mainInventory.length]);

  const getStatus = (item: InventoryItem) => {
    if (item.quantity <= item.threshold) {
      return {
        color: "bg-red-100 border-red-500 text-red-900",
        icon: <AlertTriangle size={16} className="text-red-600" />,
        badge: "Critical",
      };
    } else if (item.quantity <= item.threshold * 1.5) {
      return {
        color: "bg-orange-100 border-orange-500 text-orange-900",
        icon: <AlertTriangle size={16} className="text-orange-600" />,
        badge: "Low",
      };
    }
    return {
      color: "bg-green-100 border-green-500 text-green-900",
      icon: <CheckCircle size={16} className="text-green-600" />,
      badge: "OK",
    };
  };

  const handleUndo = async () => {
    if (!undoAction) return;

    try {
      const item = mainInventory.find((i) => i.name === undoAction.itemName);
      if (item) {
        await updateInventoryQuantity(item.id, undoAction.previousQuantity);
        setHighlightedItem(undoAction.itemName);
        setTimeout(() => setHighlightedItem(null), 2000);
      }

      setUndoAction(null);
      setShowUndoNotification(false);
    } catch (error: any) {
      showError("Undo Failed");
    }
  };

  if (loading && mainInventory.length === 0) {
    return (
      <div className="p-6 text-center bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 min-h-full">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
        <p className="mt-2 text-white">Loading inventory...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900 min-h-full">
        <AlertTriangle size={48} className="text-red-300 mx-auto mb-4" />
        <p className="text-red-200 mb-4">{error}</p>
        <p className="text-sm text-white/80">
          Make sure Firebase is configured in your .env file
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="h-full flex flex-col bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900">
        {/* Header with Quick Actions */}
        <div className="p-6 bg-white/10 backdrop-blur-lg border-b border-white/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Package className="text-white" size={24} />
              <h2 className="text-xl font-semibold text-white">
                Inventory Management
              </h2>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-col gap-2">
            <div className="flex gap-2">
              <button
                onClick={() => setShowRequestStock(true)}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition flex items-center justify-center gap-2 font-medium"
              >
                <TruckIcon size={18} />
                Request Stock
              </button>
              <button
                onClick={() => setShowUpdateCounts(true)}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition flex items-center justify-center gap-2 font-medium"
              >
                <Edit3 size={18} />
                Update Counts
              </button>
            </div>

            {/* Migration Button (show if items missing galley field) */}
            {mainInventory.some(
              (item) => item.galley === undefined || item.galley === null
            ) && (
              <button
                onClick={handleMigration}
                disabled={isMigrating}
                className="w-full px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition flex items-center justify-center gap-2 text-sm font-medium disabled:bg-gray-500 disabled:cursor-not-allowed"
              >
                <Database size={16} />
                {isMigrating
                  ? "Adding galley numbers..."
                  : "🔄 Add Galley Numbers to Items"}
              </button>
            )}
          </div>
        </div>

        {/* Single Column Layout */}
        <div className="flex-1 overflow-hidden p-6">
          {/* CURRENT INVENTORY COLUMN - Grouped by Galley */}
          <div className="flex flex-col bg-emerald-800/50 backdrop-blur-lg rounded-xl shadow-sm border border-white/20 overflow-hidden h-full">
            <div className="p-4 bg-gradient-to-r from-emerald-700 to-teal-700 text-white">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <Package size={20} />
                Current Inventory
              </h3>
              <p className="text-xs text-emerald-100 mt-1">
                {mainInventory.length} items total
              </p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {mainInventory.length === 0 ? (
                <div className="text-center py-12">
                  <Package size={48} className="text-white/50 mx-auto mb-4" />
                  <p className="text-white/70">Initializing inventory...</p>
                </div>
              ) : (
                // Render items grouped by galley
                [1, 2, 3].map((galleyNum) => {
                  const items = itemsByGalley[galleyNum] || [];
                  if (items.length === 0) return null;

                  const galleyColors = {
                    1: "from-blue-600/80 to-blue-700/80", // Beverages
                    2: "from-orange-600/80 to-orange-700/80", // Food
                    3: "from-purple-600/80 to-purple-700/80", // Towels
                  };

                  return (
                    <div key={galleyNum} className="space-y-2">
                      {/* Galley Section Header */}
                      <div
                        className={`bg-gradient-to-r ${
                          galleyColors[galleyNum as keyof typeof galleyColors]
                        } rounded-lg px-3 py-2`}
                      >
                        <h4 className="text-white font-semibold text-sm">
                          {getGalleyName(galleyNum)}
                        </h4>
                        <p className="text-white/80 text-xs">
                          {items.length} items
                        </p>
                      </div>

                      {/* Items in this galley */}
                      {items.map((item) => {
                        const status = getStatus(item);
                        const isHighlighted = highlightedItem === item.name;

                        return (
                          <motion.div
                            key={item.id}
                            layout
                            animate={
                              isHighlighted
                                ? {
                                    scale: [1, 1.05, 1],
                                    boxShadow: [
                                      "0 0 0 0 rgba(59, 130, 246, 0)",
                                      "0 0 0 10px rgba(59, 130, 246, 0.3)",
                                      "0 0 0 0 rgba(59, 130, 246, 0)",
                                    ],
                                  }
                                : {}
                            }
                            transition={{ duration: 0.5 }}
                            className={`border-2 rounded-lg p-3 transition-all ${
                              isHighlighted
                                ? "border-blue-500 bg-blue-500/20 shadow-md text-white"
                                : `bg-white/10 border-white/30 text-white hover:bg-white/20 hover:shadow-md`
                            }`}
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <h4 className="font-semibold text-white text-sm">
                                  {item.name}
                                </h4>
                                <p className="text-xs text-white/80">
                                  {item.quantity} {item.unit}
                                </p>
                              </div>
                              <div className="flex items-center gap-2">
                                {status.icon}
                                <span className="text-xs font-medium px-2 py-1 rounded bg-white/20 text-white">
                                  {status.badge}
                                </span>
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Undo Notification */}
      <AnimatePresence>
        {showUndoNotification && undoAction && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-4 rounded-lg shadow-2xl flex items-center gap-4 z-50"
          >
            <div className="flex-1">
              <p className="font-semibold">Item deducted</p>
              <p className="text-sm text-gray-300">{undoAction.itemName}</p>
            </div>
            <button
              onClick={handleUndo}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg flex items-center gap-2 font-medium transition"
            >
              <Undo2 size={16} />
              Undo
            </button>
            <button
              onClick={() => {
                setShowUndoNotification(false);
                setUndoAction(null);
              }}
              className="p-2 hover:bg-white/10 rounded-lg transition"
            >
              <X size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Request Stock Modal */}
      <AnimatePresence>
        {showRequestStock && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowRequestStock(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-md w-full shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <TruckIcon size={24} className="text-green-600" />
                  Request Stock
                </h3>
                <button
                  onClick={() => setShowRequestStock(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-gray-600 mb-4">
                Request restocking for low or critical items. This feature will
                notify the supply chain team.
              </p>
              <div className="space-y-2 mb-4">
                {mainInventory
                  .filter((item) => item.quantity <= item.threshold * 1.5)
                  .map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                    >
                      <div>
                        <p className="font-medium text-gray-800">{item.name}</p>
                        <p className="text-sm text-gray-600">
                          {item.quantity} {item.unit} remaining
                        </p>
                      </div>
                      <button className="px-3 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition">
                        Request
                      </button>
                    </div>
                  ))}
                {mainInventory.filter(
                  (item) => item.quantity <= item.threshold * 1.5
                ).length === 0 && (
                  <p className="text-center text-gray-500 py-4">
                    All items are well stocked!
                  </p>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Update Counts Modal */}
      <AnimatePresence>
        {showUpdateCounts && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={() => setShowUpdateCounts(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-semibold text-gray-800 flex items-center gap-2">
                  <Edit3 size={24} className="text-purple-600" />
                  Update Inventory Counts
                </h3>
                <button
                  onClick={() => setShowUpdateCounts(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition"
                >
                  <X size={20} />
                </button>
              </div>
              <p className="text-gray-600 mb-4">
                Manually adjust inventory quantities after physical counts or
                restocking.
              </p>
              <div className="space-y-3">
                {mainInventory.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{item.name}</p>
                      <p className="text-sm text-gray-600">
                        Current: {item.quantity} {item.unit}
                      </p>
                    </div>
                    <input
                      type="number"
                      min="0"
                      defaultValue={item.quantity}
                      className="w-24 px-3 py-2 border border-gray-300 rounded-lg text-center"
                      onBlur={(e) => {
                        const newQty = parseInt(e.target.value) || 0;
                        if (newQty !== item.quantity) {
                          updateInventoryQuantity(item.id, newQty);
                        }
                      }}
                    />
                    <span className="text-sm text-gray-600 w-16">
                      {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default InventoryPanelFirebase;
