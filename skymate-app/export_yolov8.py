"""
Export YOLOv8s model to ONNX format for browser inference
"""
from ultralytics import YOLO

# Load YOLOv8s model
model = YOLO('yolov8s.pt')

# Export to ONNX format
# simplify=True optimizes the model for inference
# dynamic=False for fixed input size (faster)
model.export(format='onnx', simplify=True, dynamic=False, imgsz=640)

print("✅ YOLOv8s model exported to ONNX format successfully!")
print("📁 Model saved as: yolov8s.onnx")


